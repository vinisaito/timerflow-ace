import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ProgressIndicator } from '@/components/ui/progress-indicator';
import { TimerDisplay } from '@/components/ui/timer-display';
import { ArrowRight, ArrowLeft, CheckCircle, X, AlertTriangle, Lightbulb, MessageSquare, Timer, Building2, Users, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ModernTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  chamado: number;
  currentLevel: number;
  remainingTime: number;
  chamadoData?: any;
  formatTime: (seconds: number) => string;
  onNextLevel: (chamado: number, level: number, observacao: string) => void;
  updateStatusFinal: (chamado: number, levelStatusKey: string, status: string) => void;
  updateObservacao: (chamado: number, level: number, observacao: string) => void;
}

const LEVEL_INFO = {
  1: {
    title: "Primeiro Acionamento",
    subtitle: "",
    nextAction: "Avançar para 1ª Escalação",
    icon: Clock,
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-500/5 border-blue-200",
    description: "Atendimento Inicial da Equipe"
  },
  2: {
    title: "1ª Escalação",
    subtitle: "",
    nextAction: "Avançar para 2ª Escalação", 
    icon: Users,
    color: "from-orange-500 to-orange-600",
    bgColor: "bg-orange-500/5 border-orange-200",
    description: "Acionamento do Gestor de Incidente ou Plantonista"
  },
  3: {
    title: "2ª Escalação",
    subtitle: "",
    nextAction: "Avançar para 3ª Escalação",
    icon: Building2,
    color: "from-red-500 to-red-600", 
    bgColor: "bg-red-500/5 border-red-200",
    description: "Acionamento do Coordenador"
  },
  4: {
    title: "3ª Escalação",
    subtitle: "",
    nextAction: "Avançar para 4ª Escalação",
    icon: Users,
    color: "from-purple-500 to-purple-600",
    bgColor: "bg-purple-500/5 border-purple-200", 
    description: "Acionamento do Gerente"
  },
  5: {
    title: "4ª Escalação",
    subtitle: "",
    nextAction: "Finalizar Chamado",
    icon: Building2,
    color: "from-red-600 to-red-700",
    bgColor: "bg-red-600/5 border-red-300",
    description: "Acionamento do Kleber Costa"
  }
};

