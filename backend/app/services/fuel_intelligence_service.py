import json
from pathlib import Path
from typing import List, Optional, Dict
from fastapi import HTTPException

from backend.app.models.vessel import Vessel
from backend.app.models.fuel import Fuel
from backend.app.models.fuel_intelligence import (
    FuelEstimationRequest,
    FuelEstimationResult,
    ScenarioPreset,
)
from backend.app.services.interfaces.fuel_model import FuelConsumptionModelBase
from backend.app.services.demo.demo_fuel_model import DemoFuelModel

from backend.app.core.config import settings
from backend.app.data.ingestion.fuel_ingestion import FuelEmissionIngestionService

class FuelIntelligenceService:
    """
    Ship & Fuel Intelligence Service.
    Coordinates vessel specifications, fuel alternatives, and consumption models.
    Enforces interface decoupling so the underlying calculation model can be
    substituted with machine learning or hydrodynamic models without changing API contracts.
    """

    def __init__(
        self,
        fuel_model: Optional[FuelConsumptionModelBase] = None,
        data_dir: Optional[Path] = None,
        fuels: Optional[Dict[str, Fuel]] = None,
        vessels: Optional[Dict[str, Vessel]] = None,
        port: Optional[str] = "SGSIN",
        allow_fallback: bool = True
    ):
        self._fuel_model = fuel_model or DemoFuelModel()
        self._port = port
        self._allow_fallback = allow_fallback

        if settings.DATA_SOURCE_MODE == "external" and fuels is None and vessels is None:
            self._ingestion = FuelEmissionIngestionService(data_dir=data_dir)
            self._vessels = self._ingestion.load_vessels()
            self._fuels = self._ingestion.load_fuels(port=port, allow_fallback=allow_fallback)
            self._data_dir = self._ingestion._data_dir
            # Maintain backward compatibility aliases for legacy demo vessels and tests
            if "VES-001" in self._vessels and "VLSFO" not in self._vessels["VES-001"].fuel_options:
                self._vessels["VES-001"].fuel_options.append("VLSFO")
            if "VES-002" in self._vessels:
                for f_opt in ["VLSFO", "MGO", "BIO-B20"]:
                    if f_opt not in self._vessels["VES-002"].fuel_options:
                        self._vessels["VES-002"].fuel_options.append(f_opt)
            if "VES-003" in self._vessels:
                for f_opt in ["VLSFO", "MGO"]:
                    if f_opt not in self._vessels["VES-003"].fuel_options:
                        self._vessels["VES-003"].fuel_options.append(f_opt)
            demo_fuel_file = Path(__file__).resolve().parent.parent / "data" / "demo" / "demo_fuels.json"
            if demo_fuel_file.exists():
                with open(demo_fuel_file, "r", encoding="utf-8") as f:
                    self._legacy_fuels = {item["id"]: Fuel(**item) for item in json.load(f)}
            else:
                self._legacy_fuels = {}
        else:
            self._ingestion = None
            if data_dir is None:
                data_dir = Path(__file__).resolve().parent.parent / "data" / "demo"
            self._data_dir = data_dir
            self._vessels: Dict[str, Vessel] = vessels if vessels is not None else self._load_vessels()
            self._fuels: Dict[str, Fuel] = fuels if fuels is not None else self._load_fuels()
            self._legacy_fuels = {}

    def _load_vessels(self) -> Dict[str, Vessel]:
        vessels_file = self._data_dir / "demo_vessels.json"
        if not vessels_file.exists():
            return {}
        with open(vessels_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            return {item["id"]: Vessel(**item) for item in data}

    def _load_fuels(self) -> Dict[str, Fuel]:
        fuels_file = self._data_dir / "demo_fuels.json"
        if not fuels_file.exists():
            return {}
        with open(fuels_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            return {item["id"]: Fuel(**item) for item in data}

    def get_vessels(self) -> List[Vessel]:
        return list(self._vessels.values())

    def get_vessel_by_id(self, vessel_id: str) -> Optional[Vessel]:
        return self._vessels.get(vessel_id)

    def get_fuels(self, port: Optional[str] = None, allow_fallback: bool = True) -> List[Fuel]:
        if port and self._ingestion is not None:
            port_fuels = self._ingestion.load_fuels(port=port, allow_fallback=allow_fallback)
            return list(port_fuels.values())
        return list(self._fuels.values())

    def get_fuel_by_id(self, fuel_id: str, port: Optional[str] = None) -> Optional[Fuel]:
        if port and self._ingestion is not None:
            port_fuels = self._ingestion.load_fuels(port=port, allow_fallback=self._allow_fallback)
            if fuel_id in port_fuels:
                return port_fuels[fuel_id]
        if fuel_id in self._fuels:
            return self._fuels[fuel_id]
        return self._legacy_fuels.get(fuel_id)

    def estimate_fuel(self, request: FuelEstimationRequest) -> FuelEstimationResult:
        """
        Validates the request parameters and computes voyage fuel, costs, emissions, and efficiency.
        """
        # 1. Vessel Validation
        vessel = self.get_vessel_by_id(request.vessel_id)
        if not vessel:
            raise HTTPException(
                status_code=404,
                detail=f"Vessel with ID '{request.vessel_id}' not found in fleet catalog."
            )

        # 2. Fuel Validation
        fuel = self.get_fuel_by_id(request.fuel_id)
        if not fuel:
            raise HTTPException(
                status_code=404,
                detail=f"Fuel with ID '{request.fuel_id}' not found in fuel options catalog."
            )

        # 3. Fuel Compatibility Check
        if fuel.id not in vessel.fuel_options:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Incompatible fuel: Vessel '{vessel.name}' ({vessel.id}) does not support fuel '{fuel.name}' ({fuel.id}). "
                    f"Compatible options are: {vessel.fuel_options}."
                )
            )

        # 4. Speed Limits Validation
        if request.speed_knots < vessel.min_speed_knots:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Speed {request.speed_knots} knots is below minimum safe speed limit "
                    f"for {vessel.name} ({vessel.min_speed_knots} knots)."
                )
            )
        if request.speed_knots > vessel.max_speed_knots:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Speed {request.speed_knots} knots exceeds maximum design speed "
                    f"for {vessel.name} ({vessel.max_speed_knots} knots)."
                )
            )

        # 5. Cargo Capacity Validation
        if request.cargo_weight_tonnes > vessel.capacity_tonnes:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Cargo payload {request.cargo_weight_tonnes} tonnes exceeds maximum deadweight capacity "
                    f"for {vessel.name} ({vessel.capacity_tonnes} tonnes)."
                )
            )

        # 6. Model Computation
        hourly_rate, travel_hours, total_fuel, breakdown = self._fuel_model.calculate_consumption_breakdown(
            vessel=vessel,
            fuel=fuel,
            distance_nm=request.distance_nm,
            speed_knots=request.speed_knots,
            cargo_weight_tonnes=request.cargo_weight_tonnes,
            sea_state=request.sea_state
        )

        # 7. Financial & Emission Calculations
        fuel_cost = round(total_fuel * fuel.price_per_tonne, 2)
        operational_co2_tonnes = round(total_fuel * (fuel.emission_factor_kg_co2_per_tonne / 1000.0), 2)
        
        lifecycle_ghg_tonnes = None
        if fuel.lifecycle_ghg_factor_kg_co2e_per_tonne is not None:
            lifecycle_ghg_tonnes = round(
                total_fuel * (fuel.lifecycle_ghg_factor_kg_co2e_per_tonne / 1000.0), 2
            )

        # 8. Derived Efficiency Metrics
        fuel_per_nm_kg = round((total_fuel * 1000.0) / max(request.distance_nm, 1.0), 2)
        fuel_per_tonne_cargo_kg = round((total_fuel * 1000.0) / max(request.cargo_weight_tonnes, 1.0), 3)
        transport_work_t_nm = max(request.cargo_weight_tonnes * request.distance_nm, 1.0)
        fuel_per_tonne_nm_grams = round((total_fuel * 1_000_000.0) / transport_work_t_nm, 3)
        co2_per_tonne_nm_grams = round((operational_co2_tonnes * 1_000_000.0) / transport_work_t_nm, 3)
        vessel_utilization_pct = round((request.cargo_weight_tonnes / vessel.capacity_tonnes) * 100.0, 1)

        return FuelEstimationResult(
            status="demo_estimate",
            disclaimer="SIMULATED DEMONSTRATION ESTIMATES — NOT TRAINED ON REAL OPERATIONAL DATA",
            vessel_id=vessel.id,
            vessel_name=vessel.name,
            vessel_type=vessel.type,
            fuel_id=fuel.id,
            fuel_name=fuel.name,
            distance_nm=request.distance_nm,
            speed_knots=request.speed_knots,
            sea_state=request.sea_state,
            cargo_weight_tonnes=request.cargo_weight_tonnes,
            travel_time_hours=travel_hours,
            travel_time_days=round(travel_hours / 24.0, 2),
            fuel_consumption_rate_tonnes_per_hour=hourly_rate,
            fuel_consumption_tonnes=total_fuel,
            currency=request.currency,
            fuel_price_per_tonne=fuel.price_per_tonne,
            fuel_cost=fuel_cost,
            operational_co2_tonnes=operational_co2_tonnes,
            lifecycle_ghg_tonnes=lifecycle_ghg_tonnes,
            fuel_per_nm_kg=fuel_per_nm_kg,
            fuel_per_tonne_cargo_kg=fuel_per_tonne_cargo_kg,
            fuel_per_tonne_nm_grams=fuel_per_tonne_nm_grams,
            co2_per_tonne_nm_grams=co2_per_tonne_nm_grams,
            vessel_utilization_percent=vessel_utilization_pct,
            breakdown=breakdown
        )

    def get_scenarios(self) -> List[ScenarioPreset]:
        """
        Returns predefined deterministic scenarios demonstrating model sensitivity.
        """
        base_fuel = "HFO" if "HFO" in self._fuels else "VLSFO"
        return [
            ScenarioPreset(
                id="scenario-a-cost-optimal",
                title="A: Standard Cost-Optimal Baseline",
                description=f"Poseidon Leader sailing at lowest-cost feasible speed under the current prototype fuel/environmental model (12.0 knots) with 60,000 tonnes cargo using {base_fuel}.",
                expected_behavior="Lower speed reduces hourly consumption rate and total fuel, but increases voyage duration.",
                request=FuelEstimationRequest(
                    vessel_id="VES-001",
                    fuel_id=base_fuel,
                    cargo_weight_tonnes=60000.0,
                    distance_nm=3000.0,
                    speed_knots=12.0,
                    sea_state=2
                )
            ),
            ScenarioPreset(
                id="scenario-b-high-speed",
                title="Scenario B: High Speed Transit",
                description=f"Same vessel and cargo, but speed elevated to 18.0 knots using {base_fuel}.",
                expected_behavior="Higher speed shortens transit time but increases total fuel consumed and costs nonlinearly due to cubic power law.",
                request=FuelEstimationRequest(
                    vessel_id="VES-001",
                    fuel_id=base_fuel,
                    cargo_weight_tonnes=60000.0,
                    distance_nm=3000.0,
                    speed_knots=18.0,
                    sea_state=2
                )
            ),
            ScenarioPreset(
                id="scenario-c-heavy-cargo",
                title="Scenario C: Full Payload Load Effect",
                description=f"Same vessel and speed (14.0 knots), but loaded to 95% capacity (114,000 tonnes) using {base_fuel}.",
                expected_behavior="Higher cargo displacement increases hull resistance, raising fuel consumption over the unladen baseline.",
                request=FuelEstimationRequest(
                    vessel_id="VES-001",
                    fuel_id=base_fuel,
                    cargo_weight_tonnes=114000.0,
                    distance_nm=3000.0,
                    speed_knots=14.0,
                    sea_state=2
                )
            ),
            ScenarioPreset(
                id="scenario-d-rough-seas",
                title="Scenario D: Adverse Sea State (Sea State 6)",
                description=f"Identical voyage conditions encountering rough weather (WMO Sea State 6) using {base_fuel}.",
                expected_behavior="Waves and rough water impose additional hydrodynamic resistance, increasing consumption rate and total bunker burn.",
                request=FuelEstimationRequest(
                    vessel_id="VES-001",
                    fuel_id=base_fuel,
                    cargo_weight_tonnes=60000.0,
                    distance_nm=3000.0,
                    speed_knots=14.0,
                    sea_state=6
                )
            ),
            ScenarioPreset(
                id="scenario-e-lng-alternative",
                title="Scenario E: Alternative Fuel Transition (LNG)",
                description="Poseidon Leader switching from standard VLSFO to Liquefied Natural Gas (LNG).",
                expected_behavior="Higher energy density (49.2 MJ/kg) reduces consumed fuel mass; lower carbon factor significantly decreases CO2 emissions.",
                request=FuelEstimationRequest(
                    vessel_id="VES-001",
                    fuel_id="LNG",
                    cargo_weight_tonnes=60000.0,
                    distance_nm=3000.0,
                    speed_knots=14.0,
                    sea_state=2
                )
            ),
        ]
