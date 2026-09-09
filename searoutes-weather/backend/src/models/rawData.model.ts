export interface RawSeaRoutesRoutingResponse {
  // Represents the basic structure we expect from SeaRoutes sea-route API
  type: string;
  features: Array<{
    type: string;
    properties: {
      distance: number;
      duration: number;
      [key: string]: any;
    };
    geometry: GeoJSON.LineString;
  }>;
}

export interface RawSeaRoutesWeatherResponse {
  // Represents the basic structure we expect from SeaRoutes weather/v2/track API
  data: Array<{
    lat: number;
    lon: number;
    time: number | string;
    windSpeed?: number;
    windDir?: number;
    waveHeight?: number;
    waveDir?: number;
    wavePeriod?: number;
    currentSpeed?: number;
    currentDir?: number;
    [key: string]: any;
  }>;
}
