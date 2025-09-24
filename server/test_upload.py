import csv
import io
import os
import random
import string
import time

import requests


def random_comment(n: int) -> str:
	return "".join(random.choices(string.ascii_letters + " ", k=n)).strip()


def build_csv_bytes(rows: int = 5) -> bytes:
	buf = io.StringIO()
	w = csv.writer(buf)
	w.writerow(["id", "comment", "score"])  # simple schema
	for i in range(rows):
		w.writerow([i + 1, random_comment(20), random.randint(0, 10)])
	return buf.getvalue().encode("utf-8")


def main():
	url = os.getenv("UPLOAD_URL", "http://localhost:8000/upload-file")
	csv_bytes = build_csv_bytes()
	files = {"file": ("sample.csv", csv_bytes, "text/csv")}
	resp = requests.post(url, files=files, timeout=30)
	print("Status:", resp.status_code)
	print("Response:", resp.text)


if __name__ == "__main__":
	main()


