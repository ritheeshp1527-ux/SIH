from backend.app.services.interfaces import (
    FuelConsumptionModelBase,
    RouteProviderBase,
    WeatherProviderBase,
)
from backend.app.services.demo import (
    DemoFuelModel,
    DemoRouteProvider,
    DemoWeatherProvider,
)
from backend.app.services.fuel_intelligence_service import FuelIntelligenceService

__all__ = [
    "FuelConsumptionModelBase",
    "RouteProviderBase",
    "WeatherProviderBase",
    "DemoFuelModel",
    "DemoRouteProvider",
    "DemoWeatherProvider",
    "FuelIntelligenceService",
]
