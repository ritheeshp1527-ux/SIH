import json
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any
from backend.app.services.interfaces.weather_provider import WeatherProviderBase
from backend.app.models.weather import WeatherCondition
from backend.app.models.weather_intelligence import SegmentEnvironmentalCondition, WeatherScenarioPreset

class DemoWeatherProvider(WeatherProviderBase):
    """
    Simulated/Demo Weather Provider.
    Loads representative marine weather conditions from local mock seeds.
    Can be seamlessly substituted with live Copernicus or NOAA providers later.
    """

    def __init__(
        self,
        seed_file_path: Optional[Path] = None,
        segment_seed_file_path: Optional[Path] = None,
        scenario_seed_file_path: Optional[Path] = None
    ):
        base_dir = Path(__file__).resolve().parent.parent.parent / "data" / "demo"
        self._seed_file = seed_file_path or (base_dir / "demo_weather.json")
        self._segment_seed_file = segment_seed_file_path or (base_dir / "demo_segment_weather.json")
        self._scenario_seed_file = scenario_seed_file_path or (base_dir / "demo_weather_scenarios.json")

        self._conditions: List[WeatherCondition] = self._load_weather()
        self._segment_conditions: Dict[str, SegmentEnvironmentalCondition] = self._load_segment_weather()
        self._scenarios: Dict[str, Dict[str, Any]] = self._load_scenarios()

    def _load_weather(self) -> List[WeatherCondition]:
        if not self._seed_file.exists():
            return []
        with open(self._seed_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            return [WeatherCondition(**item) for item in data]

    def _load_segment_weather(self) -> Dict[str, SegmentEnvironmentalCondition]:
        if not self._segment_seed_file.exists():
            return {}
        with open(self._segment_seed_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            return {item["segment_id"]: SegmentEnvironmentalCondition(**item) for item in data}

    def _load_scenarios(self) -> Dict[str, Dict[str, Any]]:
        if not self._scenario_seed_file.exists():
            return {}
        with open(self._scenario_seed_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            return {item["id"]: item for item in data}

    def get_route_weather(self, route_id: str, start_time: datetime) -> List[WeatherCondition]:
        """
        Legacy mock conditions along the route for Phase 0 compatibility.
        """
        return self._conditions

    def _apply_scenario_override(
        self,
        base_condition: SegmentEnvironmentalCondition,
        scenario_id: Optional[str]
    ) -> SegmentEnvironmentalCondition:
        if not scenario_id or scenario_id not in self._scenarios:
            return base_condition.model_copy()

        scenario_raw = self._scenarios[scenario_id]
        overrides = scenario_raw.get("overrides", {}).get(base_condition.segment_id)
        if not overrides:
            return base_condition.model_copy()

        updated_dict = base_condition.model_dump()
        updated_dict.update(overrides)
        return SegmentEnvironmentalCondition(**updated_dict)

    def get_segment_condition(
        self,
        segment_id: str,
        scenario_id: Optional[str] = None
    ) -> Optional[SegmentEnvironmentalCondition]:
        base = self._segment_conditions.get(segment_id)
        if not base:
            return None
        return self._apply_scenario_override(base, scenario_id)

    def get_route_conditions(
        self,
        segment_ids: List[str],
        scenario_id: Optional[str] = None
    ) -> List[SegmentEnvironmentalCondition]:
        conditions = []
        for sid in segment_ids:
            cond = self.get_segment_condition(sid, scenario_id=scenario_id)
            if cond:
                conditions.append(cond)
        return conditions

    def get_all_segment_conditions(
        self,
        scenario_id: Optional[str] = None
    ) -> List[SegmentEnvironmentalCondition]:
        return [
            self._apply_scenario_override(cond, scenario_id)
            for cond in self._segment_conditions.values()
        ]

    def get_all_scenarios(self) -> List[WeatherScenarioPreset]:
        presets = []
        for s in self._scenarios.values():
            presets.append(
                WeatherScenarioPreset(
                    id=s["id"],
                    title=s["title"],
                    description=s["description"],
                    expected_behavior=s["expected_behavior"],
                    route_id=s["route_id"],
                    vessel_id=s["vessel_id"],
                    speed_knots=s["speed_knots"]
                )
            )
        return presets

    def get_scenario(self, scenario_id: str) -> Optional[WeatherScenarioPreset]:
        s = self._scenarios.get(scenario_id)
        if not s:
            return None
        return WeatherScenarioPreset(
            id=s["id"],
            title=s["title"],
            description=s["description"],
            expected_behavior=s["expected_behavior"],
            route_id=s["route_id"],
            vessel_id=s["vessel_id"],
            speed_knots=s["speed_knots"]
        )
