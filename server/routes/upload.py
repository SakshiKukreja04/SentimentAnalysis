import io
import logging
import os
from typing import List
from bson import ObjectId

import base64
from datetime import datetime, timezone
import pandas as pd
from flask import Blueprint, jsonify, request

from services.db import get_collection, get_database
from gridfs import GridFS
import re
from statistics import mean

import nltk
from nltk.sentiment import SentimentIntensityAnalyzer
import spacy
from services.ml_pipeline import build_feature_sets, train_hybrid


logger = logging.getLogger(__name__)
upload_bp = Blueprint("upload", __name__)

# Lazy globals for NLP resources to avoid repeated downloads
_SPACY_NLP = None
_VADER = None

def _ensure_nlp_initialized():
    global _SPACY_NLP, _VADER
    if _SPACY_NLP is None:
        try:
            _SPACY_NLP = spacy.load("en_core_web_sm")
        except Exception:
            # Attempt runtime download if missing
            from spacy.cli import download as spacy_download
            spacy_download("en_core_web_sm")
            _SPACY_NLP = spacy.load("en_core_web_sm")
    if _VADER is None:
        try:
            _VADER = SentimentIntensityAnalyzer()
        except Exception:
            nltk.download('vader_lexicon')
            _VADER = SentimentIntensityAnalyzer()


@upload_bp.route("/upload-file", methods=["POST"])
def upload_file():
	"""Upload a CSV or Excel file, parse it with pandas, and store rows in MongoDB."""
	if "file" not in request.files:
		return jsonify({"status": "error", "message": "No file part"}), 400
	file = request.files["file"]
	filename = file.filename or "uploaded_file"
	content = file.read()

	if not content:
		return jsonify({"status": "error", "message": "Empty file uploaded."}), 400

	# Determine file type by extension (prefer extension over browser MIME).
	content_type = (getattr(file, "content_type", None) or "application/octet-stream")
	# Some browsers send 'application/vnd.ms-excel' for CSV which caused false Excel detection.
	lower_name = filename.lower()
	# Strict by extension
	is_csv = lower_name.endswith(".csv")
	is_excel = lower_name.endswith(".xlsx") or lower_name.endswith(".xls")

	# Build single-document storage as requested: metadata + base64 file content
	# Note: We still attempt to read via pandas when possible to validate the file,
	# but we store the raw content per new structure.
	try:
		if is_csv:
			# CSV by extension should always use read_csv
			pd.read_csv(io.BytesIO(content), nrows=1)
		else:
			# Try Excel first; if it fails, try CSV as fallback
			try:
				pd.read_excel(io.BytesIO(content), engine="openpyxl", nrows=1)
			except Exception:
				pd.read_csv(io.BytesIO(content), nrows=1)
	except Exception as exc:
		logger.exception("Failed parsing file %s for validation: %s", filename, exc)
		return jsonify({"status": "error", "message": "Invalid or unsupported file format."}), 400

	# Allow overriding collection name from env; default to 'upload' to match UI
	collection_name = os.getenv("COLLECTION_NAME", "upload")
	# Ensure collection exists (Mongo would auto-create on first insert, but we create explicitly)
	db = get_database()
	if collection_name not in db.list_collection_names():
		try:
			db.create_collection(collection_name)
		except Exception:
			# If created concurrently by another request, ignore
			pass
		try:
			db[collection_name].create_index("uploaded_at")
		except Exception:
			pass
	collection = db[collection_name]

	# Log target DB and collection for traceability
	try:
		db_name = get_database().name
	except Exception:  # pragma: no cover
		db_name = "<unknown>"

	file_size = len(content)
	logger.info("Received file '%s' size=%d bytes; target=%s.%s", filename, file_size, db_name, collection_name)

	# MongoDB BSON document limit is 16MB; use GridFS if larger
	BSON_LIMIT = 16 * 1024 * 1024
	storage_mode = "document"
	gridfs_id = None

	if file_size > BSON_LIMIT:
		logger.info("File exceeds BSON limit; storing in GridFS")
		fs = GridFS(db)
		try:
			gridfs_id = fs.put(content, filename=filename, contentType=content_type)
		except Exception as exc:
			logger.exception("GridFS put failed: %s", exc)
			return jsonify({"status": "error", "message": "Failed to store file in GridFS."}), 500
		storage_mode = "gridfs"
		b64_content = None
	else:
		b64_content = base64.b64encode(content).decode("utf-8")

	document = {
		"file_name": filename,
		"uploaded_at": datetime.now(timezone.utc),
		"file_data": b64_content,
	}
	if gridfs_id is not None:
		document["gridfs_id"] = gridfs_id

	try:
		result = collection.insert_one(document)
		inserted_id = str(result.inserted_id)
	except Exception as exc:
		logger.exception("Mongo insert_one failed for %s.%s: %s", db_name, collection_name, exc)
		return jsonify({"status": "error", "message": "Failed to store file metadata in MongoDB."}), 500

	logger.info("File '%s' stored via %s. Inserted ID: %s", filename, storage_mode, inserted_id)

	return jsonify({
		"status": "success",
		"inserted_id": inserted_id,
		"collection": collection_name,
		"storage_mode": storage_mode,
		"message": "File uploaded successfully",
	})



