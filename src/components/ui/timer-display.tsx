import React from 'react';
import { cn } from '@/lib/utils';
import { Timer, AlertTriangle } from 'lucide-react';

interface TimerDisplayProps {
  remainingTime: number;
  formatTime: (seconds: number) => string;
  className?: string;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({
  remainingTime,
  formatTime,
  className
}) => {
  const isWarning = remainingTime <= 300 && remainingTime > 0; // Últimos 5 minutos
  const isExpired = remainingTime <= 0;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-3">
        <Timer className="h-6 w-6 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">
          Tempo Restante
        </h3>
      </div>
      
      <div className={cn(
        "p-6 rounded-xl border text-center transition-all",
        isExpired && "border-destructive bg-destructive/5",
        isWarning && !isExpired && "border-warning bg-warning/5",
        !isWarning && !isExpired && "border-primary bg-primary/5"
      )}>
        <div className={cn(
          "text-6xl font-mono font-black tracking-wide mb-2",
          isExpired && "text-destructive",
          isWarning && !isExpired && "text-warning animate-pulse",
          !isWarning && !isExpired && "text-primary"
        )}>
          {formatTime(remainingTime)}
        </div>
        
        <div className="text-sm text-muted-foreground">
          {isExpired ? "Tempo esgotado" : "minutos restantes"}
        </div>
        
        {isWarning && !isExpired && (
          <div className="flex items-center justify-center gap-2 mt-3 text-warning">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">Últimos 5 minutos!</span>
          </div>
        )}
      </div>
    </div>
  );
};