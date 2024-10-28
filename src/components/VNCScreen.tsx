'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import RFB from '@novnc/novnc/lib/rfb';
import { Copy, MousePointer, MousePointerClick } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

interface VNCScreenProps {
  vncReady: boolean;
}

const VNCScreen: React.FC<VNCScreenProps> = ({ vncReady }) => {
  const vncContainerRef = useRef<HTMLDivElement>(null);
  const rfbRef = useRef<RFB | null>(null);
  const [viewOnly, setViewOnly] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined' || !vncContainerRef.current || !vncReady) return;

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
      return;
    }
  }, [vncReady, viewOnly]);

  const toggleViewOnly = () => {
    if (rfbRef.current) {
      setViewOnly((prev) => {
        rfbRef.current!.viewOnly = !prev;
        return !prev;
      });
    }
  };

  const handleCopyScreen = async () => {
    try {
      if (!rfbRef.current) return;

      const imageData = rfbRef.current.getImageData();
      const canvas = document.createElement('canvas');
      canvas.width = imageData.width;
      canvas.height = imageData.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.putImageData(imageData, 0, 0);
      const dataUrl = canvas.toDataURL();

      await navigator.clipboard.writeText(
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            screenshot: dataUrl,
            viewOnly: viewOnly,
          },
          null,
          2
        )
      );

      toast({
        title: 'Success',
        description: 'Screen data copied to clipboard',
      });
    } catch (error) {
      console.error('Failed to copy screen data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to copy screen data',
      });
    }
  };

  return (
    <Card className={cn('flex flex-col h-full w-full relative')}>
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
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-background/80 backdrop-blur-sm border-t">
        <Button
          variant="ghost"
          size="sm"
          className="w-full flex items-center gap-2 text-xs"
          onClick={handleCopyScreen}
        >
          <Copy className="h-3 w-3" />
          Copy Screen Data
        </Button>
      </div>
    </Card>
  );
};

export default VNCScreen;
