import logging
from flask import Flask, jsonify
from flask_cors import CORS

# Blueprints
from routes.upload import upload_bp


def create_app() -> Flask:
	"""Create and configure the Flask application."""
	logging.basicConfig(
		level=logging.INFO,
		format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
	)

	app = Flask(__name__)
	CORS(app, supports_credentials=True)

	# Register blueprints
	app.register_blueprint(upload_bp)

	@app.route("/", methods=["GET"])
	def healthcheck():
		return jsonify({"status": "ok"})

	# Startup: initialize Mongo connection
	from services.db import MongoConnection
	try:
		MongoConnection.initialize()
	except Exception as exc:
		logging.exception("Mongo initialization failed: %s", exc)

	return app


app = create_app()


if __name__ == "__main__":
	app.run(host="0.0.0.0", port=8000, debug=True)


