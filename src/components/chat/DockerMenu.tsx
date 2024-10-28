import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { AlertCircle, Box, Copy, Loader2, Play, Power, PowerOff, Trash2 } from 'lucide-react';

interface DockerMenuProps {
  containerStatus: string | null;
  containerDetails: string | null;
  dockerfiles: string[];
  onStartContainer: (imageName: string, messageId?: string) => Promise<void>;
  onStopContainer: () => Promise<void>;
  onDeleteContainer: () => Promise<void>;
  onBuildImage: (dockerfile: string, messageId?: string) => Promise<{ success: boolean }>;
}

export const DockerMenu: React.FC<DockerMenuProps> = ({
  containerStatus,
  containerDetails,
  dockerfiles,
  onStartContainer,
  onStopContainer,
  onDeleteContainer,
  onBuildImage,
}) => {
  const copyDetails = () => {
    if (containerDetails) {
      navigator.clipboard.writeText(containerDetails).then(
        () => {
          toast({
            title: 'Copied',
            description: 'Container details copied to clipboard',
          });
        },
        (err) => {
          console.error('Failed to copy text: ', err);
          toast({
            title: 'Copy failed',
            description: 'Failed to copy container details',
            variant: 'destructive',
          });
        }
      );
    }
  };

  const getStatusIcon = () => {
    switch (containerStatus) {
      case 'running':
        return <Power className="h-4 w-4 text-green-500" />;
      case 'exited':
        return <PowerOff className="h-4 w-4 text-gray-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <PowerOff className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusDisplay = () => {
    if (!containerStatus) return 'No container';
    const details = containerDetails ? containerDetails.split('\n')[0] : '';
    return `Status: ${containerStatus}${details ? `\n${details}` : ''}`;
  };

  const handleBuildClick = async (dockerfile: string) => {
    const { success } = await onBuildImage(dockerfile);
    if (success) {
      toast({
        title: 'Build Started',
        description: 'Docker image build has been initiated',
      });
    }
  };

  const handleStartClick = async () => {
    await onStartContainer('default');
    toast({
      title: 'Container Starting',
      description: 'Docker container is being started',
    });
  };

  const handleStopClick = async () => {
    await onStopContainer();
    toast({
      title: 'Container Stopped',
      description: 'Docker container has been stopped',
    });
  };

  const handleDeleteClick = async () => {
    await onDeleteContainer();
    toast({
      title: 'Container Deleted',
      description: 'Docker container has been deleted',
    });
  };

  const isRunning = containerStatus === 'running';
  const isStopped = containerStatus === 'exited';
  const hasContainer = containerStatus !== null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          {getStatusIcon()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuLabel>Docker Control</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Show build options only when container is not running */}
        {!isRunning && (
          <>
            {dockerfiles.map((dockerfile) => (
              <DropdownMenuItem key={dockerfile} onClick={() => handleBuildClick(dockerfile)}>
                <Box className="mr-2 h-4 w-4 text-blue-500" />
                Build {dockerfile}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}

        {/* Show Start only when container is stopped or doesn't exist */}
        {!isRunning && (
          <DropdownMenuItem onClick={handleStartClick}>
            <Play className="mr-2 h-4 w-4 text-green-500" />
            Start Container
          </DropdownMenuItem>
        )}

        {/* Show Stop only when container is running */}
        {isRunning && (
          <DropdownMenuItem onClick={handleStopClick}>
            <PowerOff className="mr-2 h-4 w-4 text-yellow-500" />
            Stop Container
          </DropdownMenuItem>
        )}

        {/* Show Delete only when container exists and is not running */}
        {hasContainer && !isRunning && (
          <DropdownMenuItem onClick={handleDeleteClick}>
            <Trash2 className="mr-2 h-4 w-4 text-red-500" />
            Delete Container
          </DropdownMenuItem>
        )}

        {/* Show Copy Details only when container exists */}
        {hasContainer && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={copyDetails}>
              <Copy className="mr-2 h-4 w-4 text-gray-500" />
              Copy Details
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuLabel className="text-xs flex items-center gap-2">
          {isRunning && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
          {getStatusDisplay()}
        </DropdownMenuLabel>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
