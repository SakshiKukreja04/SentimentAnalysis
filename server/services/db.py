import logging
import os
from typing import Optional
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.database import Database


logger = logging.getLogger(__name__)

# Load env vars from server/.env at import time (works regardless of CWD)
ENV_PATH = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=ENV_PATH, override=False)


class MongoConnection:
	"""Singleton-style holder for MongoClient and Database."""

	_client: Optional[MongoClient] = None
	_db: Optional[Database] = None

	@classmethod
	def initialize(cls) -> None:
		if cls._client is not None and cls._db is not None:
			return

		mongo_uri = os.getenv("MONGO_URI")
		db_name = os.getenv("DB_NAME")

		if not mongo_uri:
			raise RuntimeError("MONGO_URI is not set in environment variables.")
		if not db_name:
			raise RuntimeError("DB_NAME is not set in environment variables.")

		cls._client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
		# Trigger a ping to validate connection early
		cls._client.admin.command("ping")
		cls._db = cls._client[db_name]
		logger.info("Connected to MongoDB database '%s' successfully.", db_name)
		print("MongoDB connection established: DB=", db_name)

	@classmethod
	def get_db(cls) -> Database:
		if cls._db is None:
			cls.initialize()
		return cls._db  # type: ignore[return-value]

	@classmethod
	def get_collection(cls, name: str) -> Collection:
		db = cls.get_db()
		return db[name]


def get_database() -> Database:
	return MongoConnection.get_db()


def get_collection(name: str = "uploaded_comments") -> Collection:
	return MongoConnection.get_collection(name)