export const ModernTimerModal: React.FC<ModernTimerModalProps> = ({
  isOpen,
  onClose,
  chamado,
  currentLevel,
  remainingTime,
  chamadoData,
  formatTime,
  onNextLevel,
  updateStatusFinal,
  updateObservacao
}) => {
  const [observacao, setObservacao] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const levelStatusKey = `level${currentLevel}_status`;
  const [finalizado, setFinalizado] = useState(
    chamadoData?.statusFinal === "finished" || chamadoData?.[levelStatusKey] === "finished"
  );

  React.useEffect(() => {
    setFinalizado(
      chamadoData?.statusFinal === "finished" || chamadoData?.[levelStatusKey] === "finished"
    );
  }, [chamadoData, levelStatusKey]);

  const levelInfo = finalizado
    ? { 
        title: "Chamado Finalizado", 
        subtitle: "Processo encerrado com sucesso",
        description: "O chamado foi resolvido e encerrado", 
        icon: CheckCircle,
        color: "from-success to-success/90", 
        bgColor: "bg-success/5 border-success/20",
        nextAction: "Finalizado" // Add this missing property
      }
    : LEVEL_INFO[currentLevel as keyof typeof LEVEL_INFO];

  const validateObservacao = useCallback(() => {
    if (!observacao.trim()) {
      toast({
        title: "⚠️ Observação Obrigatória",
        description: "É obrigatório preencher o campo de observações para continuar",
        variant: "destructive",
      });
      return false;
    }
    if (observacao.trim().length < 10) {
      toast({
        title: "⚠️ Observação Muito Curta",
        description: "A observação deve ter pelo menos 10 caracteres",
        variant: "destructive",
      });
      return false;
    }
    return true;
  }, [observacao]);

  const handleAction = useCallback(async (action: 'next' | 'finish') => {
    if (!validateObservacao()) return;

    setIsProcessing(true);

    try {
      const trimmedObservacao = observacao.trim();

      if (finalizado && action !== 'finish') {
        toast({
          title: "⚠️ Chamado já finalizado",
          description: "Não é possível alterar níveis pois o chamado está finalizado",
          variant: "destructive",
        });
        return;
      }

      switch (action) {
        case 'next':
          if (currentLevel >= 5) {
            await Promise.all([
              updateStatusFinal(chamado, levelStatusKey, "finished"),
              updateObservacao(chamado, currentLevel, trimmedObservacao)
            ]);
            toast({ 
              title: "✅ Chamado Finalizado", 
              description: `Chamado ${chamado} foi finalizado com sucesso!` 
            });
          } else {
            await updateStatusFinal(chamado, levelStatusKey, "finished");
            await updateObservacao(chamado, currentLevel, trimmedObservacao);
            await onNextLevel(chamado, currentLevel + 1, trimmedObservacao);

            const nextLevelInfo = LEVEL_INFO[(currentLevel + 1) as keyof typeof LEVEL_INFO];
            toast({
              title: `🚀 ${nextLevelInfo?.title} Iniciado`,
              description: `Timer de 20 minutos iniciado para ${nextLevelInfo?.title}`,
            });
          }
          break;

        case 'finish':
          await Promise.all([
            updateStatusFinal(chamado, levelStatusKey, "finished"),
            updateObservacao(chamado, currentLevel, trimmedObservacao)
          ]);
          setFinalizado(true);
          toast({
            title: "✅ Chamado Finalizado",
            description: `Chamado ${chamado} foi finalizado com sucesso!`,
          });
          break;
      }

      setObservacao('');
      onClose();

    } catch (error) {
      console.error("❌ Erro no handleAction:", error);
      toast({
        title: "❌ Erro na Operação",
        description: "Ocorreu um erro ao processar a ação. Verifique os logs.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [validateObservacao, observacao, currentLevel, chamado, onNextLevel, onClose, updateStatusFinal, updateObservacao, finalizado, levelStatusKey]);

  if (!levelInfo) return null;

  const LevelIcon = levelInfo.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl max-h-[95vh] overflow-y-auto border-border shadow-modal">
        {/* Header Section */}
        <DialogHeader className="relative pb-8">
          <div className={cn(
            "absolute inset-0 bg-gradient-to-r opacity-5 rounded-t-lg",
            levelInfo.color
          )} />

          <div className="relative z-10 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className={cn(
                  "p-4 rounded-2xl bg-gradient-to-r shadow-lg",
                  levelInfo.color,
                  "text-white"
                )}>
                  <LevelIcon className="h-10 w-10" />
                </div>

                <div className="space-y-2">
                  <DialogTitle className="text-3xl lg:text-4xl font-bold text-foreground">
                    {levelInfo.title}
                  </DialogTitle>
                  <p className="text-lg text-muted-foreground">
                    {levelInfo.subtitle}
                  </p>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-sm font-medium">
                      Chamado #{chamado}
                    </Badge>
                    <Badge 
                      variant={finalizado ? "default" : "secondary"}
                      className={cn(
                        "text-sm font-medium",
                        finalizado && "bg-success text-success-foreground"
                      )}
                    >
                      {finalizado ? "Finalizado" : "Em Andamento"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className={cn(
              "p-4 rounded-xl border-l-4",
              levelInfo.bgColor
            )}>
              <p className="text-sm text-muted-foreground">
                {levelInfo.description}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-8">
          {/* Timer and Progress Section */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <TimerDisplay 
              remainingTime={remainingTime} 
              formatTime={formatTime}
              className="w-full"
            />
            <ProgressIndicator 
              currentLevel={currentLevel}
              className="w-full"
            />
          </div>

          {/* Escalation History Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Clock className="h-6 w-6 text-primary" />
              <Label className="text-xl font-semibold text-foreground">
                Histórico de Escalações
              </Label>
            </div>

            <div className="bg-card rounded-xl border border-border p-6 max-h-64 overflow-y-auto">
              <div className="space-y-4">
                {Array.from({ length: currentLevel - 1 }, (_, index) => {
                  const level = index + 1;
                  const levelData = LEVEL_INFO[level as keyof typeof LEVEL_INFO];
                  const LevelIcon = levelData?.icon || Clock;

                  return (
                    <div key={level} className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg border border-border/50">
                      <div className={cn(
                        "p-2 rounded-lg bg-gradient-to-r text-white flex-shrink-0",
                        levelData?.color || "from-gray-500 to-gray-600"
                      )}>
                        <LevelIcon className="h-5 w-5" />
                      </div>

                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-foreground">
                            {levelData?.title || `Nível ${level}`}
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            Concluído
                          </Badge>
                        </div>

                        <p className="text-sm text-muted-foreground">
                          {levelData?.description || "Escalação processada"}
                        </p>

                        {/* Mock observation data - in real app, this would come from chamadoData */}
                        <div className="mt-3 p-3 bg-background/50 rounded-md border border-border/30">
                          {/* <p className="text-sm text-muted-foreground mb-1 font-medium">
                            Observações registradas:
                          </p>
                          <p className="text-sm text-foreground">
                            {chamadoData?.[`level${level}_observacao`] || 
                             `Escalação ${level} processada - análise técnica realizada e encaminhamento efetuado conforme procedimentos estabelecidos.`}

                          </p> */}
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>
                              {chamadoData?.[`level${level}_timestamp`] || 
                               `Finalizado em ${new Date(Date.now() - (currentLevel - level) * 20 * 60 * 1000).toLocaleString('pt-BR')}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {currentLevel === 1 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">
                      Nenhuma escalação anterior registrada.<br />
                      Este é o primeiro nível de atendimento.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Observations Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-6 w-6 text-primary" />
              <Label htmlFor="observacao" className="text-xl font-semibold text-foreground">
                Observações Técnicas
              </Label>
              <Badge variant="destructive" className="text-xs font-bold">
                OBRIGATÓRIO
              </Badge>
            </div>

            <Textarea
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder={`Descreva detalhadamente as ações de acionamento realizadas`}
              rows={8}
              className="border-2 focus:border-primary transition-all duration-200 resize-none text-base min-h-[120px]"
              disabled={isProcessing || finalizado}
              maxLength={1000}
            />

            <div className="flex justify-between items-center">
              <span className={cn(
                "text-sm font-medium",
                observacao.length > 900 ? "text-warning" : "text-muted-foreground"
              )}>
                {observacao.length}/1000 caracteres
              </span>
              {observacao.trim().length >= 10 && (
                <div className="flex items-center gap-2 text-success font-medium text-sm">
                  <CheckCircle className="h-4 w-4" />
                  <span>Observação válida</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Finish Button */}
              <Button
                variant="warning"
                size="xl"
                onClick={() => handleAction('finish')}
                disabled={!observacao.trim() || observacao.trim().length < 10 || isProcessing || finalizado}
                className="h-20"
              >
                <CheckCircle className="h-6 w-6 mr-3" />
                <div className="text-left">
                  <div className="font-semibold text-base">Resolver Agora</div>
                  <div className="text-sm opacity-90">Finalizar chamado</div>
                </div>
              </Button>

              {/* Next Level Button */}
              <Button
                variant={currentLevel >= 5 || finalizado ? "success" : "timer"}
                size="xl"
                onClick={() => handleAction('next')}
                disabled={!observacao.trim() || observacao.trim().length < 10 || isProcessing || finalizado}
                className="h-20 animate-glow"
              >
                {finalizado ? (
                  <>
                    <CheckCircle className="h-6 w-6 mr-3" />
                    <div className="text-left">
                      <div className="font-semibold text-base">Finalizado</div>
                      <div className="text-sm opacity-90">Chamado encerrado</div>
                    </div>
                  </>
                ) : currentLevel >= 5 ? (
                  <>
                    <CheckCircle className="h-6 w-6 mr-3" />
                    <div className="text-left">
                      <div className="font-semibold text-base">Concluir Final</div>
                      <div className="text-sm opacity-90">Última escalação</div>
                    </div>
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-6 w-6 mr-3" />
                    <div className="text-left">
                      <div className="font-semibold text-base">{levelInfo.nextAction}</div>
                      <div className="text-sm opacity-90">Avançar escalação</div>
                    </div>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Guidelines Section */}
          <div className="gradient-modal rounded-2xl p-6 border border-border/50">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Lightbulb className="h-6 w-6 text-primary" />
                <h4 className="font-semibold text-foreground text-xl">Diretrizes de Monitoração</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-semibold">Observações Obrigatórias</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Documente todas as ações realizadas, diagnósticos e próximos passos.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-primary">
                    <Timer className="h-5 w-5" />
                    <span className="font-semibold">Timer Renovado</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Cada escalação reinicia o timer de 20 minutos automaticamente.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-semibold">Resolução</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Use "Resolver Agora" quando o acionamento for confirmado.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-card p-6 rounded-2xl shadow-2xl border border-border">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  <span className="text-lg font-medium">Processando ação...</span>
                </div>
              </div>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
};