import re
from pathlib import Path
from typing import Dict, Optional, Tuple, List, Any
from pydantic import BaseModel, Field

from backend.app.models.fuel import Fuel
from backend.app.models.vessel import Vessel
from backend.app.data.ingestion.csv_loader import load_csv_records

class PortBunkerPriceRecord(BaseModel):
    """
    Market bunker price record for a specific port and fuel type.
    Distinguishes real observed market pricing from unobserved fallback estimates.
    """
    port: str = Field(..., description="UN/LOCODE port identifier (e.g. SGSIN, INBOM, NLRTM)")
    fuel_id: str = Field(..., description="Normalized fuel code (e.g. HFO, MDO, LNG)")
    raw_fuel_type: str = Field(..., description="Raw fuel description from CSV")
    price_per_tonne: float = Field(..., gt=0.0, description="Price in currency per metric ton")
    currency: str = Field(default="USD", description="Currency code (e.g. USD)")
    unit: str = Field(default="MT", description="Pricing unit (e.g. MT)")
    date: Optional[str] = Field(default=None, description="Observation date (YYYY-MM-DD)")
    is_observed_market_price: bool = Field(
        default=True,
        description="True if record is an observed market price from stage7_bunker_prices.csv"
    )
    price_source: str = Field(
        default="stage7_bunker_prices.csv",
        description="Data origin: 'stage7_bunker_prices.csv' or 'fallback_reference'"
    )

# Fallback reference prices (USD/t) retained ONLY for prototype simulation completeness
# for fuels not traded or missing in observed market data (e.g. emerging e-fuels)
FALLBACK_REFERENCE_PRICES: Dict[str, float] = {
    "HFO": 600.0,
    "MDO": 850.0,
    "LNG": 750.0,
    "METHANOL": 950.0,
    "AMMONIA": 1100.0,
}

def parse_fuel_identifier_and_name(raw_fuel_type: str) -> Tuple[str, str]:
    """
    Parses a composite fuel description string (e.g. 'HFO (Heavy Fuel Oil)')
    into a standardized identifier code and display name.
    """
    cleaned = raw_fuel_type.strip()
    
    # Check for known patterns
    if "HFO" in cleaned.upper():
        return "HFO", "Heavy Fuel Oil (HFO)"
    elif "MDO" in cleaned.upper():
        return "MDO", "Marine Diesel Oil (MDO)"
    elif "LNG" in cleaned.upper():
        return "LNG", "Liquefied Natural Gas (LNG)"
    elif "METHANOL" in cleaned.upper():
        return "METHANOL", "Green Methanol (e-methanol)"
    elif "AMMONIA" in cleaned.upper():
        return "AMMONIA", "Green Ammonia (e-ammonia)"
    
    # Fallback heuristic: take first word as code
    match = re.match(r"^([A-Za-z0-9_\-]+)\s*(?:\((.*)\))?", cleaned)
    if match:
        code = match.group(1).upper()
        return code, cleaned
    return cleaned.upper(), cleaned


