export interface HealthStatus {
  status: string;
  timestamp: string;
  service: string;
  version: string;
  environment: string;
  phase: string;
  demo_mode: {
    use_demo_data: boolean;
    use_demo_optimizer: boolean;
  };
  interfaces: Record<string, string>;
}

export interface PipelineStage {
  order: number;
  name: string;
  status: string;
}

export interface PipelineMeta {
  project: string;
  phase: string;
  pipeline: PipelineStage[];
}
