import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, CheckCircle, Timer } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ModernTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  chamado: string;
  currentLevel: number;
  remainingTime: number;
  formatTime: (seconds: number) => string;
  updateObservacao: (chamado: number, level: number, observacao: string) => boolean;
  updateStatusFinal: (chamado: number, status: string) => boolean;
  onNextLevel: (chamado: string, nextLevel: number, observacao: string) => Promise<boolean>;
  onPreviousLevel: (chamado: string, previousLevel: number, observacao: string) => Promise<boolean>;
}

const LEVEL_NAMES = {
  1: "Primeiro Acionamento",
  2: "1ª Escalação", 
  3: "2ª Escalação",
  4: "3ª Escalação",
  5: "4ª Escalação"
};

export const ModernTimerModal = ({
  isOpen,
  onClose,
  chamado,
  currentLevel,
  remainingTime,
  formatTime,
  updateObservacao,
  updateStatusFinal,
  onNextLevel,
  onPreviousLevel
}: ModernTimerModalProps) => {
  const [observacao, setObservacao] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleNextLevel = async () => {
    if (currentLevel >= 5) return;
    
    setIsLoading(true);
    try {
      const success = await onNextLevel(chamado, currentLevel + 1, observacao);
      if (success) {
        toast({
          title: "✅ Escalação Realizada",
          description: `Chamado ${chamado} escalado para ${LEVEL_NAMES[(currentLevel + 1) as keyof typeof LEVEL_NAMES]}`,
        });
        setObservacao('');
        onClose();
      }
    } catch (error) {
      toast({
        title: "❌ Erro na Escalação",
        description: "Não foi possível escalar o chamado",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviousLevel = async () => {
    if (currentLevel <= 1) return;
    
    setIsLoading(true);
    try {
      const success = await onPreviousLevel(chamado, currentLevel - 1, observacao);
      if (success) {
        toast({
          title: "✅ Nível Anterior",
          description: `Chamado ${chamado} retornado para ${LEVEL_NAMES[(currentLevel - 1) as keyof typeof LEVEL_NAMES]}`,
        });
        setObservacao('');
        onClose();
      }
    } catch (error) {
      toast({
        title: "❌ Erro ao Retornar",
        description: "Não foi possível retornar ao nível anterior",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalize = async () => {
    setIsLoading(true);
    try {
      // Salvar observação primeiro se houver
      if (observacao.trim()) {
        updateObservacao(parseInt(chamado), currentLevel, observacao.trim());
      }
      
      // Finalizar chamado
      const success = updateStatusFinal(parseInt(chamado), 'finalizado');
      
      if (success) {
        toast({
          title: "✅ Chamado Finalizado",
          description: `Chamado ${chamado} foi finalizado com sucesso`,
        });
        setObservacao('');
        onClose();
      }
    } catch (error) {
      toast({
        title: "❌ Erro ao Finalizar",
        description: "Não foi possível finalizar o chamado",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveObservacao = () => {
    if (observacao.trim()) {
      const success = updateObservacao(parseInt(chamado), currentLevel, observacao.trim());
      if (success) {
        toast({
          title: "✅ Observação Salva",
          description: `Observação do chamado ${chamado} foi salva`,
        });
        setObservacao('');
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl border-border bg-card shadow-modal">
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent flex items-center gap-3">
            <Timer className="h-6 w-6 text-timer-active animate-pulse" />
            Gerenciamento de Timer - Chamado {chamado}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Atual */}
          <div className="bg-accent/50 rounded-lg p-4 border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Badge className="bg-timer-active text-white px-3 py-1 text-sm font-semibold">
                  {LEVEL_NAMES[currentLevel as keyof typeof LEVEL_NAMES]}
                </Badge>
                <div className="text-3xl font-mono font-black text-timer-active tracking-wide">
                  {formatTime(remainingTime)}
                </div>
              </div>
              {remainingTime <= 300 && remainingTime > 0 && (
                <Badge variant="destructive" className="animate-pulse">
                  ⚠️ Últimos 5 minutos
                </Badge>
              )}
            </div>
          </div>

          {/* Observação */}
          <div className="space-y-3">
            <Label htmlFor="observacao" className="text-sm font-semibold text-foreground">
              📄 Observação para o Nível Atual
            </Label>
            <Textarea
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder={`Descreva as ações tomadas no ${LEVEL_NAMES[currentLevel as keyof typeof LEVEL_NAMES]}...`}
              rows={4}
              className="border-border focus:border-primary transition-colors resize-none"
            />
            <div className="text-xs text-muted-foreground">
              {observacao.length}/500 caracteres
            </div>
          </div>

          {/* Ações */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
            {/* Nível Anterior */}
            <Button
              variant="outline"
              onClick={handlePreviousLevel}
              disabled={currentLevel <= 1 || isLoading}
              className="flex-1"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Nível Anterior
            </Button>

            {/* Salvar Observação */}
            <Button
              variant="secondary"
              onClick={handleSaveObservacao}
              disabled={!observacao.trim() || isLoading}
              className="flex-1"
            >
              💾 Salvar Observação
            </Button>

            {/* Próximo Nível */}
            <Button
              variant="timer"
              onClick={handleNextLevel}
              disabled={currentLevel >= 5 || isLoading}
              className="flex-1"
            >
              Próximo Nível
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>

            {/* Finalizar */}
            <Button
              variant="success"
              onClick={handleFinalize}
              disabled={isLoading}
              className="flex-1"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Finalizar Chamado
            </Button>
          </div>

          {/* Botão Cancelar */}
          <div className="flex justify-center">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isLoading}
              className="px-8"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};