from flask import jsonify, request
from models import create_user_auth, verify_user_auth


def register_auth_routes(app):
    @app.post("/api/auth/signup")
    def signup():
        payload = request.json or {}
        email = payload.get("email")
        password = payload.get("password")
        name = payload.get("name")
        company_name = payload.get("company_name", "")
        role = payload.get("role", "")

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        result = create_user_auth(email, password, name, company_name, role)
        if "error" in result:
            return jsonify({"error": result["error"]}), 400
        return jsonify(result), 201

    @app.post("/api/auth/login")
    def login():
        payload = request.json or {}
        email = payload.get("email")
        password = payload.get("password")

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        result = verify_user_auth(email, password)
        if "error" in result:
            return jsonify({"error": result["error"]}), 401
        return jsonify(result), 200
