# Backend Engine

## Fuel Model Data Handoff Contract

The backend exposes a clean, machine-readable data payload tailored specifically for the downstream Fuel Consumption ML model. This payload is provided under the `fuelModelInput` key in the API response when evaluating a voyage. It corresponds **only** to the selected primary candidate route.

### Route-Level Fields (Context)
* `sourcePort`: UN/LOCODE string
* `destinationPort`: UN/LOCODE string
* `routeId`: Unique UUID for this route evaluation
* `departureTime`: ISO-8601 string
* `estimatedArrivalTime`: ISO-8601 string
* `distanceNm`: Route distance in **nautical miles**
* `durationHours`: Route duration in **hours**
* `vesselSpeedKts`: Vessel speed constraint in **knots**
* `vesselDraftM`: Vessel draft constraint in **meters**
* `marineForecastHorizonDays`: Constrained to 8 days currently
* `marineCoverageRatio`: Ratio (0.0 to 1.0) indicating proportion of the route covered by valid marine data
* `weatherCoverageRatio`: Ratio (0.0 to 1.0) indicating proportion of the route covered by valid weather data
* `routeOptimizationScore`: Numerical score reflecting weather/efficiency ranking (lower is better)

### Environmental Fields (Array of Points)
The `environmentalPoints` array provides chronologically ordered observations along the route geometry, starting from departure to arrival.

* `latitude`: Decimal degrees
* `longitude`: Decimal degrees
* `timestamp`: ISO-8601 string
* `windSpeed`: Wind speed in **knots** (`null` if unavailable)
* `windDirection`: Wind direction in **degrees** (`null` if unavailable)
* `significantWaveHeight`: Wave height in **meters** (`null` if unavailable)
* `seaState`: WMO Sea State code [0-9] (`null` if unavailable)
* `oceanCurrentSpeed`: Ocean current velocity in **knots** (`null` if unavailable)
* `oceanCurrentDirection`: Ocean current direction in **degrees** (`null` if unavailable)
* `alongTrackCurrent`: Favorable/adverse current vector in **knots** (`null` if unavailable). Positive = favorable, Negative = adverse.
* `visibility`: Visibility in **meters** (Currently hardcoded to `null`)
* `stormFlag`: `true` if extreme weather is detected, otherwise `false` (`null` if unavailable)
* `weatherRiskLevel`: Enum `'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'` (`null` if unavailable)

### Unavailable Data Behavior
If an environmental parameter is unavailable (e.g. crossing beyond the 8-day marine forecast horizon), the value is preserved exactly as `null`. The backend **does not** fabricate, convert to zero, or guess unavailable environmental data.

> **Note:** Do NOT use `rawProviderData` for ML training. The `fuelModelInput` structure is the stable, deterministic boundary between the routing subsystem and the consumption models.
