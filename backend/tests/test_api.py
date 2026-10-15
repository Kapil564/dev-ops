import os

os.environ["DATABASE_URL"] = "sqlite:///./test.db"

# Remove existing test.db if present so tests run on a fresh schema
if os.path.exists("./test.db"):
    try:
        os.remove("./test.db")
    except OSError:
        pass

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    assert client.get("/health").json() == {"status": "UP"}


def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["service"] == "StockPulse Inventory API"


def test_create_item_validation():
    response = client.post(
        "/api/items",
        json={
            "name": "Sony WH-1000XM5 Headphones",
            "sku": "SKU-AUDIO-999",
            "category": "Electronics",
            "quantity": 25,
            "unit_price": 398.00,
            "supplier": "Sony Electronics",
        },
    )
    assert response.status_code == 201
    payload = response.json()
    assert payload["name"] == "Sony WH-1000XM5 Headphones"
    assert payload["sku"] == "SKU-AUDIO-999"
    assert payload["status"] == "IN_STOCK"
    assert payload["quantity"] == 25


def test_list_items_returns_created_items():
    response = client.get("/api/items")
    assert response.status_code == 200
    items = response.json()
    assert len(items) >= 1
    skus = [item["sku"] for item in items]
    assert "SKU-AUDIO-999" in skus


def test_get_item_by_id():
    created = client.post(
        "/api/items",
        json={
            "name": "Apple Magic Trackpad",
            "sku": "SKU-ACC-888",
            "category": "Accessories",
            "quantity": 12,
            "unit_price": 129.00,
            "supplier": "Apple Direct",
        },
    )
    item_id = created.json()["id"]

    response = client.get(f"/api/items/{item_id}")
    assert response.status_code == 200
    assert response.json()["sku"] == "SKU-ACC-888"


def test_update_item_quantity_and_status():
    created = client.post(
        "/api/items",
        json={
            "name": "Barcode Scanner 2D",
            "sku": "SKU-SCAN-777",
            "category": "Hardware",
            "quantity": 15,
            "unit_price": 79.99,
            "supplier": "Zebra Partner",
        },
    )
    item_id = created.json()["id"]

    # Reduce stock to 3 to trigger LOW_STOCK status
    response = client.put(
        f"/api/items/{item_id}",
        json={"quantity": 3},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["quantity"] == 3
    assert payload["status"] == "LOW_STOCK"


def test_delete_item():
    created = client.post(
        "/api/items",
        json={
            "name": "Obsolete Thermal Roll",
            "sku": "SKU-OBS-001",
            "category": "Office",
            "quantity": 5,
            "unit_price": 4.50,
            "supplier": "Supply Depot",
        },
    )
    item_id = created.json()["id"]

    response = client.delete(f"/api/items/{item_id}")
    assert response.status_code == 204
    assert client.get(f"/api/items/{item_id}").status_code == 404


def test_stats_counts_inventory():
    response = client.get("/api/items/stats")
    assert response.status_code == 200
    payload = response.json()
    assert payload["total_skus"] >= 1
    assert payload["total_units"] >= 1
    assert payload["total_valuation"] > 0

