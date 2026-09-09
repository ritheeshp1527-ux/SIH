from typing import List, Optional
from pydantic import BaseModel, Field, model_validator

class Vessel(BaseModel):
    """
    Vessel specifications for fleet intelligence and propulsion calculations.
    All physical units are explicitly declared.
    """
    id: str = Field(..., description="Unique vessel IMO or identifier", examples=["IMO-9811000"])
    name: str = Field(..., description="Vessel display name", examples=["Pacific Voyager"])
    type: str = Field(..., description="Vessel category: Container, Bulk Carrier, Tanker", examples=["Container"])
    capacity_tonnes: float = Field(..., gt=0, description="Deadweight (DWT) cargo capacity in metric tons", examples=[65000.0])
    min_speed_knots: float = Field(..., gt=0, description="Minimum safe eco-steaming speed in knots", examples=[10.0])
    max_speed_knots: float = Field(..., gt=0, description="Maximum operational speed in knots", examples=[22.0])
    engine_power_kw: float = Field(default=25000.0, gt=0, description="Installed main engine shaft power in kilowatts (kW)", examples=[25000.0])
    fuel_options: List[str] = Field(..., description="Compatible bunker fuel identifiers", examples=[["VLSFO", "LNG"]])
    design_draft_m: float = Field(default=14.5, gt=0, description="Design summer draft in meters (m)", examples=[14.5])

    # Backward compatibility properties for Phase 0 aliases
    @property
    def capacity(self) -> float:
        return self.capacity_tonnes

    @property
    def min_speed(self) -> float:
        return self.min_speed_knots

    @property
    def max_speed(self) -> float:
        return self.max_speed_knots

    @property
    def design_draft(self) -> float:
        return self.design_draft_m

    @model_validator(mode="before")
    @classmethod
    def handle_phase0_aliases(cls, data: dict):
        if isinstance(data, dict):
            if "capacity" in data and "capacity_tonnes" not in data:
                data["capacity_tonnes"] = data["capacity"]
            if "min_speed" in data and "min_speed_knots" not in data:
                data["min_speed_knots"] = data["min_speed"]
            if "max_speed" in data and "max_speed_knots" not in data:
                data["max_speed_knots"] = data["max_speed"]
            if "design_draft" in data and "design_draft_m" not in data:
                data["design_draft_m"] = data["design_draft"]
        return data
