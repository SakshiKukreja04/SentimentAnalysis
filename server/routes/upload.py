import io
import logging
import os
from typing import List

import base64
from datetime import datetime, timezone
import pandas as pd
from flask import Blueprint, jsonify, request

from services.db import get_collection, get_database
from gridfs import GridFS


logger = logging.getLogger(__name__)
upload_bp = Blueprint("upload", __name__)


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

	# Determine file type by extension or content type
	lower_name = filename.lower()
	content_type = (file.content_type or "").lower()

	is_csv = lower_name.endswith(".csv") or "csv" in content_type
	is_excel = lower_name.endswith(".xlsx") or lower_name.endswith(".xls") or "excel" in content_type or "spreadsheet" in content_type

	# Build single-document storage as requested: metadata + base64 file content
	# Note: We still attempt to read via pandas when possible to validate the file,
	# but we store the raw content per new structure.
	try:
		if is_csv and not is_excel:
			# Lightweight validation; ignore the parsed result
			pd.read_csv(io.BytesIO(content), nrows=1)
		else:
			pd.read_excel(io.BytesIO(content), engine="openpyxl", nrows=1)
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