@upload_bp.route("/get_fields/<file_id>", methods=["GET"])
def get_file_fields(file_id: str):
    """Return selected columns (comment, timestamp, category, file_id) as JSON rows.

    Column detection is case-insensitive and supports common aliases.
    """
    collection_name = os.getenv("COLLECTION_NAME", "upload")
    db = get_database()
    collection = db[collection_name]

    # Validate ObjectId
    try:
        doc_id = ObjectId(file_id)
    except Exception:
        return jsonify({"status": "error", "message": "Invalid file id."}), 400

    # Load document
    doc = collection.find_one({"_id": doc_id})
    if not doc:
        return jsonify({"status": "error", "message": "File metadata not found."}), 404

    filename = doc.get("file_name", "downloaded_file")
    gridfs_id = doc.get("gridfs_id")

    # Retrieve raw bytes
    try:
        if gridfs_id is not None:
            fs = GridFS(db)
            gf_id = gridfs_id if isinstance(gridfs_id, ObjectId) else ObjectId(str(gridfs_id))
            raw_bytes = fs.get(gf_id).read()
        else:
            b64_data = doc.get("file_data")
            if not b64_data:
                return jsonify({"status": "error", "message": "No file data found in document."}), 500
            raw_bytes = base64.b64decode(b64_data)
    except Exception as exc:
        logger.exception("Storage read failed for '%s': %s", filename, exc)
        return jsonify({"status": "error", "message": "Failed to read file from storage."}), 500

    # Parse via pandas
    lower_name = (filename or "").lower()
    is_csv = lower_name.endswith(".csv")
    is_excel = lower_name.endswith(".xlsx") or lower_name.endswith(".xls")
    try:
        if is_csv and not is_excel:
            df = pd.read_csv(io.BytesIO(raw_bytes))
        else:
            try:
                df = pd.read_excel(io.BytesIO(raw_bytes), engine="openpyxl")
            except Exception:
                df = pd.read_csv(io.BytesIO(raw_bytes))
    except Exception as exc:
        logger.exception("Failed parsing file '%s': %s", filename, exc)
        return jsonify({"status": "error", "message": "Invalid or unsupported file format."}), 400

    # Detect columns (case-insensitive) with content heuristics
    alias_candidates = {
        "comment": ["comment", "comments", "comment_text", "review", "feedback", "remark", "remarks", "body", "content", "text"],
        "timestamp": ["timestamp", "time", "datetime", "date", "created_at", "posted_at"],
        "category": ["category", "label", "tag", "class", "topic", "type"],
        "comment_id": ["comment_id", "id", "commentid", "review_id", "row_id", "index"]
    }

    # Build list of possible matches for each target
    lower_to_orig = {str(c).strip().lower(): c for c in df.columns}
    def possible_columns(target: str):
        names = alias_candidates[target]
        # exact
        exact = [lower_to_orig[n] for n in names if n in lower_to_orig]
        # contains
        contains = [orig for low, orig in lower_to_orig.items() if any(n in low for n in names)]
        # deduplicate while preserving order
        seen = set()
        ordered = []
        for col in exact + contains:
            if col not in seen:
                seen.add(col)
                ordered.append(col)
        return ordered

    # Heuristics
    def score_comment(col_name: str) -> float:
        s = df[col_name]
        non_null = s.dropna()
        if non_null.empty:
            return -1.0
        # Prefer object dtype and longer average string length
        sample = non_null.astype(str).head(200)
        avg_len = sample.map(len).mean() if not sample.empty else 0.0
        is_object = float(s.dtype == object)
        # Penalize if values look numeric indices
        numeric_ratio = float(pd.to_numeric(sample, errors="coerce").notna().mean())
        return (2.0 * is_object) + avg_len - (3.0 * numeric_ratio)

    def score_timestamp(col_name: str) -> float:
        s = df[col_name].astype(str)
        parsed = pd.to_datetime(s, errors="coerce", utc=True)
        ratio = parsed.notna().mean()
        return ratio

    def score_category(col_name: str) -> float:
        s = df[col_name]
        non_null = s.dropna().astype(str)
        if non_null.empty:
            return -1.0
        n = len(non_null)
        unique_ratio = non_null.nunique() / max(n, 1)
        # Prefer low-cardinality string columns
        is_object = float(s.dtype == object)
        return (2.0 * is_object) + (1.0 - unique_ratio)

    def pick_best(target: str):
        candidates = possible_columns(target)
        if not candidates:
            return None
        if target == "comment":
            scored = sorted(((score_comment(c), c) for c in candidates), reverse=True)
        elif target == "timestamp":
            scored = sorted(((score_timestamp(c), c) for c in candidates), reverse=True)
        elif target == "category":
            scored = sorted(((score_category(c), c) for c in candidates), reverse=True)
        else:  # comment_id
            def score_id(col_name: str) -> float:
                s = df[col_name].dropna().astype(str).head(500)
                if s.empty:
                    return -1.0
                # Prefer numeric-like, unique-ish
                numeric_ratio = pd.to_numeric(s, errors="coerce").notna().mean()
                unique_ratio = s.nunique() / max(len(s), 1)
                return (2.0 * numeric_ratio) + (1.0 * unique_ratio)
            scored = sorted(((score_id(c), c) for c in candidates), reverse=True)
        best_score, best_col = scored[0]
        # Thresholds: ensure reasonable quality
        if target == "timestamp" and best_score < 0.5:
            return None
        return best_col

    selected = {
        "comment": pick_best("comment"),
        "timestamp": pick_best("timestamp"),
        "category": pick_best("category"),
        "comment_id": pick_best("comment_id"),
    }

    missing = [k for k, v in selected.items() if v is None]
    subset_cols = [v for v in selected.values() if v is not None]
    df_subset = df[subset_cols] if subset_cols else df.iloc[0:0]

    # Normalize None for JSON and rename to canonical keys
    df_subset = df_subset.where(pd.notnull(df_subset), None)
    rename_map = {v: k for k, v in selected.items() if v is not None}
    df_subset = df_subset.rename(columns=rename_map)

    # If comment_id was not found, synthesize a 1-based index
    if "comment_id" not in df_subset.columns:
        df_subset.insert(0, "comment_id", list(range(1, len(df_subset) + 1)))
        if "comment_id" not in missing:
            missing.append("comment_id")

    records = df_subset.to_dict(orient="records")
    # Inject file_id into each row
    for row in records:
        row["file_id"] = file_id

    return jsonify({
        "status": "success",
        "file_id": file_id,
        "file_name": filename,
        "selected_columns": [c for c in ["comment_id", "comment", "timestamp", "category"] if c in df_subset.columns],
        "missing_columns": missing,
        "rows": records,
        "row_count": len(records),
    })


