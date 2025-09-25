import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Tuple, Optional

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report

from transformers import AutoTokenizer, AutoModelForSequenceClassification, Trainer, TrainingArguments
import torch
from datasets import Dataset
import joblib


@dataclass
class SplitData:
    X_train: np.ndarray
    X_test: np.ndarray
    y_train: np.ndarray
    y_test: np.ndarray


def read_datasets(data_dir: str, gold_dir: str) -> pd.DataFrame:
    """Load and merge datasets from data/ and gold_data/.

    Expected columns: 'comment' and 'label' (sentiment/argument).
    Supports CSV or TSV.
    """
    def read_all(dir_path: str) -> List[pd.DataFrame]:
        frames: List[pd.DataFrame] = []
        p = Path(dir_path)
        if not p.exists():
            return frames
        for f in p.glob("**/*"):
            if f.is_file() and f.suffix.lower() in {".csv", ".tsv"}:
                if f.suffix.lower() == ".csv":
                    frames.append(pd.read_csv(f))
                else:
                    frames.append(pd.read_csv(f, sep="\t"))
        return frames

    frames = read_all(data_dir) + read_all(gold_dir)
    if not frames:
        raise RuntimeError("No datasets found in provided directories.")

    df = pd.concat(frames, ignore_index=True)
    # Normalize column names
    col_map = {c.lower().strip(): c for c in df.columns}
    comment_col = col_map.get("comment") or col_map.get("text") or list(df.columns)[0]
    label_col = col_map.get("label") or col_map.get("sentiment") or col_map.get("argument_label") or list(df.columns)[-1]
    df = df[[comment_col, label_col]].rename(columns={comment_col: "comment", label_col: "label"})
    df = df.dropna().reset_index(drop=True)
    return df


def clean_text(text: str, stopwords: Optional[set] = None) -> str:
    s = str(text).lower()
    s = re.sub(r"[^a-z\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    if stopwords:
        s = " ".join([w for w in s.split() if w not in stopwords])
    return s


def add_numeric_features(series: pd.Series) -> pd.DataFrame:
    texts = series.astype(str).fillna("")
    word_counts = texts.apply(lambda x: len(x.split()))
    char_counts = texts.apply(len)
    avg_word_len = (char_counts / word_counts.replace(0, np.nan)).fillna(0)
    return pd.DataFrame({
        "word_count": word_counts,
        "char_count": char_counts,
        "avg_word_length": avg_word_len,
    })


def build_tfidf_features(texts: List[str], max_features: int = 20000) -> Tuple[TfidfVectorizer, np.ndarray]:
    vectorizer = TfidfVectorizer(max_features=max_features, ngram_range=(1, 2), min_df=2)
    X = vectorizer.fit_transform(texts)
    return vectorizer, X


def build_random_forest_dataset(df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray, TfidfVectorizer]:
    # Basic English stopwords list; for brevity not importing nltk stopwords
    stopwords = {
        "a","an","the","and","or","but","if","then","so","because","as","of","to","in","on","for","with","by",
        "is","are","was","were","be","been","being","it","this","that","these","those","at","from","up","down","out","about"
    }
    df = df.copy()
    df["cleaned"] = df["comment"].apply(lambda t: clean_text(t, stopwords))
    numeric = add_numeric_features(df["cleaned"])  # derive features from cleaned text
    vectorizer, X_tfidf = build_tfidf_features(df["cleaned"].tolist())
    # hstack sparse + dense
    from scipy.sparse import hstack
    X = hstack([X_tfidf, numeric.values])
    y = df["label"].values
    return X, y, vectorizer


def split_dataset(X, y, test_size: float = 0.2, random_state: int = 42) -> SplitData:
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, random_state=random_state, stratify=y)
    return SplitData(X_train=X_train, X_test=X_test, y_train=y_train, y_test=y_test)


def train_random_forest(split: SplitData, n_estimators: int = 300, random_state: int = 42) -> RandomForestClassifier:
    clf = RandomForestClassifier(n_estimators=n_estimators, n_jobs=-1, random_state=random_state)
    clf.fit(split.X_train, split.y_train)
    return clf


