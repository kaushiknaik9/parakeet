from flask import jsonify, request
from models import get_or_create_user, get_profile, normalize_username, update_profile


def register_profile_routes(app):
    @app.get("/api/profile/<username>")
    def profile_get(username):
        username = normalize_username(username)
        get_or_create_user(username, display_name=username)
        return jsonify(get_profile(username)), 200

    @app.post("/api/profile/<username>/update")
    def profile_update(username):
        username = normalize_username(username)
        payload = request.json or {}
        return jsonify(update_profile(username, payload)), 200