class FuelEmissionIngestionService:
    """
    Data ingestion and normalization service for bunker fuels and fleet specifications.
    Primary bunker-price source: stage7_bunker_prices.csv (port + fuel_type + date).
    Primary emission source: stage6_emission_factors.csv.
    """

    def __init__(self, data_dir: Optional[Path] = None):
        if data_dir is None:
            data_dir = Path(__file__).resolve().parent.parent / "external"
        self._data_dir = data_dir

    def load_port_bunker_prices(
        self,
        price_file_name: str = "stage7_bunker_prices.csv"
    ) -> Dict[Tuple[str, str], PortBunkerPriceRecord]:
        """
        Ingests port-specific bunker prices from stage7_bunker_prices.csv.
        Returns dictionary keyed by (port, fuel_id).
        Does NOT fabricate prices for missing combinations.
        """
        price_file = self._data_dir / price_file_name
        # Fallback to older bunker_prices.csv if stage7 is missing
        if not price_file.exists():
            legacy_file = self._data_dir / "bunker_prices.csv"
            if legacy_file.exists():
                return self._load_legacy_bunker_prices(legacy_file)
            return {}

        records = load_csv_records(price_file)
        port_prices: Dict[Tuple[str, str], PortBunkerPriceRecord] = {}

        for row in records:
            port = row.get("port", "").strip().upper()
            raw_fuel = row.get("fuel_type", "").strip()
            price_str = row.get("fuel_price", "").strip()
            currency = row.get("currency", "USD").strip().upper()
            unit = row.get("unit", "MT").strip().upper()
            date = row.get("date", "").strip()

            if not port or not raw_fuel or not price_str:
                continue

            try:
                price_val = float(price_str)
            except ValueError:
                continue

            fuel_id, _ = parse_fuel_identifier_and_name(raw_fuel)
            key = (port, fuel_id)

            port_prices[key] = PortBunkerPriceRecord(
                port=port,
                fuel_id=fuel_id,
                raw_fuel_type=raw_fuel,
                price_per_tonne=price_val,
                currency=currency,
                unit=unit,
                date=date if date else None,
                is_observed_market_price=True,
                price_source="stage7_bunker_prices.csv"
            )

        return port_prices

    def _load_legacy_bunker_prices(self, legacy_file: Path) -> Dict[Tuple[str, str], PortBunkerPriceRecord]:
        records = load_csv_records(legacy_file)
        prices = {}
        for row in records:
            f_id = row.get("fuel_id", "").strip().upper()
            p_val = float(row.get("price_per_tonne", 600.0))
            prices[("GLOBAL", f_id)] = PortBunkerPriceRecord(
                port="GLOBAL",
                fuel_id=f_id,
                raw_fuel_type=f_id,
                price_per_tonne=p_val,
                currency="USD",
                unit="MT",
                date=None,
                is_observed_market_price=False,
                price_source="bunker_prices.csv"
            )
        return prices

    def get_bunker_price(
        self,
        port: str,
        fuel_id: str,
        allow_fallback: bool = False,
        price_file_name: str = "stage7_bunker_prices.csv"
    ) -> Optional[PortBunkerPriceRecord]:
        """
        Retrieves the price record for a specific port and fuel code.
        If the combination is not in stage7_bunker_prices.csv:
          - If allow_fallback is False: returns None (no price fabrication).
          - If allow_fallback is True: returns a record explicitly marked with
            is_observed_market_price=False and price_source='fallback_reference'.
        """
        port_prices = self.load_port_bunker_prices(price_file_name)
        port_clean = port.strip().upper()
        fuel_clean = fuel_id.strip().upper()

        # 1. Exact match in observed market dataset
        if (port_clean, fuel_clean) in port_prices:
            return port_prices[(port_clean, fuel_clean)]

        # 2. Missing combination: do not fabricate unless explicitly requested as fallback
        if not allow_fallback:
            return None

        # 3. Explicitly marked fallback reference
        fallback_val = FALLBACK_REFERENCE_PRICES.get(fuel_clean, 700.0)
        return PortBunkerPriceRecord(
            port=port_clean,
            fuel_id=fuel_clean,
            raw_fuel_type=fuel_clean,
            price_per_tonne=fallback_val,
            currency="USD",
            unit="MT",
            date=None,
            is_observed_market_price=False,
            price_source="fallback_reference"
        )

    def load_fuels(
        self,
        port: Optional[str] = "SGSIN",
        allow_fallback: bool = True,
        emission_file_name: str = "stage6_emission_factors.csv",
        price_file_name: str = "stage7_bunker_prices.csv"
    ) -> Dict[str, Fuel]:
        """
        Parses stage6_emission_factors.csv and joins with port-specific prices from
        stage7_bunker_prices.csv.
        
        If port is given:
          - Joins prices for that port + fuel code.
          - If allow_fallback is False, fuels without observed prices at that port are EXCLUDED.
          - If allow_fallback is True, fuels without observed prices receive an explicitly marked
            fallback reference price (is_observed_market_price=False, price_source='fallback_reference').
        """
        emission_file = self._data_dir / emission_file_name
        if not emission_file.exists():
            raise FileNotFoundError(f"Emission factors dataset missing at: {emission_file}")

        port_locode_aliases: Dict[str, str] = {
            "PORT-SG": "SGSIN",
            "PORT-RTM": "NLRTM",
        }

        records = load_csv_records(emission_file)
        fuels: Dict[str, Fuel] = {}
        raw_port = port.strip().upper() if port else "SGSIN"
        target_port = port_locode_aliases.get(raw_port, raw_port)

        for row in records:
            raw_type = row.get("fuel_type", "")
            if not raw_type:
                continue

            fuel_id, fuel_name = parse_fuel_identifier_and_name(raw_type)

            # Resolve price for this port + fuel_id
            price_record = self.get_bunker_price(
                port=target_port,
                fuel_id=fuel_id,
                allow_fallback=allow_fallback,
                price_file_name=price_file_name
            )

            # If no price exists and fallback is disallowed, do not fabricate
            if price_record is None:
                continue

            lcv_val = float(row["lcv_mj_per_g"])
            ttw_val = float(row["ttw_co2_g_per_gFuel"])
            wtw_intensity = float(row["wtw_ghg_intensity_gCO2eq_per_MJ"])

            # 1. Lower Heating Value: MJ/g -> MJ/kg
            energy_density_mj_per_kg = round(lcv_val * 1000.0, 3)

            # 2. Tank-to-Wake CO2: g CO2 / g Fuel -> kg CO2 / metric ton Fuel
            emission_factor_kg_co2_per_tonne = round(ttw_val * 1000.0, 3)

            # 3. Well-to-Wake Lifecycle GHG: g CO2eq / MJ -> kg CO2e / metric ton Fuel
            lifecycle_ghg_factor_kg_co2e_per_tonne = round(
                wtw_intensity * energy_density_mj_per_kg, 3
            )

            fuel = Fuel(
                id=fuel_id,
                name=fuel_name,
                price_per_tonne=price_record.price_per_tonne,
                emission_factor_kg_co2_per_tonne=emission_factor_kg_co2_per_tonne,
                energy_density_mj_per_kg=energy_density_mj_per_kg,
                lifecycle_ghg_factor_kg_co2e_per_tonne=lifecycle_ghg_factor_kg_co2e_per_tonne,
                port_id=price_record.port,
                price_date=price_record.date,
                price_currency=price_record.currency,
                price_unit=price_record.unit,
                is_observed_market_price=price_record.is_observed_market_price,
                price_source=price_record.price_source
            )
            fuels[fuel.id] = fuel

        return fuels

    def load_vessels(self, fleet_file_name: str = "fleet_reference.csv") -> Dict[str, Vessel]:
        """
        Loads fleet vessel profiles configured with compatible fuel options.
        """
        fleet_file = self._data_dir / fleet_file_name
        if not fleet_file.exists():
            return {}

        records = load_csv_records(fleet_file)
        vessels: Dict[str, Vessel] = {}

        for row in records:
            v_id = row["id"].strip()
            name = row["name"].strip()
            v_type = row["type"].strip()
            capacity = float(row["capacity_tonnes"])
            min_speed = float(row["min_speed_knots"])
            max_speed = float(row["max_speed_knots"])
            power = float(row["engine_power_kw"])
            draft = float(row["design_draft_m"])

            raw_fuels = row.get("fuel_options", "")
            fuel_opts = [f.strip().upper() for f in raw_fuels.split(",") if f.strip()]

            vessel = Vessel(
                id=v_id,
                name=name,
                type=v_type,
                capacity_tonnes=capacity,
                min_speed_knots=min_speed,
                max_speed_knots=max_speed,
                engine_power_kw=power,
                design_draft_m=draft,
                fuel_options=fuel_opts
            )
            vessels[vessel.id] = vessel

        return vessels
