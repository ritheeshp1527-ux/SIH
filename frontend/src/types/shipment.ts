export interface Shipment {
  source: string;
  destination: string;
  cargo_weight: number;
  deadline: string;
  priority?: 'standard' | 'green' | 'urgent';
  special_requirements?: string;
}
