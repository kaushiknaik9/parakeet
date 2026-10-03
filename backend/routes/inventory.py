import logging
from flask import jsonify, request
from models import (
    check_stock_availability,
    delete_inventory_item,
    get_inventory_item,
    list_inventory,
    upsert_inventory_item,
)

logger = logging.getLogger(__name__)


def register_inventory_routes(app):
    @app.get("/api/inventory")
    def inventory_list():
        items = list_inventory()
        return jsonify(items), 200

    @app.get("/api/inventory/<item_id>")
    def inventory_get(item_id):
        item = get_inventory_item(item_id)
        if not item:
            return jsonify({"error": "inventory item not found"}), 404
        return jsonify(item), 200

    @app.post("/api/inventory")
    def inventory_create():
        payload = request.json or {}
        if not payload.get("name") and not payload.get("mpn"):
            return jsonify({"error": "missing name or mpn"}), 400
        item = upsert_inventory_item(payload)
        return jsonify(item), 201

    @app.put("/api/inventory/<item_id>")
    def inventory_update(item_id):
        payload = request.json or {}
        payload["id"] = item_id
        item = upsert_inventory_item(payload)
        return jsonify(item), 200

    @app.delete("/api/inventory/<item_id>")
    def inventory_delete(item_id):
        ok = delete_inventory_item(item_id)
        if not ok:
            return jsonify({"error": "inventory item not found"}), 404
        return jsonify({"deleted": True}), 200

    @app.post("/api/inventory/check-stock")
    def inventory_check_stock():
        payload = request.json or {}
        items = payload.get("items") or []
        res = check_stock_availability(items)
        return jsonify(res), 200
