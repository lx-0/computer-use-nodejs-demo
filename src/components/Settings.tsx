import { LocalModels } from '@/components/llm/LocalModels';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ErrorBoundary } from 'react-error-boundary';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="p-4 text-red-500">
      <h3 className="font-medium">Error loading models</h3>
      <p className="text-sm">{error.message}</p>
    </div>
  );
}

export default function Settings({ isOpen, onClose }: SettingsProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription>Configure your local models and application settings.</SheetDescription>
        </SheetHeader>

        <div className="py-4 space-y-6">
          {/* Existing settings sections */}

          {/* Add Local Models section with error boundary */}
          <div className="border-t pt-4">
            <ErrorBoundary FallbackComponent={ErrorFallback}>
              <LocalModels />
            </ErrorBoundary>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