def legalbert_tokenize(df: pd.DataFrame, model_name: str = "nlpaueb/legal-bert-base-uncased", max_length: int = 256) -> Tuple[Dataset, AutoTokenizer]:
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    def tok(batch):
        return tokenizer(batch["comment"], truncation=True, padding="max_length", max_length=max_length)
    ds = Dataset.from_pandas(df[["comment", "label"]])
    ds = ds.map(tok, batched=True)
    ds = ds.rename_column("label", "labels")
    ds.set_format(type="torch", columns=["input_ids", "attention_mask", "labels"])  # token_type_ids not used for uncased by default
    return ds, tokenizer


def train_legalbert(ds: Dataset, model_name: str = "nlpaueb/legal-bert-base-uncased", output_dir: str = "./outputs/legalbert", epochs: int = 2, batch_size: int = 8):
    model = AutoModelForSequenceClassification.from_pretrained(model_name, num_labels=len(set(ds["labels"])) )

    args = TrainingArguments(
        output_dir=output_dir,
        per_device_train_batch_size=batch_size,
        per_device_eval_batch_size=batch_size,
        num_train_epochs=epochs,
        evaluation_strategy="epoch",
        save_strategy="epoch",
        logging_steps=50,
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
    )

    # Simple split for training/validation
    ds_train_test = ds.train_test_split(test_size=0.2, seed=42)
    trainer = Trainer(model=model, args=args, train_dataset=ds_train_test["train"], eval_dataset=ds_train_test["test"])
    trainer.train()
    return trainer


def build_feature_sets(data_dir: str = "data", gold_dir: str = "gold_data") -> Dict[str, object]:
    df = read_datasets(data_dir, gold_dir)
    # RandomForest feature set
    X, y, vectorizer = build_random_forest_dataset(df)
    split = split_dataset(X, y)

    # LegalBERT dataset
    ds, tokenizer = legalbert_tokenize(df)

    return {
        "random_forest": {
            "X_train": split.X_train,
            "X_test": split.X_test,
            "y_train": split.y_train,
            "y_test": split.y_test,
            "vectorizer": vectorizer,
        },
        "legalbert": {
            "dataset": ds,
            "tokenizer": tokenizer,
        },
        "labels": np.unique(y).tolist(),
    }


def train_hybrid(data_dir: str = "data", gold_dir: str = "gold_data") -> Dict[str, object]:
    artifacts = build_feature_sets(data_dir, gold_dir)

    # Train RandomForest
    rf_split = SplitData(
        X_train=artifacts["random_forest"]["X_train"],
        X_test=artifacts["random_forest"]["X_test"],
        y_train=artifacts["random_forest"]["y_train"],
        y_test=artifacts["random_forest"]["y_test"],
    )
    rf_clf = train_random_forest(rf_split)
    rf_preds = rf_clf.predict(rf_split.X_test)

    # Train LegalBERT
    trainer = train_legalbert(artifacts["legalbert"]["dataset"])  # returns trained Trainer
    # Save artifacts
    models_dir = Path("server/models")
    rf_dir = models_dir / "rf"
    lb_dir = models_dir / "legalbert"
    rf_dir.mkdir(parents=True, exist_ok=True)
    lb_dir.mkdir(parents=True, exist_ok=True)

    # Save RandomForest pipeline bits
    joblib.dump(rf_clf, rf_dir / "model.joblib")
    joblib.dump(artifacts["random_forest"]["vectorizer"], rf_dir / "vectorizer.joblib")
    joblib.dump(artifacts["labels"], rf_dir / "labels.joblib")

    # Save LegalBERT model and tokenizer
    trainer.save_model(str(lb_dir))
    artifacts["legalbert"]["tokenizer"].save_pretrained(str(lb_dir))

    return {
        "random_forest_model": rf_clf,
        "legalbert_trainer": trainer,
        "feature_artifacts": artifacts,
        "rf_report": classification_report(rf_split.y_test, rf_preds, output_dict=True),
    }


