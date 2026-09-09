from abc import ABC, abstractmethod
from typing import Tuple, Dict, Any, Optional
from backend.app.models.vessel import Vessel
from backend.app.models.fuel import Fuel
from backend.app.models.weather import WeatherCondition
from backend.app.models.fuel_intelligence import FuelConsumptionBreakdown

class FuelConsumptionModelBase(ABC):
    """
    Abstract Port for Fuel Consumption Estimation.
    Allows seamlessly swapping the prototype demo heuristic model with
    future machine-learning or hydrodynamic polynomial models without changing client code.
    """

    @abstractmethod
    def calculate_consumption(
        self,
        vessel: Vessel,
        fuel: Fuel,
        distance_nm: float,
        speed_knots: float,
        cargo_weight: float,
        weather: WeatherCondition | None = None
    ) -> float:
        """
        Calculates total fuel consumption in metric tons.
        
        :param vessel: Target vessel specifications.
        :param fuel: Selected bunker fuel type.
        :param distance_nm: Nautical miles to transit.
        :param speed_knots: Sailing speed in knots.
        :param cargo_weight: Current payload in metric tons.
        :param weather: Atmospheric/oceanic condition modifiers.
        :return: Metric tons of fuel consumed.
        """
        pass

    @abstractmethod
    def calculate_consumption_breakdown(
        self,
        vessel: Vessel,
        fuel: Fuel,
        distance_nm: float,
        speed_knots: float,
        cargo_weight_tonnes: float,
        sea_state: int = 2
    ) -> Tuple[float, float, float, FuelConsumptionBreakdown]:
        """
        Calculates hourly rate, travel time, and total fuel consumption with computational breakdown.
        
        :return: Tuple of (hourly_rate_tonnes, travel_time_hours, total_fuel_tonnes, breakdown)
        """
        pass
