import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import RFB from '@novnc/novnc/lib/rfb';
import { MousePointer, MousePointerClick } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

interface VNCScreenProps {
  vncReady: boolean;
}

const VNCScreen: React.FC<VNCScreenProps> = ({ vncReady }) => {
  const vncContainerRef = useRef<HTMLDivElement>(null);
  const rfbRef = useRef<RFB | null>(null);
  const [viewOnly, setViewOnly] = useState(true);

  useEffect(() => {
    if (!vncContainerRef.current || !vncReady) return;

    console.log('Attempting VNC connection...');

    // Use noVNC's websockify URL format
    const wsUrl = `ws://${window.location.hostname}:5900/websockify`;
    console.log('Connecting to:', wsUrl);

    try {
      const rfb = new RFB(vncContainerRef.current, wsUrl);
      rfbRef.current = rfb;

      rfb.scaleViewport = true;
      rfb.resizeSession = true;
      rfb.viewOnly = viewOnly;

      rfb.addEventListener('connect', () => {
        console.log('Connected to VNC');
        setViewOnly(true);
      });

      rfb.addEventListener('disconnect', () => {
        console.log('Disconnected from VNC');
      });

      rfb.addEventListener('credentialsrequired', () => {
        console.log('VNC credentials required');
      });

      // Handle container resizing
      const resizeObserver = new ResizeObserver(() => {
        if (rfb && vncContainerRef.current) {
          rfb.scaleViewport = false;
          rfb.scaleViewport = true;
        }
      });

      if (vncContainerRef.current) {
        resizeObserver.observe(vncContainerRef.current);
      }

      return () => {
        resizeObserver.disconnect();
        rfb.disconnect();
        rfbRef.current = null;
      };
    } catch (error) {
      console.error('Failed to connect to VNC:', error);
    }
  }, [vncReady]);

  const toggleViewOnly = () => {
    if (rfbRef.current) {
      setViewOnly((prev) => {
        rfbRef.current!.viewOnly = !prev;
        return !prev;
      });
    }
  };

  return (
    <Card className={cn('flex flex-col h-full w-full')}>
      <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between">
        <CardTitle>VNC Screen</CardTitle>
        <Button
          variant="outline"
          size="icon"
          onClick={toggleViewOnly}
          title={viewOnly ? 'Enable Input' : 'Disable Input'}
        >
          {viewOnly ? (
            <MousePointer className="h-4 w-4" />
          ) : (
            <MousePointerClick className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>
      <CardContent className={cn('flex-grow relative overflow-hidden bg-gray-200')}>
        <div ref={vncContainerRef} className="absolute inset-0" />
      </CardContent>
    </Card>
  );
};

export default VNCScreen;