@upload_bp.route("/get_file/<file_id>", methods=["GET"])
def get_file(file_id: str):
    """Fetch a stored file by document ObjectId, load into pandas, and return JSON rows.

    This endpoint supports files stored either:
    - In GridFS (document has `gridfs_id`), or
    - Embedded Base64 in `file_data` field (for small files)
    """
    # Resolve collection name
    collection_name = os.getenv("COLLECTION_NAME", "upload")
    db = get_database()
    collection = db[collection_name]

    # Validate ObjectId
    try:
        doc_id = ObjectId(file_id)
    except Exception:
        return jsonify({"status": "error", "message": "Invalid file id."}), 400

    # Find document
    doc = collection.find_one({"_id": doc_id})
    if not doc:
        return jsonify({"status": "error", "message": "File metadata not found."}), 404

    filename = doc.get("file_name", "downloaded_file")
    gridfs_id = doc.get("gridfs_id")
    raw_bytes: bytes

    # Fetch bytes either from GridFS or from embedded Base64
    if gridfs_id is not None:
        try:
            fs = GridFS(db)
            # gridfs_id persisted as ObjectId; coerce if stored as str
            gf_id = gridfs_id if isinstance(gridfs_id, ObjectId) else ObjectId(str(gridfs_id))
            gridout = fs.get(gf_id)
            raw_bytes = gridout.read()
        except Exception as exc:
            logger.exception("Failed reading from GridFS for id=%s: %s", gridfs_id, exc)
            return jsonify({"status": "error", "message": "Failed to read file from storage."}), 500
    else:
        b64_data = doc.get("file_data")
        if not b64_data:
            return jsonify({"status": "error", "message": "No file data found in document."}), 500
        try:
            raw_bytes = base64.b64decode(b64_data)
        except Exception:
            return jsonify({"status": "error", "message": "Corrupted file data."}), 500

    # Attempt to parse with pandas
    lower_name = (filename or "").lower()
    is_csv = lower_name.endswith(".csv")
    is_excel = lower_name.endswith(".xlsx") or lower_name.endswith(".xls")

    try:
        if is_csv and not is_excel:
            df = pd.read_csv(io.BytesIO(raw_bytes))
        else:
            # Try Excel first; fallback to CSV if Excel fails
            try:
                df = pd.read_excel(io.BytesIO(raw_bytes), engine="openpyxl")
            except Exception:
                df = pd.read_csv(io.BytesIO(raw_bytes))
    except Exception as exc:
        logger.exception("Failed parsing file '%s': %s", filename, exc)
        return jsonify({"status": "error", "message": "Invalid or unsupported file format."}), 400

    # Normalize: replace NaN with None for JSON
    try:
        records = df.where(pd.notnull(df), None).to_dict(orient="records")
        columns = list(df.columns.astype(str))
    except Exception as exc:
        logger.exception("Failed converting DataFrame to JSON for '%s': %s", filename, exc)
        return jsonify({"status": "error", "message": "Failed to convert data to JSON."}), 500

    return jsonify({
        "status": "success",
        "file_id": file_id,
        "file_name": filename,
        "columns": columns,
        "rows": records,
        "row_count": len(records),
    })


