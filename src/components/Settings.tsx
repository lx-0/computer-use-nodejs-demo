import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowLeftFromLine } from 'lucide-react';
import React, { useEffect, useRef } from 'react';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node) && isOpen) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  return (
    <Card
      ref={settingsRef}
      className={cn(
        'w-64 flex flex-col h-screen transition-all duration-300 ease-in-out absolute left-0 top-0 z-10',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      <CardHeader className="flex-shrink-0">
        <CardTitle>Settings</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-auto">
        {/* Add your settings options here */}
        <p>Settings content goes here</p>
      </CardContent>
      <div className="p-4 flex justify-end">
        <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10">
          <ArrowLeftFromLine className="h-6 w-6" />
          <span className="sr-only">Close Settings</span>
        </Button>
      </div>
    </Card>
  );
};

export default Settings;
