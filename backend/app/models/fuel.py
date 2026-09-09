from typing import Optional
from pydantic import BaseModel, Field, model_validator

class Fuel(BaseModel):
    """
    Bunker fuel profile including commercial pricing, energy density,
    and operational/lifecycle emission factors.
    All physical units are explicitly declared.
    """
    id: str = Field(..., description="Unique fuel identifier", examples=["VLSFO"])
    name: str = Field(..., description="Fuel commercial display name", examples=["Very Low Sulfur Fuel Oil (0.5% S)"])
    price_per_tonne: float = Field(..., gt=0, description="Fuel market price in currency per metric ton", examples=[620.0])
    emission_factor_kg_co2_per_tonne: float = Field(
        ..., ge=0,
        description="Operational Tank-to-Wake CO2 emission factor in kg CO2 per metric ton of fuel",
        examples=[3151.0]
    )
    energy_density_mj_per_kg: float = Field(
        default=41.2, gt=0,
        description="Lower Heating Value (LHV) specific energy density in MJ/kg",
        examples=[41.2]
    )
    lifecycle_ghg_factor_kg_co2e_per_tonne: Optional[float] = Field(
        default=None, ge=0,
        description="Simulated Well-to-Wake lifecycle GHG factor in kg CO2-equivalent per metric ton of fuel (DEMO PARAMETER)",
        examples=[3580.0]
    )
    port_id: Optional[str] = Field(default=None, description="Bunkering port UN/LOCODE (if port-specific price)")
    price_date: Optional[str] = Field(default=None, description="Price observation date (YYYY-MM-DD)")
    price_currency: Optional[str] = Field(default="USD", description="Currency (e.g. USD)")
    price_unit: Optional[str] = Field(default="MT", description="Price unit (e.g. MT)")
    is_observed_market_price: bool = Field(
        default=True,
        description="True if from observed market dataset, False if fallback reference"
    )
    price_source: str = Field(
        default="observed_market",
        description="Origin of price data: 'stage7_bunker_prices.csv' or 'fallback_reference'"
    )

    # Backward compatibility properties for Phase 0
    @property
    def price(self) -> float:
        return self.price_per_tonne

    @property
    def emission_factor(self) -> float:
        # Phase 0 returned tCO2/tFuel; 3151 kg/t = 3.151 t/t
        return round(self.emission_factor_kg_co2_per_tonne / 1000.0, 3)

    @property
    def energy_density(self) -> float:
        return self.energy_density_mj_per_kg

    @model_validator(mode="before")
    @classmethod
    def handle_phase0_aliases(cls, data: dict):
        if isinstance(data, dict):
            if "price" in data and "price_per_tonne" not in data:
                data["price_per_tonne"] = data["price"]
            if "emission_factor" in data and "emission_factor_kg_co2_per_tonne" not in data:
                val = data["emission_factor"]
                # If given in tCO2/tFuel (e.g. 3.151), convert to kg/t (3151.0)
                data["emission_factor_kg_co2_per_tonne"] = val * 1000.0 if val < 100.0 else val
            if "energy_density" in data and "energy_density_mj_per_kg" not in data:
                data["energy_density_mj_per_kg"] = data["energy_density"]
        return data
