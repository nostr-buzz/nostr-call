/**
 * Media Permission Error Component
 * Shows helpful error messages for camera/microphone access issues
 */

import { AlertCircle, Lock, Camera, Mic } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface MediaErrorProps {
  error: Error;
  onRetry?: () => void;
}

export function MediaError({ error, onRetry }: MediaErrorProps) {
  const errorMessage = error.message.toLowerCase();

  // Determine error type and provide helpful guidance
  const getErrorInfo = () => {
    if (errorMessage.includes('https') || errorMessage.includes('secure')) {
      return {
        icon: Lock,
        title: 'HTTPS Required',
        description: 'For security, camera/microphone access is only available over HTTPS.',
        solution: 'Please use HTTPS or localhost.',
        color: 'text-yellow-500',
      };
    }

    if (errorMessage.includes('permission') || errorMessage.includes('denied')) {
      return {
        icon: Camera,
        title: 'Permission Denied',
        description: 'You have not granted access to camera/microphone.',
        solution: 'Please enable camera and microphone access in your browser settings.',
        color: 'text-red-500',
      };
    }

    if (errorMessage.includes('not found')) {
      return {
        icon: Mic,
        title: 'Device Not Found',
        description: 'No camera or microphone was found.',
        solution: 'Please make sure the device is connected and enabled.',
        color: 'text-orange-500',
      };
    }

    if (errorMessage.includes('in use') || errorMessage.includes('readable')) {
      return {
        icon: Camera,
        title: 'Device In Use',
        description: 'Camera or microphone is being used by another application.',
        solution: 'Please close other applications and try again.',
        color: 'text-orange-500',
      };
    }

    if (errorMessage.includes('not supported')) {
      return {
        icon: AlertCircle,
        title: 'Browser Not Supported',
        description: 'Your browser does not support camera/microphone access.',
        solution: 'Please use a modern browser (Chrome, Safari 11+, Firefox).',
        color: 'text-red-500',
      };
    }

    return {
      icon: AlertCircle,
      title: 'Media Access Error',
      description: error.message,
      solution: 'Please try again or use a different browser.',
      color: 'text-red-500',
    };
  };

  const errorInfo = getErrorInfo();
  const Icon = errorInfo.icon;

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Alert variant="destructive" className="max-w-md">
        <Icon className={`h-5 w-5 ${errorInfo.color}`} />
        <AlertTitle className="text-lg font-semibold mt-2">
          {errorInfo.title}
        </AlertTitle>
        <AlertDescription className="space-y-4 mt-3">
          <p className="text-sm">{errorInfo.description}</p>
          
          <div className="bg-muted/50 p-3 rounded-md">
            <p className="text-sm font-medium mb-2">💡 Solution:</p>
            <p className="text-sm text-muted-foreground">{errorInfo.solution}</p>
          </div>

          {errorMessage.includes('https') && (
            <div className="bg-blue-500/10 p-3 rounded-md border border-blue-500/20">
              <p className="text-sm font-medium mb-2 text-blue-600 dark:text-blue-400">
                📱 For iOS Safari:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>You must use HTTPS</li>
                <li>Or use a tunnel (ngrok, localhost.run)</li>
                <li>Or set up an HTTPS server on your local network</li>
              </ul>
            </div>
          )}

          {onRetry && (
            <Button onClick={onRetry} className="w-full mt-4">
              Try Again
            </Button>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
}
