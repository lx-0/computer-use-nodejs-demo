'use client';

import ChatComponent from '@/components/chat/ChatComponent';
import Settings from '@/components/Settings';
import Splitter from '@/components/Splitter';
import { Toaster } from '@/components/ui/toaster';
import VNCScreen from '@/components/VNCScreen';
import { cn } from '@/lib/utils/style';
import React, { useCallback, useState } from 'react';

const Home: React.FC = () => {
  const [isLocalMode, setIsLocalMode] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [vncReady, setVncReady] = useState<boolean>(false);

  const toggleSettings = useCallback(() => {
    setIsSettingsOpen((prev) => !prev);
  }, []);

  const handleVncReady = useCallback((ready: boolean) => {
    setVncReady(ready);
  }, []);

  return (
    <div className={cn('flex h-screen')}>
      <Settings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <div className={cn('flex-grow')}>
        <Splitter
          leftPane={
            <ChatComponent
              isLocalMode={isLocalMode}
              setIsLocalMode={setIsLocalMode}
              isSettingsOpen={isSettingsOpen}
              toggleSettings={toggleSettings}
              onVncReady={handleVncReady}
            />
          }
          rightPane={!isLocalMode && <VNCScreen vncReady={vncReady} />}
          initialLeftWidth={400}
          minLeftWidth={300}
          maxLeftWidth={800}
        />
      </div>
      <Toaster />
    </div>
  );
};

export default Home;