@upload_bp.route("/process_sentiment/<file_id>", methods=["POST", "GET"])
def process_sentiment(file_id: str):
    """Preprocess comments, run VADER sentiment, save results, and return JSON.

    Steps:
    - Load file by id (GridFS or embedded base64)
    - Select comment column using existing heuristics from get_file_fields
    - Preprocess: lowercase, remove special chars/numbers, extra spaces; tokenize (spaCy); lemmatize; remove stopwords
    - Score with VADER; map compound -> 1..5 scale
    - Save to collection 'processed_files' with reference to original file id
    - Return per-row results and overall average
    """
    # Initialize NLP
    _ensure_nlp_initialized()

    collection_name = os.getenv("COLLECTION_NAME", "upload")
    db = get_database()
    collection = db[collection_name]

    # Validate ObjectId
    try:
        doc_id = ObjectId(file_id)
    except Exception:
        return jsonify({"status": "error", "message": "Invalid file id."}), 400

    # Load metadata
    doc = collection.find_one({"_id": doc_id})
    if not doc:
        return jsonify({"status": "error", "message": "File metadata not found."}), 404

    filename = doc.get("file_name", "downloaded_file")
    gridfs_id = doc.get("gridfs_id")

    # Retrieve raw bytes
    try:
        if gridfs_id is not None:
            fs = GridFS(db)
            gf_id = gridfs_id if isinstance(gridfs_id, ObjectId) else ObjectId(str(gridfs_id))
            raw_bytes = fs.get(gf_id).read()
        else:
            b64_data = doc.get("file_data")
            if not b64_data:
                return jsonify({"status": "error", "message": "No file data found in document."}), 500
            raw_bytes = base64.b64decode(b64_data)
    except Exception as exc:
        logger.exception("Storage read failed for '%s': %s", filename, exc)
        return jsonify({"status": "error", "message": "Failed to read file from storage."}), 500

    # Parse via pandas
    lower_name = (filename or "").lower()
    is_csv = lower_name.endswith(".csv")
    is_excel = lower_name.endswith(".xlsx") or lower_name.endswith(".xls")
    try:
        if is_csv and not is_excel:
            df = pd.read_csv(io.BytesIO(raw_bytes))
        else:
            try:
                df = pd.read_excel(io.BytesIO(raw_bytes), engine="openpyxl")
            except Exception:
                df = pd.read_csv(io.BytesIO(raw_bytes))
    except Exception as exc:
        logger.exception("Failed parsing file '%s': %s", filename, exc)
        return jsonify({"status": "error", "message": "Invalid or unsupported file format."}), 400

    # Detect key columns similarly to /get_fields
    alias_candidates = {
        "comment": ["comment", "comments", "comment_text", "review", "feedback", "remark", "remarks", "body", "content", "text"],
        "timestamp": ["timestamp", "time", "datetime", "date", "created_at", "posted_at"],
        "category": ["category", "label", "tag", "class", "topic", "type"],
        "comment_id": ["comment_id", "id", "commentid", "review_id", "row_id", "index"],
    }
    lower_to_orig = {str(c).strip().lower(): c for c in df.columns}
    def possible_columns(target: str):
        names = alias_candidates[target]
        exact = [lower_to_orig[n] for n in names if n in lower_to_orig]
        contains = [orig for low, orig in lower_to_orig.items() if any(n in low for n in names)]
        seen = set(); ordered = []
        for col in exact + contains:
            if col not in seen:
                seen.add(col); ordered.append(col)
        return ordered
    def score_comment(col_name: str) -> float:
        s = df[col_name]
        non_null = s.dropna()
        if non_null.empty:
            return -1.0
        sample = non_null.astype(str).head(200)
        avg_len = sample.map(len).mean() if not sample.empty else 0.0
        is_object = float(s.dtype == object)
        numeric_ratio = float(pd.to_numeric(sample, errors="coerce").notna().mean())
        return (2.0 * is_object) + avg_len - (3.0 * numeric_ratio)
    def score_timestamp(col_name: str) -> float:
        s = df[col_name].astype(str)
        parsed = pd.to_datetime(s, errors="coerce", utc=True)
        return parsed.notna().mean()
    def score_category(col_name: str) -> float:
        s = df[col_name]
        non_null = s.dropna().astype(str)
        if non_null.empty:
            return -1.0
        n = len(non_null)
        unique_ratio = non_null.nunique() / max(n, 1)
        is_object = float(s.dtype == object)
        return (2.0 * is_object) + (1.0 - unique_ratio)
    def score_id(col_name: str) -> float:
        s = df[col_name].dropna().astype(str).head(500)
        if s.empty:
            return -1.0
        numeric_ratio = pd.to_numeric(s, errors="coerce").notna().mean()
        unique_ratio = s.nunique() / max(len(s), 1)
        return (2.0 * numeric_ratio) + (1.0 * unique_ratio)
    def pick_best(target: str):
        candidates = possible_columns(target)
        if not candidates:
            return None
        if target == "comment":
            scored = sorted(((score_comment(c), c) for c in candidates), reverse=True)
        elif target == "timestamp":
            scored = sorted(((score_timestamp(c), c) for c in candidates), reverse=True)
        elif target == "category":
            scored = sorted(((score_category(c), c) for c in candidates), reverse=True)
        else:
            scored = sorted(((score_id(c), c) for c in candidates), reverse=True)
        best_score, best_col = scored[0]
        if target == "timestamp" and best_score < 0.5:
            return None
        return best_col
    comment_col = pick_best("comment")
    category_col = pick_best("category")
    timestamp_col = pick_best("timestamp")
    comment_id_col = pick_best("comment_id")
    if comment_col is None:
        return jsonify({"status": "error", "message": "Could not infer comment column."}), 400

    # Preprocess helpers
    nlp = _SPACY_NLP
    vader = _VADER
    stopwords = nlp.Defaults.stop_words
    whitespace_re = re.compile(r"\s+")
    nonalpha_re = re.compile(r"[^a-zA-Z\s]")

    def preprocess_text(text: str) -> str:
        if text is None:
            return ""
        s = str(text).lower()
        s = nonalpha_re.sub(" ", s)
        s = whitespace_re.sub(" ", s).strip()
        if not s:
            return ""
        doc_spacy = nlp(s)
        lemmas = [t.lemma_ for t in doc_spacy if (not t.is_space and t.lemma_ and t.lemma_.lower() not in stopwords)]
        return " ".join(lemmas)

    # Process rows
    processed_rows = []
    for _, row in df.iterrows():
        original = row.get(comment_col)
        cleaned = preprocess_text(original)
        # Sentiment via VADER
        scores = vader.polarity_scores(cleaned or (str(original) if original is not None else ""))
        compound = scores.get("compound", 0.0)
        if compound >= 0.6:
            label = "Strong Positive"; mapped = 5
        elif compound >= 0.2:
            label = "Supportive"; mapped = 4
        elif compound >= -0.2:
            label = "Neutral"; mapped = 3
        elif compound >= -0.6:
            label = "Critical"; mapped = 2
        else:
            label = "Strong Negative"; mapped = 1
        row_out = {
            "comment": str(original) if original is not None else "",
            "sentiment": label,
            "score": mapped,
        }
        # Attach optional metadata fields if available
        if category_col is not None:
            row_out["category"] = row.get(category_col)
        if timestamp_col is not None:
            row_out["timestamp"] = row.get(timestamp_col)
        if comment_id_col is not None:
            row_out["comment_id"] = row.get(comment_id_col)
        else:
            # fallback to sequential id (1-based)
            row_out["comment_id"] = len(processed_rows) + 1
        row_out["file_id"] = file_id
        processed_rows.append(row_out)

    overall = mean([r["score"] for r in processed_rows]) if processed_rows else 0.0

    # Save to processed_files
    out_doc = {
        "source_file_id": doc_id,
        "file_name": filename,
        "processed_at": datetime.now(timezone.utc),
        "overall_score": overall,
        "results": processed_rows,
    }
    processed_collection = db.get_collection("processed_files")
    try:
        ins = processed_collection.insert_one(out_doc)
        processed_id = str(ins.inserted_id)
    except Exception as exc:
        logger.exception("Failed to insert processed results: %s", exc)
        return jsonify({"status": "error", "message": "Failed to save processed results."}), 500

    return jsonify({
        "status": "success",
        "file_id": file_id,
        "file_name": filename,
        "processed_id": processed_id,
        "overall_score": overall,
        "results": processed_rows,
    })


