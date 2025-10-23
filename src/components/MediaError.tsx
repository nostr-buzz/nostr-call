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
        description: 'برای امنیت، دسترسی به دوربین/میکروفون فقط در HTTPS امکان‌پذیر است.',
        solution: 'لطفاً از HTTPS یا localhost استفاده کنید.',
        color: 'text-yellow-500',
      };
    }

    if (errorMessage.includes('permission') || errorMessage.includes('denied')) {
      return {
        icon: Camera,
        title: 'دسترسی رد شد',
        description: 'شما اجازه دسترسی به دوربین/میکروفون را نداده‌اید.',
        solution: 'لطفاً در تنظیمات مرورگر، دسترسی به دوربین و میکروفون را فعال کنید.',
        color: 'text-red-500',
      };
    }

    if (errorMessage.includes('not found')) {
      return {
        icon: Mic,
        title: 'دستگاه پیدا نشد',
        description: 'دوربین یا میکروفونی یافت نشد.',
        solution: 'لطفاً اطمینان حاصل کنید که دستگاه متصل و فعال است.',
        color: 'text-orange-500',
      };
    }

    if (errorMessage.includes('in use') || errorMessage.includes('readable')) {
      return {
        icon: Camera,
        title: 'دستگاه در حال استفاده',
        description: 'دوربین یا میکروفون توسط برنامه دیگری استفاده می‌شود.',
        solution: 'لطفاً برنامه‌های دیگر را ببندید و دوباره امتحان کنید.',
        color: 'text-orange-500',
      };
    }

    if (errorMessage.includes('not supported')) {
      return {
        icon: AlertCircle,
        title: 'مرورگر پشتیبانی نمی‌کند',
        description: 'مرورگر شما از دسترسی به دوربین/میکروفون پشتیبانی نمی‌کند.',
        solution: 'لطفاً از مرورگر مدرن (Chrome, Safari 11+, Firefox) استفاده کنید.',
        color: 'text-red-500',
      };
    }

    return {
      icon: AlertCircle,
      title: 'خطا در دسترسی به رسانه',
      description: error.message,
      solution: 'لطفاً دوباره امتحان کنید یا از مرورگر دیگری استفاده کنید.',
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
            <p className="text-sm font-medium mb-2">💡 راه‌حل:</p>
            <p className="text-sm text-muted-foreground">{errorInfo.solution}</p>
          </div>

          {errorMessage.includes('https') && (
            <div className="bg-blue-500/10 p-3 rounded-md border border-blue-500/20">
              <p className="text-sm font-medium mb-2 text-blue-600 dark:text-blue-400">
                📱 برای iOS Safari:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>باید از HTTPS استفاده کنید</li>
                <li>یا از تونل (ngrok, localhost.run) استفاده کنید</li>
                <li>یا در شبکه محلی با HTTPS سرور راه‌اندازی کنید</li>
              </ul>
            </div>
          )}

          {onRetry && (
            <Button onClick={onRetry} className="w-full mt-4">
              تلاش مجدد
            </Button>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
}
