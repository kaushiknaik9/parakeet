from flask import jsonify, request
from models import list_activity, normalize_username


def register_activity_routes(app):
    @app.get("/api/activity")
    def activity_list():
        username = normalize_username(request.args.get("username", ""))
        if not username:
            return jsonify({"error": "missing username"}), 400
        limit = min(int(request.args.get("limit", 50) or 50), 200)
        return jsonify(list_activity(username, limit=limit)), 200
