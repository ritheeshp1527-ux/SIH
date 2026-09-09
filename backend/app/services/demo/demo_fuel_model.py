from typing import Tuple, Optional
from backend.app.services.interfaces.fuel_model import FuelConsumptionModelBase
from backend.app.models.vessel import Vessel
from backend.app.models.fuel import Fuel
from backend.app.models.weather import WeatherCondition
from backend.app.models.fuel_intelligence import FuelConsumptionBreakdown

class DemoFuelModel(FuelConsumptionModelBase):
    """
    Simulated/Demo Fuel Consumption Model.
    
    DISCLAIMER:
    This is a deterministic heuristic for Phase 1 prototype demonstration.
    Values are SIMULATED DEMONSTRATION ESTIMATES — NOT TRAINED ON REAL OPERATIONAL DATA.
    It serves as the computational contract that will be replaced by a machine-learned
    or hydrodynamic polynomial model (RealFuelModel) in future phases.

    ================================================================================
    DEMO PARAMETERS — TO BE REPLACED/CALIBRATED IN REAL IMPLEMENTATION:
    - REFERENCE_SPEED_KNOTS = 14.0
      Baseline reference speed around which engine specific fuel consumption is normalized.
    - SPECIFIC_FUEL_CONSUMPTION_TONNES_PER_KW_H = 0.000185
      Approximate marine two-stroke diesel SFOC of 185 g/kWh converted to metric tons/kWh.
    - SPEED_EXPONENT = 3.0
      Admiralty law cubic relationship between sailing speed and propulsion power.
    - TARE_LOAD_RATIO = 0.65
      Lightship/ballast displacement fraction (unladen hull resistance factor).
    - FULL_LOAD_MARGIN = 0.35
      Displacement scaling from lightship (0.65) to full payload (1.00).
    - SEA_STATE_RESISTANCE_PER_GRADE = 0.035
      3.5% added hydrodynamic resistance per WMO sea state grade above calm (Sea State 2).
    - REFERENCE_ENERGY_DENSITY_MJ_PER_KG = 41.2
      Standard VLSFO Lower Heating Value (LHV) reference energy content.
    ================================================================================
    """

    REFERENCE_SPEED_KNOTS: float = 14.0
    SPECIFIC_FUEL_CONSUMPTION_TONNES_PER_KW_H: float = 0.000185
    SPEED_EXPONENT: float = 3.0
    TARE_LOAD_RATIO: float = 0.65
    FULL_LOAD_MARGIN: float = 0.35
    SEA_STATE_RESISTANCE_PER_GRADE: float = 0.035
    REFERENCE_ENERGY_DENSITY_MJ_PER_KG: float = 41.2

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
        
        :return: (hourly_rate_tonnes, travel_time_hours, total_fuel_tonnes, breakdown)
        """
        if speed_knots <= 0 or distance_nm <= 0:
            return 0.0, 0.0, 0.0, FuelConsumptionBreakdown(
                base_hourly_rate_tonnes=0.0,
                speed_factor=0.0,
                load_factor=0.0,
                weather_factor=0.0,
                fuel_energy_factor=0.0
            )

        # 1. Travel Time (Hours)
        travel_time_hours = round(distance_nm / speed_knots, 2)

        # 2. Base engine hourly consumption at reference speed (14 knots)
        # Using installed engine power and nominal specific fuel consumption
        base_hourly_rate = vessel.engine_power_kw * self.SPECIFIC_FUEL_CONSUMPTION_TONNES_PER_KW_H

        # 3. Speed Factor: Nonlinear cubic power curve (v / v_ref)^3
        speed_ratio = speed_knots / self.REFERENCE_SPEED_KNOTS
        speed_factor = speed_ratio ** self.SPEED_EXPONENT

        # 4. Load Factor: Displacement increase based on cargo utilization
        capacity = max(vessel.capacity_tonnes, 1.0)
        utilization_ratio = min(1.0, max(0.0, cargo_weight_tonnes / capacity))
        load_factor = self.TARE_LOAD_RATIO + (self.FULL_LOAD_MARGIN * utilization_ratio)

        # 5. Weather Factor: Sea State hydrodynamic resistance
        # Sea states <= 2 are considered calm / negligible added resistance
        weather_penalty = max(0, sea_state - 2) * self.SEA_STATE_RESISTANCE_PER_GRADE
        weather_factor = 1.0 + weather_penalty

        # 6. Fuel Energy Density Normalization (MJ/kg)
        # Fuels with higher energy density (e.g. LNG at 49.2 MJ/kg) require lower mass
        energy_density = max(fuel.energy_density_mj_per_kg, 1.0)
        fuel_energy_factor = self.REFERENCE_ENERGY_DENSITY_MJ_PER_KG / energy_density

        # Hourly Consumption Rate (tonnes/hour)
        hourly_rate = (
            base_hourly_rate *
            speed_factor *
            load_factor *
            weather_factor *
            fuel_energy_factor
        )

        # Total Voyage Consumption (tonnes/voyage) = Rate (t/h) * Travel Time (h)
        total_fuel = hourly_rate * travel_time_hours

        breakdown = FuelConsumptionBreakdown(
            base_hourly_rate_tonnes=round(base_hourly_rate, 4),
            speed_factor=round(speed_factor, 4),
            load_factor=round(load_factor, 4),
            weather_factor=round(weather_factor, 4),
            fuel_energy_factor=round(fuel_energy_factor, 4)
        )

        return (
            round(hourly_rate, 3),
            round(travel_time_hours, 2),
            round(total_fuel, 2),
            breakdown
        )

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
        Legacy/simplified method returning total fuel consumed in metric tons.
        """
        sea_state = weather.sea_state if weather else 2
        _, _, total_fuel, _ = self.calculate_consumption_breakdown(
            vessel=vessel,
            fuel=fuel,
            distance_nm=distance_nm,
            speed_knots=speed_knots,
            cargo_weight_tonnes=cargo_weight,
            sea_state=sea_state
        )
        return total_fuel
