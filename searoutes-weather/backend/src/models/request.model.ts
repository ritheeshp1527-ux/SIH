export interface VoyageRequest {
  sourcePort: string;       // UN/LOCODE
  destinationPort: string;  // UN/LOCODE
  sourceCoordinates?: [number, number]; // [lon, lat]
  destinationCoordinates?: [number, number]; // [lon, lat]
  departureTimestamp?: string; // ISO-8601
  vesselImo?: string;
  vesselDraft?: number;     // in meters
  vesselSpeed?: number;     // in knots
  avoidSeca?: boolean;
  avoidHra?: boolean;
  blockedAreas?: string;    // e.g. WKT polygon or array of coordinates
}