@upload_bp.route("/ml/preprocess", methods=["POST"])  # body: { data_dir, gold_dir }
def ml_preprocess():
    body = request.get_json(silent=True) or {}
    data_dir = body.get("data_dir", "data")
    gold_dir = body.get("gold_dir", "gold_data")
    try:
        artifacts = build_feature_sets(data_dir, gold_dir)
        # Return only shapes/keys to avoid massive payloads
        rf = artifacts["random_forest"]
        resp = {
            "status": "success",
            "random_forest": {
                "X_train_shape": getattr(rf["X_train"], "shape", None),
                "X_test_shape": getattr(rf["X_test"], "shape", None),
                "y_train_size": len(rf["y_train"]),
                "y_test_size": len(rf["y_test"]),
            },
            "legalbert": {
                "num_rows": len(artifacts["legalbert"]["dataset"]),
            },
            "labels": artifacts["labels"],
        }
        return jsonify(resp)
    except Exception as exc:
        logger.exception("Preprocess failed: %s", exc)
        return jsonify({"status": "error", "message": str(exc)}), 500


@upload_bp.route("/ml/train", methods=["POST"])  # body: { data_dir, gold_dir }
def ml_train():
    body = request.get_json(silent=True) or {}
    data_dir = body.get("data_dir", "data")
    gold_dir = body.get("gold_dir", "gold_data")
    try:
        results = train_hybrid(data_dir, gold_dir)
        return jsonify({
            "status": "success",
            "rf_report": results.get("rf_report"),
            "saved_paths": {
                "rf": "server/models/rf/",
                "legalbert": "server/models/legalbert/"
            },
            "message": "Training completed and models saved. LegalBERT may take time and benefits from a GPU.",
        })
    except Exception as exc:
        logger.exception("Training failed: %s", exc)
        return jsonify({"status": "error", "message": str(exc)}), 500
