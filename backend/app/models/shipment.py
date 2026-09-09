from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field

class Shipment(BaseModel):
    """
    Preliminary schema for user shipment requests.
    """
    source: str = Field(..., description="Origin port or terminal", examples=["Port of Singapore"])
    destination: str = Field(..., description="Destination port or terminal", examples=["Port of Rotterdam"])
    cargo_weight: float = Field(..., gt=0, description="Cargo weight in metric tons", examples=[45000.0])
    deadline: datetime = Field(..., description="Target delivery deadline (UTC)")
    priority: Optional[str] = Field("standard", description="Shipment priority: standard, green, urgent")
    special_requirements: Optional[str] = Field(None, description="Optional handling constraints")

