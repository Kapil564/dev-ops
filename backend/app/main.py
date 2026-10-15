from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from prometheus_fastapi_instrumentator import Instrumentator

from .config import settings
from .db import Base, engine, get_db
from .models import InventoryItem
from .schemas import InventoryStatsOut, ItemCreate, ItemOut, ItemUpdate


DEFAULT_SEED_ITEMS = [
    {
        "name": "Logitech MX Master 3S",
        "sku": "SKU-ELEC-101",
        "category": "Electronics",
        "quantity": 42,
        "unit_price": 99.99,
        "status": "IN_STOCK",
        "supplier": "Logitech Direct",
    },
    {
        "name": "Keychron K2 Mechanical Keyboard",
        "sku": "SKU-ELEC-102",
        "category": "Electronics",
        "quantity": 18,
        "unit_price": 84.50,
        "status": "IN_STOCK",
        "supplier": "Keychron Wholesale",
    },
    {
        "name": "Dell UltraSharp 27 4K Monitor",
        "sku": "SKU-DISP-201",
        "category": "Hardware",
        "quantity": 6,
        "unit_price": 349.99,
        "status": "LOW_STOCK",
        "supplier": "Dell Commercial",
    },
    {
        "name": "Anker 8-in-1 USB-C Hub",
        "sku": "SKU-ACC-301",
        "category": "Accessories",
        "quantity": 65,
        "unit_price": 45.00,
        "status": "IN_STOCK",
        "supplier": "Anker Global",
    },
    {
        "name": "Ergonomic Mesh Office Chair",
        "sku": "SKU-FURN-401",
        "category": "Furniture",
        "quantity": 0,
        "unit_price": 219.00,
        "status": "OUT_OF_STOCK",
        "supplier": "ErgoWorks Inc",
    },
    {
        "name": "Cat6 Shielded Ethernet Cable (15m)",
        "sku": "SKU-NET-501",
        "category": "Networking",
        "quantity": 110,
        "unit_price": 12.99,
        "status": "IN_STOCK",
        "supplier": "CableMax Solutions",
    },
]


def initialize_database() -> None:
    Base.metadata.create_all(bind=engine)
    with Session(engine) as session:
        count = session.scalar(select(func.count(InventoryItem.id)))
        if count == 0:
            for item_data in DEFAULT_SEED_ITEMS:
                session.add(InventoryItem(**item_data))
            session.commit()


initialize_database()


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_database()
    yield


app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
Instrumentator().instrument(app).expose(app, endpoint="/metrics")


@app.get("/")
def root():
    return {"service": settings.app_name, "version": "1.0.0", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "UP"}


@app.get("/ready")
def ready(db: Session = Depends(get_db)):
    db.execute(select(func.count(InventoryItem.id)))
    return {"status": "READY"}


@app.get("/api/items", response_model=list[ItemOut])
def list_items(category: str | None = None, status_filter: str | None = None, db: Session = Depends(get_db)):
    query = select(InventoryItem).order_by(InventoryItem.id.desc())
    if category and category != "ALL":
        query = query.where(InventoryItem.category == category)
    if status_filter and status_filter != "ALL":
        query = query.where(InventoryItem.status == status_filter)
    return list(db.scalars(query))


@app.get("/api/items/stats", response_model=InventoryStatsOut)
def stats(db: Session = Depends(get_db)):
    items = list(db.scalars(select(InventoryItem)))
    total_skus = len(items)
    total_units = sum(item.quantity for item in items)
    low_stock = sum(1 for item in items if item.status == "LOW_STOCK" or (item.quantity > 0 and item.quantity <= 10))
    out_of_stock = sum(1 for item in items if item.status == "OUT_OF_STOCK" or item.quantity == 0)
    total_valuation = round(sum(item.quantity * item.unit_price for item in items), 2)

    return InventoryStatsOut(
        total_skus=total_skus,
        total_units=total_units,
        low_stock=low_stock,
        out_of_stock=out_of_stock,
        total_valuation=total_valuation,
    )


@app.get("/api/items/{item_id}", response_model=ItemOut)
def get_item(item_id: int, db: Session = Depends(get_db)):
    item = db.get(InventoryItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@app.post("/api/items", response_model=ItemOut, status_code=status.HTTP_201_CREATED)
def create_item(payload: ItemCreate, db: Session = Depends(get_db)):
    # Auto-assign status based on initial stock quantity if not explicitly set
    item_dict = payload.model_dump()
    if item_dict["quantity"] == 0:
        item_dict["status"] = "OUT_OF_STOCK"
    elif item_dict["quantity"] <= 10:
        item_dict["status"] = "LOW_STOCK"
    else:
        item_dict["status"] = "IN_STOCK"

    item = InventoryItem(**item_dict)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@app.put("/api/items/{item_id}", response_model=ItemOut)
def update_item(item_id: int, payload: ItemUpdate, db: Session = Depends(get_db)):
    item = db.get(InventoryItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)

    # Re-evaluate stock status when quantity changes unless explicitly provided
    if "quantity" in update_data and "status" not in update_data:
        if item.quantity == 0:
            item.status = "OUT_OF_STOCK"
        elif item.quantity <= 10:
            item.status = "LOW_STOCK"
        else:
            item.status = "IN_STOCK"

    db.commit()
    db.refresh(item)
    return item


@app.delete("/api/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: int, db: Session = Depends(get_db)):
    item = db.get(InventoryItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()

