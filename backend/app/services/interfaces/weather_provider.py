from abc import ABC, abstractmethod
from datetime import datetime
from typing import List, Optional
from backend.app.models.weather import WeatherCondition
from backend.app.models.weather_intelligence import SegmentEnvironmentalCondition, WeatherScenarioPreset

class WeatherProviderBase(ABC):
    """
    Abstract Port for Weather and Oceanographic Conditions.
    Allows seamlessly swapping simulated weather conditions with
    real atmospheric APIs (e.g. Copernicus Marine, NOAA GFS/WaveWatch III).
    """

    @abstractmethod
    def get_route_weather(
        self,
        route_id: str,
        start_time: datetime
    ) -> List[WeatherCondition]:
        """
        Legacy mock conditions along route checkpoints (for Phase 0 compatibility).
        """
        pass

    @abstractmethod
    def get_segment_condition(
        self,
        segment_id: str,
        scenario_id: Optional[str] = None
    ) -> Optional[SegmentEnvironmentalCondition]:
        """
        Retrieves simulated environmental condition for a specific route segment.
        """
        pass

    @abstractmethod
    def get_route_conditions(
        self,
        segment_ids: List[str],
        scenario_id: Optional[str] = None
    ) -> List[SegmentEnvironmentalCondition]:
        """
        Retrieves simulated environmental conditions for an ordered sequence of segment IDs.
        """
        pass

    @abstractmethod
    def get_all_segment_conditions(
        self,
        scenario_id: Optional[str] = None
    ) -> List[SegmentEnvironmentalCondition]:
        """
        Retrieves all simulated segment environmental conditions.
        """
        pass

    @abstractmethod
    def get_all_scenarios(self) -> List[WeatherScenarioPreset]:
        """
        Retrieves available presentation weather scenarios.
        """
        pass

    @abstractmethod
    def get_scenario(self, scenario_id: str) -> Optional[WeatherScenarioPreset]:
        """
        Retrieves a single presentation weather scenario by ID.
        """
        pass
