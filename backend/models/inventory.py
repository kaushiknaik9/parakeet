import json
import os
import re
import uuid

INVENTORY_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "inventory.json")

SEED_INVENTORY = [
    {
        "id": "inv_001",
        "mpn": "ESP32",
        "name": "ESP32 Wi-Fi & Bluetooth MCU Module",
        "category": "Microcontroller",
        "stock_qty": 3000,
        "min_reorder_level": 500,
        "standard_unit_price": 200.0,
    },
    {
        "id": "inv_002",
        "mpn": "DHT22",
        "name": "DHT22 Digital Temperature & Humidity Sensor",
        "category": "Sensor",
        "stock_qty": 6000,
        "min_reorder_level": 1000,
        "standard_unit_price": 120.0,
    },
    {
        "id": "inv_003",
        "mpn": "STM32F401RET6",
        "name": "STM32 ARM Cortex-M4 Microcontroller",
        "category": "Microcontroller",
        "stock_qty": 15000,
        "min_reorder_level": 2000,
        "standard_unit_price": 280.0,
    },
]


def load_inventory() -> list:
    """Reads inventory catalog from backend/data/inventory.json. Seeds file if missing."""
    if not os.path.exists(INVENTORY_FILE):
        save_inventory(SEED_INVENTORY)
        return list(SEED_INVENTORY)
    try:
        with open(INVENTORY_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else SEED_INVENTORY
    except Exception:
        return list(SEED_INVENTORY)


def save_inventory(data: list) -> bool:
    """Saves inventory list to disk."""
    try:
        os.makedirs(os.path.dirname(INVENTORY_FILE), exist_ok=True)
        with open(INVENTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        return True
    except Exception:
        return False


def list_inventory() -> list:
    return load_inventory()


def get_inventory_item(item_id: str) -> dict | None:
    items = load_inventory()
    for item in items:
        if item.get("id") == item_id or item.get("mpn", "").lower() == item_id.lower():
            return item
    return None


def upsert_inventory_item(item_data: dict) -> dict:
    items = load_inventory()
    item_id = str(item_data.get("id") or "").strip()
    mpn = str(item_data.get("mpn") or "").strip().upper()

    existing_idx = None
    for idx, it in enumerate(items):
        if (item_id and it.get("id") == item_id) or (mpn and it.get("mpn", "").upper() == mpn):
            existing_idx = idx
            break

    record = {
        "id": item_id or f"inv_{uuid.uuid4().hex[:6]}",
        "mpn": mpn or item_data.get("name", "PART"),
        "name": str(item_data.get("name") or mpn or "Electronic Component"),
        "category": str(item_data.get("category") or "Electronics Component"),
        "stock_qty": int(item_data.get("stock_qty") or 0),
        "min_reorder_level": int(item_data.get("min_reorder_level") or 100),
        "standard_unit_price": float(item_data.get("standard_unit_price") or 0.0),
    }

    if existing_idx is not None:
        items[existing_idx] = record
    else:
        items.append(record)

    save_inventory(items)
    return record


def delete_inventory_item(item_id: str) -> bool:
    items = load_inventory()
    filtered = [it for it in items if it.get("id") != item_id and it.get("mpn", "").lower() != item_id.lower()]
    if len(filtered) < len(items):
        save_inventory(filtered)
        return True
    return False


def _fuzzy_match_component(part_string: str, catalog: list) -> dict | None:
    """Matches an extracted BOM component name/MPN against warehouse catalog items."""
    if not part_string:
        return None
    raw_str = str(part_string).strip().upper()
    alphanumeric_clean = re.sub(r"[^A-Z0-9]", "", raw_str)

    # 1. Exact MPN match
    for item in catalog:
        item_mpn = item.get("mpn", "").upper()
        if item_mpn and item_mpn == raw_str:
            return item

    # 2. Alphanumeric stripped MPN match (e.g. "STM32F401" vs "STM32F401RET6" or "ESP-32" vs "ESP32")
    for item in catalog:
        item_mpn_clean = re.sub(r"[^A-Z0-9]", "", item.get("mpn", "").upper())
        if item_mpn_clean and (item_mpn_clean in alphanumeric_clean or alphanumeric_clean in item_mpn_clean):
            return item

    # 3. Substring match against name or MPN
    for item in catalog:
        item_mpn = item.get("mpn", "").upper()
        item_name = item.get("name", "").upper()
        if (item_mpn and item_mpn in raw_str) or (item_name and (item_name in raw_str or raw_str in item_name)):
            return item

    return None


def check_stock_availability(extracted_items: list) -> dict:
    """
    Cross-references extracted BOM items against warehouse inventory catalog.
    Returns stock_status list and pre-confirmation stock warnings (insufficient stock, not in catalog, reorder level).
    """
    catalog = load_inventory()
    warnings = []
    stock_statuses = []

    for item in extracted_items or []:
        part_name = item.get("part_name") or item.get("mpn") or "Electronic Part"
        try:
            req_qty = int(item.get("quantity") or 0)
        except (ValueError, TypeError):
            req_qty = 0

        inv_match = _fuzzy_match_component(part_name, catalog)

        if inv_match:
            avail_stock = int(inv_match.get("stock_qty") or 0)
            min_reorder = int(inv_match.get("min_reorder_level") or 0)
            matched_mpn = inv_match.get("mpn") or inv_match.get("name")

            if req_qty > avail_stock:
                status = "insufficient"
                warnings.append({
                    "type": "insufficient_stock",
                    "part_name": part_name,
                    "matched_mpn": matched_mpn,
                    "requested_qty": req_qty,
                    "available_stock": avail_stock,
                    "severity": "high",
                    "message": f"Stock Warning: Requested {req_qty:,} units of {part_name}, but only {avail_stock:,} available in warehouse stock."
                })
            else:
                status = "sufficient"
                rem_stock = avail_stock - req_qty
                if rem_stock < min_reorder:
                    warnings.append({
                        "type": "reorder_threshold_triggered",
                        "part_name": part_name,
                        "matched_mpn": matched_mpn,
                        "requested_qty": req_qty,
                        "available_stock": avail_stock,
                        "remaining_stock": rem_stock,
                        "min_reorder_level": min_reorder,
                        "severity": "medium",
                        "message": f"Reorder Warning: Fulfilling {req_qty:,} units of {part_name} leaves {rem_stock:,} units in stock, which is below min reorder level ({min_reorder:,})."
                    })

            stock_statuses.append({
                "part_name": part_name,
                "mpn": matched_mpn,
                "requested_qty": req_qty,
                "available_stock": avail_stock,
                "status": status,
                "in_catalog": True
            })
        else:
            warnings.append({
                "type": "item_not_in_inventory",
                "part_name": part_name,
                "matched_mpn": None,
                "requested_qty": req_qty,
                "available_stock": 0,
                "severity": "low",
                "message": f"Catalog Warning: Component '{part_name}' is not currently tracked in seller warehouse inventory catalog."
            })
            stock_statuses.append({
                "part_name": part_name,
                "mpn": None,
                "requested_qty": req_qty,
                "available_stock": 0,
                "status": "unknown",
                "in_catalog": False
            })

    return {
        "warnings": warnings,
        "stock_status": stock_statuses
    }


def deduct_inventory_stock(extracted_items: list) -> list:
    """Deducts requested quantities from matching warehouse stock upon deal confirmation/signature."""
    catalog = load_inventory()
    updated_catalog = list(catalog)
    deducted_log = []

    for item in extracted_items or []:
        part_name = item.get("part_name") or item.get("mpn") or ""
        try:
            req_qty = int(item.get("quantity") or 0)
        except (ValueError, TypeError):
            req_qty = 0

        inv_match = _fuzzy_match_component(part_name, updated_catalog)
        if inv_match and req_qty > 0:
            for cat_item in updated_catalog:
                if cat_item.get("id") == inv_match.get("id"):
                    curr_stock = int(cat_item.get("stock_qty") or 0)
                    new_stock = max(0, curr_stock - req_qty)
                    cat_item["stock_qty"] = new_stock
                    deducted_log.append({
                        "id": cat_item.get("id"),
                        "mpn": cat_item.get("mpn"),
                        "previous_stock": curr_stock,
                        "deducted_qty": req_qty,
                        "new_stock": new_stock
                    })
                    break

    save_inventory(updated_catalog)
    return deducted_log
