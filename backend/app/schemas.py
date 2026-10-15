from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

ItemStatus = Literal["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"]

class ItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    sku: str = Field(min_length=1, max_length=80)
    category: str = Field(default="General", max_length=80)
    quantity: int = Field(default=0, ge=0)
    unit_price: float = Field(default=0.0, ge=0.0)
    status: ItemStatus = "IN_STOCK"
    supplier: str = Field(default="Primary Vendor", max_length=150)

class ItemUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    sku: str | None = Field(default=None, min_length=1, max_length=80)
    category: str | None = None
    quantity: int | None = Field(default=None, ge=0)
    unit_price: float | None = Field(default=None, ge=0.0)
    status: ItemStatus | None = None
    supplier: str | None = None

class ItemOut(ItemCreate):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class InventoryStatsOut(BaseModel):
    total_skus: int
    total_units: int
    low_stock: int
    out_of_stock: int
    total_valuation: float

