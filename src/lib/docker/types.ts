export interface ContainerManager {
  start(options: ContainerOptions): Promise<void>;
  stop(containerId: string): Promise<void>;
  remove(containerId: string): Promise<void>;
}

export interface ImageBuilder {
  build(dockerfile: string, options: BuildOptions): Promise<void>;
  pull(image: string): Promise<void>;
}

export interface StatusMonitor {
  getStatus(containerId: string): Promise<ContainerStatus>;
  subscribe(containerId: string, callback: StatusCallback): () => void;
}

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface UserInput {
  type: 'keyboard' | 'mouse';
  data: KeyboardEvent | MouseEvent;
}

export interface ContainerOptions {
  image: string;
  ports?: Record<string, string>;
  env?: Record<string, string>;
}

export interface BuildOptions {
  tag: string;
  context: string;
  args?: Record<string, string>;
}

export interface ContainerStatus {
  id: string;
  state: 'running' | 'stopped' | 'error';
  details?: string;
  metrics?: ContainerMetrics;
}

export interface ContainerMetrics {
  cpu: number;
  memory: number;
  network: {
    rx: number;
    tx: number;
  };
}

export type StatusCallback = (status: ContainerStatus) => void;
