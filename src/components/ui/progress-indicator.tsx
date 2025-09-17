import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, Clock, Users, Building2 } from 'lucide-react';

interface ProgressIndicatorProps {
  currentLevel: number;
  className?: string;
}

const LEVEL_INFO = {
  1: { title: "Primeiro Acionamento", icon: Clock, color: "blue" },
  2: { title: "1ª Escalação", icon: Users, color: "orange" },
  3: { title: "2ª Escalação", icon: Building2, color: "red" },
  4: { title: "3ª Escalação", icon: Users, color: "purple" },
  5: { title: "4ª Escalação", icon: Building2, color: "red" }
};

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentLevel,
  className
}) => {
  return (
    <div className={cn("space-y-4", className)}>
      <h3 className="text-lg font-semibold text-foreground">
        Progresso da Escalação
      </h3>
      
      <div className="space-y-3">
        {Object.entries(LEVEL_INFO).map(([level, info]) => {
          const levelNum = parseInt(level);
          const isActive = levelNum === currentLevel;
          const isCompleted = levelNum < currentLevel;
          const IconComponent = info.icon;
          
          return (
            <div
              key={level}
              className={cn(
                "flex items-center gap-4 p-3 rounded-lg border transition-all",
                isActive && "border-primary bg-primary/5",
                isCompleted && "border-success bg-success/5",
                !isActive && !isCompleted && "border-border bg-muted/30"
              )}
            >
              <div
                className={cn(
                  "p-2 rounded-full transition-all",
                  isActive && "bg-primary text-primary-foreground",
                  isCompleted && "bg-success text-success-foreground",
                  !isActive && !isCompleted && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <IconComponent className="h-5 w-5" />
                )}
              </div>
              
              <div className="flex-1">
                <div className={cn(
                  "font-medium",
                  isActive && "text-primary",
                  isCompleted && "text-success",
                  !isActive && !isCompleted && "text-muted-foreground"
                )}>
                  {info.title}
                </div>
                <div className="text-sm text-muted-foreground">
                  {isCompleted ? "Concluído" : isActive ? "Em andamento" : "Pendente"}
                </div>
              </div>
              
              {isActive && (
                <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};