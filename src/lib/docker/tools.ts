import { CommandResult, ContainerManager, ImageBuilder, StatusMonitor, UserInput } from './types';

interface DockerTooling {
  containerManager: ContainerManager;
  imageBuilder: ImageBuilder;
  statusMonitor: StatusMonitor;

  executeCommand(cmd: string): Promise<CommandResult>;
  captureScreen(): Promise<Buffer>;
  sendInput(input: UserInput): Promise<void>;
}
