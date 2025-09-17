import { useState, useMemo, useCallback } from 'react';
import { Check, AlertTriangle, Timer, Play, Pause, CheckCircle, Edit3, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useEffect } from 'react';

// WebSocket hook
import { useWebsocketTimers } from "@/hooks/useWebsocketTimers";

// Modern Timer Management Modal
import { ModernTimerModal } from '@/components/ActionTable/ModernTimerModal';

interface AlertData {
  id: string;
  chamado: string;
  tipo_chamado: string;
  grupo_chamado: string;
  status_chamado: string;
  abertura_chamado: string;
  resumo_chamado: string;
  severidade_chamado: string;
  acionado: string;
  chat: boolean;
}

interface ActionTableProps {
  alertData: AlertData[];
  onUpdateAcknowledgment: (alertId: string, acknowledged: boolean) => void;
  loading: boolean;
}

type SortField = keyof AlertData;
type SortDirection = 'asc' | 'desc' | null;

// Informações dos níveis de escalação
const LEVEL_NAMES = {
  1: "Primeiro Acionamento",
  2: "1ª Escalação",
  3: "2ª Escalação",
  4: "3ª Escalação",
  5: "4ª Escalação"
};

export const ActionTable = ({ alertData, onUpdateAcknowledgment, loading }: ActionTableProps) => {
  // Estados principais
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState<number>(5);
  const [sortField, setSortField] = useState<SortField>('chamado');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Estados dos modais
  const [observacaoDialogOpen, setObservacaoDialogOpen] = useState(false);
  const [timerManagementOpen, setTimerManagementOpen] = useState(false);
  const [selectedChamadoForEdit, setSelectedChamadoForEdit] = useState<string>('');
  const [selectedChamadoForTimer, setSelectedChamadoForTimer] = useState<string>('');
  const [observacaoText, setObservacaoText] = useState('');
  const [operadorText, setOperadorText] = useState('');

  // WebSocket
  const {
    timers,
    isConnected,
    startTimer,
    updateObservacao,
    updateOperador,
    updateStatusFinal,
    getRemainingTime,
    formatTime,
    isTimerActive,
    getState,
    setWatchedChamados
  } = useWebsocketTimers();

  // Primeiro registrar os chamados que queremos monitorar
  useEffect(() => {
    if (!alertData || alertData.length === 0) return;

    const chamadosNum = alertData.map(a => parseInt(a.chamado));
    setWatchedChamados(chamadosNum);

    // Forçar getState imediatamente
    chamadosNum.forEach(chamado => getState(chamado));
  }, [alertData, setWatchedChamados, getState]);

  // Estados locais para observações
  const [localObservacoes, setLocalObservacoes] = useState<Map<string, { observacao: string; operador: string }>>(new Map());

  // Funções utilitárias
  const formatDate = useCallback((dateString: string) => {
    if (!dateString || dateString === '' || dateString === 'null' || dateString === 'undefined') {
      return '-';
    }

    try {
      let date: Date;
      const cleanString = String(dateString).trim();

      if (/^\d{13}$/.test(cleanString)) {
        date = new Date(parseInt(cleanString));
      } else if (/^\d{10}$/.test(cleanString)) {
        date = new Date(parseInt(cleanString) * 1000);
      } else if (/^\d{2}\/\d{2}\/\d{4}/.test(cleanString)) {
        const parts = cleanString.split(' ');
        const datePart = parts[0];
        const timePart = parts[1] || '00:00:00';
        const [day, month, year] = datePart.split('/');
        const [hour, minute, second] = timePart.split(':');

        date = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hour || '0'),
          parseInt(minute || '0'),
          parseInt(second || '0')
        );
      } else {
        date = new Date(cleanString);
      }

      if (isNaN(date.getTime())) return cleanString;

      const year = date.getFullYear();
      if (year < 1900 || year > 2100) return cleanString;

      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch (error) {
      return String(dateString);
    }
  }, []);

  const getSeverityColor = useCallback((severity: string) => {
    return severity.includes('4')
      ? 'bg-destructive text-destructive-foreground'
      : 'bg-yellow-500 text-yellow-950';
  }, []);

  // Função para obter o nível atual ativo do timer
  const getCurrentActiveLevel = useCallback((chamado: number) => {
    const timerState = timers.get(chamado);
    if (!timerState) return null;

    // Verificar levels de 1 a 5 para encontrar o ativo
    for (let level = 1; level <= 5; level++) {
      const statusKey = `level${level}_status` as keyof typeof timerState;
      if (timerState[statusKey] === 'running') {
        return level;
      }
    }
    return null;
  }, [timers]);

  // Handlers para acionamento
  const handleAcknowledgment = useCallback(async (alert: AlertData) => {
    try {
      toast({
        title: "Alerta acionado",
        description: `Chamado ${alert.chamado} foi acionado com sucesso`,
      });

      onUpdateAcknowledgment(alert.id, true);
    } catch (error: any) {
      toast({
        title: "Erro ao acionar alerta",
        description: error.message || "Não foi possível concluir o acionamento",
        variant: "destructive",
      });
    }
  }, [onUpdateAcknowledgment]);

  // Handlers para timer
  const handleStartTimer = useCallback((chamado: string) => {
    const chamadoNum = parseInt(chamado);
    const duration = 1200; // 20 minutos em segundos

    console.log(`Iniciando Primeiro Acionamento para chamado ${chamado}`);

    const success = startTimer(chamadoNum, 1, duration);

    if (success) {
      toast({
        title: "🚀 Primeiro Acionamento Iniciado",
        description: `Timer de 20 minutos iniciado para chamado ${chamado}`,
      });

      setTimeout(() => {
        getState(chamadoNum);
      }, 1000);
    }
  }, [startTimer, getState]);

  // Handlers para gerenciamento de etapas
  const handleOpenTimerManagement = useCallback((chamado: string) => {
    setSelectedChamadoForTimer(chamado);
    setTimerManagementOpen(true);
  }, []);

  // CORRIGIDO: Função para avançar para próximo nível
  const handleNextLevel = useCallback(async (chamado: string, nextLevel: number, observacao: string) => {
    try {
      const chamadoNum = parseInt(chamado);
      const duration = 1200; // 20 minutos para cada etapa

      // Primeiro salvar a observação do nível atual
      const currentLevel = getCurrentActiveLevel(chamadoNum);
      if (currentLevel && observacao.trim()) {
        updateObservacao(chamadoNum, currentLevel, observacao.trim());
      }

      // Iniciar o próximo nível
      const success = startTimer(chamadoNum, nextLevel, duration);

      if (success) {
        const levelName = LEVEL_NAMES[nextLevel as keyof typeof LEVEL_NAMES] || `Nível ${nextLevel}`;

        // Aguardar um momento para garantir que o timer foi iniciado
        await new Promise(resolve => setTimeout(resolve, 500));

        // Atualizar estado
        getState(chamadoNum);

        return true;
      }

      return false;
    } catch (error) {
      console.error('Erro em handleNextLevel:', error);
      throw error;
    }
  }, [startTimer, updateObservacao, getState, getCurrentActiveLevel]);

  // CORRIGIDO: Função para voltar ao nível anterior
  const handlePreviousLevel = useCallback(async (chamado: string, previousLevel: number, observacao: string) => {
    try {
      const chamadoNum = parseInt(chamado);

      // Salvar observação do nível atual
      const currentLevel = getCurrentActiveLevel(chamadoNum);
      if (currentLevel && observacao.trim()) {
        updateObservacao(chamadoNum, currentLevel, observacao.trim());
      }

      // Iniciar o nível anterior
      const duration = 1200; // 20 minutos
      const success = startTimer(chamadoNum, previousLevel, duration);

      if (success) {
        // Aguardar um momento para garantir que o timer foi iniciado
        await new Promise(resolve => setTimeout(resolve, 500));

        // Atualizar estado
        getState(chamadoNum);

        return true;
      }

      return false;
    } catch (error) {
      console.error('Erro em handlePreviousLevel:', error);
      throw error;
    }
  }, [startTimer, updateObservacao, getState, getCurrentActiveLevel]);

  // CORRIGIDO: Função para finalizar chamado
  const handleFinalize = useCallback(async (chamado: string, observacao: string) => {
    try {
      const chamadoNum = parseInt(chamado);

      // Salvar observação final
      const currentLevel = getCurrentActiveLevel(chamadoNum);
      if (currentLevel && observacao.trim()) {
        updateObservacao(chamadoNum, currentLevel, observacao.trim());
      }

      // Finalizar o chamado
      updateStatusFinal(chamadoNum, 'finalizado');

      // Aguardar um momento para garantir que o status foi atualizado
      await new Promise(resolve => setTimeout(resolve, 500));

      // Atualizar estado
      getState(chamadoNum);

      return true;
    } catch (error) {
      console.error('Erro em handleFinalize:', error);
      throw error;
    }
  }, [updateObservacao, updateStatusFinal, getState, getCurrentActiveLevel]);

  // Handlers para observação
  const handleOpenObservacao = useCallback((chamado: string) => {
    setSelectedChamadoForEdit(chamado);
    const existing = localObservacoes.get(chamado);
    setObservacaoText(existing?.observacao || '');
    setOperadorText(existing?.operador || '');
    setObservacaoDialogOpen(true);
  }, [localObservacoes]);

  const handleSaveObservacao = useCallback(() => {
    if (!selectedChamadoForEdit) return;

    const chamadoNum = parseInt(selectedChamadoForEdit);

    if (observacaoText.trim()) {
      updateObservacao(chamadoNum, 1, observacaoText.trim());
    }

    if (operadorText.trim()) {
      updateOperador(chamadoNum, operadorText.trim());
    }

    setLocalObservacoes(prev => {
      const newMap = new Map(prev);
      newMap.set(selectedChamadoForEdit, {
        observacao: observacaoText.trim(),
        operador: operadorText.trim()
      });
      return newMap;
    });

    setObservacaoDialogOpen(false);
    setObservacaoText('');
    setOperadorText('');

    toast({
      title: "✅ Observação Salva",
      description: `Observação do chamado ${selectedChamadoForEdit} foi salva`,
    });
  }, [selectedChamadoForEdit, observacaoText, operadorText, updateObservacao, updateOperador]);

  // Handlers para ordenação
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortField('chamado');
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField, sortDirection]);

  const getSortIcon = useCallback((field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="h-4 w-4 ml-1" />;
    }
    if (sortDirection === 'desc') {
      return <ArrowDown className="h-4 w-4 ml-1" />;
    }
    return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
  }, [sortField, sortDirection]);

  // Dados filtrados e paginados
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return alertData;

    const searchLower = searchTerm.toLowerCase().trim();
    return alertData.filter(alert =>
      Object.values(alert).some(value =>
        String(value).toLowerCase().includes(searchLower)
      )
    );
  }, [alertData, searchTerm]);

  const { sortedAndPaginatedData, totalPages } = useMemo(() => {
    let sortedData = [...filteredData];

    if (sortField && sortDirection) {
      sortedData.sort((a, b) => {
        let aValue: any = a[sortField];
        let bValue: any = b[sortField];

        if (sortField === 'chamado') {
          aValue = parseInt(a.chamado) || 0;
          bValue = parseInt(b.chamado) || 0;
        } else if (sortField === 'abertura_chamado') {
          aValue = new Date(a.abertura_chamado).getTime() || 0;
          bValue = new Date(b.abertura_chamado).getTime() || 0;
        } else {
          aValue = String(aValue).toLowerCase();
          bValue = String(bValue).toLowerCase();
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      sortedData.sort((a, b) => {
        const chamadoA = parseInt(a.chamado) || 0;
        const chamadoB = parseInt(b.chamado) || 0;
        return chamadoB - chamadoA;
      });
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = sortedData.slice(startIndex, endIndex);
    const totalPages = Math.ceil(sortedData.length / itemsPerPage);

    return { sortedAndPaginatedData: paginatedData, totalPages };
  }, [filteredData, currentPage, itemsPerPage, sortField, sortDirection]);

  // Handlers para paginação
  const handleItemsPerPageChange = useCallback((value: string) => {
    const num = parseInt(value, 10);
    setItemsPerPage(num);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  return (
    <TooltipProvider>
      <Card className="bg-card border-border shadow-elegant">
        <CardHeader>
          {/* Status da Conexão WebSocket */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 px-4 py-2 rounded-lg border bg-card">
              <div className={`relative h-4 w-4 rounded-full ${isConnected ? 'bg-websocket-connected animate-pulse-slow' : 'bg-websocket-disconnected'}`}>
                {isConnected && (
                  <div className="absolute inset-0 rounded-full bg-websocket-connected animate-ping opacity-30" />
                )}
              </div>
              <span className={`text-sm font-medium ${isConnected ? 'text-websocket-connected' : 'text-websocket-disconnected'}`}>
                WebSocket: {isConnected ? 'Conectado e Sincronizado' : 'Desconectado - Tentando Reconectar...'}
              </span>
              {!isConnected && (
                <div className="h-3 w-3 border-2 border-websocket-disconnected border-t-transparent rounded-full animate-spin" />
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              URL: wss://rsgjd6wsza.execute-api.us-east-1.amazonaws.com
            </div>
          </div>

          {/* Campo de Pesquisa */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por chamado, tipo, grupo, status, título..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {searchTerm && (
            <div className="text-sm text-muted-foreground">
              {filteredData.length === 0 ? (
                <span>Nenhum resultado encontrado para "{searchTerm}"</span>
              ) : (
                <span>
                  {filteredData.length} resultado{filteredData.length !== 1 ? 's' : ''}
                  {filteredData.length !== alertData.length && ` de ${alertData.length} `}
                  para "{searchTerm}"
                </span>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent>
          {/* Responsive Layout */}
          <div className="w-full">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="border-border hover:bg-accent">
                  <TableHead className="text-muted-foreground w-[80px]">
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-medium text-muted-foreground hover:text-foreground text-xs"
                      onClick={() => handleSort('chamado')}
                    >
                      Chamado
                      {getSortIcon('chamado')}
                    </Button>
                  </TableHead>
                  <TableHead className="text-muted-foreground hidden md:table-cell">
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-medium text-muted-foreground hover:text-foreground text-xs"
                      onClick={() => handleSort('tipo_chamado')}
                    >
                      Classificação
                      {getSortIcon('tipo_chamado')}
                    </Button>
                  </TableHead>
                  <TableHead className="text-muted-foreground hidden lg:table-cell">
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-medium text-muted-foreground hover:text-foreground text-xs"
                      onClick={() => handleSort('grupo_chamado')}
                    >
                      Grupo
                      {getSortIcon('grupo_chamado')}
                    </Button>
                  </TableHead>
                  <TableHead className="text-muted-foreground hidden lg:table-cell">
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-medium text-muted-foreground hover:text-foreground text-xs"
                      onClick={() => handleSort('status_chamado')}
                    >
                      Status
                      {getSortIcon('status_chamado')}
                    </Button>
                  </TableHead>
                  <TableHead className="text-muted-foreground hidden xl:table-cell">
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-medium text-muted-foreground hover:text-foreground text-xs"
                      onClick={() => handleSort('abertura_chamado')}
                    >
                      Abertura
                      {getSortIcon('abertura_chamado')}
                    </Button>
                  </TableHead>
                  <TableHead className="text-muted-foreground">
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-medium text-muted-foreground hover:text-foreground text-xs"
                      onClick={() => handleSort('resumo_chamado')}
                    >
                      Título
                      {getSortIcon('resumo_chamado')}
                    </Button>
                  </TableHead>
                  <TableHead className="text-muted-foreground hidden sm:table-cell">
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-medium text-muted-foreground hover:text-foreground text-xs"
                      onClick={() => handleSort('severidade_chamado')}
                    >
                      Severidade
                      {getSortIcon('severidade_chamado')}
                    </Button>
                  </TableHead>
                  <TableHead className="text-muted-foreground w-[200px] text-center">
                    <span className="text-xs font-medium">Timer WebSocket</span>
                  </TableHead>
                  <TableHead className="text-muted-foreground w-[60px] text-center">Chat</TableHead>
                  <TableHead className="text-muted-foreground w-[80px] text-center">Observação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                      <p>Carregando dados...</p>
                    </TableCell>
                  </TableRow>
                ) : sortedAndPaginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum dado disponível'}
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedAndPaginatedData.map((alert) => {
                    const isChat = alert.acionado === 'true' || alert.chat;
                    const observacao = localObservacoes.get(alert.chamado);
                    const chamadoNum = parseInt(alert.chamado);
                    const activeLevel = getCurrentActiveLevel(chamadoNum);
                    const timerState = timers.get(chamadoNum);
                    const remainingTime = activeLevel ? getRemainingTime(chamadoNum, activeLevel) : 0;
                    const isFinalized = timerState?.statusFinal === 'finalizado';

                    return (
                      <TableRow key={alert.id} className="border-border hover:bg-accent transition-colors">
                        <TableCell className="font-medium">
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 text-foreground hover:underline text-xs"
                          >
                            {alert.chamado}
                          </Button>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="truncate block max-w-[100px] text-xs">
                                {alert.tipo_chamado}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">{alert.tipo_chamado}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-xs hidden lg:table-cell">{alert.grupo_chamado}</TableCell>
                        <TableCell className="text-xs hidden lg:table-cell">{alert.status_chamado}</TableCell>
                        <TableCell className="text-xs hidden xl:table-cell">{formatDate(alert.abertura_chamado)}</TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="truncate block max-w-[150px] text-xs">
                                {alert.resumo_chamado}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-md">{alert.resumo_chamado}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge className={`${getSeverityColor(alert.severidade_chamado)} text-xs`}>
                            {alert.severidade_chamado}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-center gap-2">
                            {isFinalized ? (
                              <div className="space-y-1 text-center">
                                <Badge className="bg-green-600 text-white text-xs font-semibold px-3 py-1 whitespace-nowrap">
                                  ✅ FINALIZADO
                                </Badge>
                                {timerState?.operador && (
                                  <div className="text-xs text-muted-foreground bg-muted rounded px-2 py-1">
                                    👤 {timerState.operador}
                                  </div>
                                )}
                              </div>
                            ) : activeLevel && timerState ? (
                              <div className="space-y-1 text-center">
                                <div className="flex items-center gap-1 justify-center">
                                  <Timer className="h-3 w-3 text-timer-active animate-pulse" />
                                  <Badge className="bg-timer-active text-white text-xs font-semibold px-2 py-1 whitespace-nowrap">
                                    {LEVEL_NAMES[activeLevel as keyof typeof LEVEL_NAMES]}
                                  </Badge>
                                </div>
                                <div className="text-lg font-mono font-black text-timer-active tracking-wide">
                                  {formatTime(remainingTime)}
                                </div>
                                <Button
                                  variant="timer"
                                  size="sm"
                                  onClick={() => handleOpenTimerManagement(alert.chamado)}
                                  className="h-6 px-2 text-xs font-semibold"
                                >
                                  <Settings className="h-3 w-3 mr-1" />
                                  Gerenciar
                                </Button>
                                {timerState.operador && (
                                  <div className="text-xs text-muted-foreground bg-muted rounded px-2 py-1">
                                    👤 {timerState.operador}
                                  </div>
                                )}
                                {remainingTime <= 300 && remainingTime > 0 && (
                                  <Badge variant="destructive" className="text-xs animate-pulse">
                                    ⚠️ Últimos 5 min
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-2">
                                <Button
                                  variant="timer"
                                  size="sm"
                                  onClick={() => handleStartTimer(alert.chamado)}
                                  className="h-7 px-3 text-xs font-semibold whitespace-nowrap"
                                  disabled={!isConnected}
                                >
                                  <Play className="h-3 w-3 mr-1" />
                                  Iniciar (20min)
                                </Button>
                                {!isConnected && (
                                  <span className="text-xs text-destructive">WebSocket desconectado</span>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant={isChat ? "success" : "outline"}
                                size="sm"
                                onClick={() => !isChat && handleAcknowledgment(alert)}
                                disabled={isChat}
                                className="h-8 w-8 p-0"
                              >
                                {isChat ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <AlertTriangle className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{isChat ? 'Já acionado' : 'Acionar grupo'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant={observacao ? "success" : "outline"}
                                size="sm"
                                onClick={() => handleOpenObservacao(alert.chamado)}
                                className="h-8 w-8 p-0"
                              >
                                {observacao ? (
                                  <CheckCircle className="h-4 w-4" />
                                ) : (
                                  <Edit3 className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{observacao ? 'Observação salva' : 'Adicionar observação'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginação */}
          {!loading && sortedAndPaginatedData.length > 0 && totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 pt-4 border-t border-border gap-4">
              <div className="text-sm text-muted-foreground text-center sm:text-left">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredData.length)} de {filteredData.length} registros
                {searchTerm && filteredData.length !== alertData.length && ` (filtrados de ${alertData.length})`}
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="itemsPerPage" className="text-sm font-medium whitespace-nowrap">
                  Por Página:
                </Label>
                <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="15">15</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="h-8 px-3"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>

                <div className="flex items-center gap-1">
                  {[...Array(Math.min(totalPages, 5))].map((_, index) => {
                    let page;
                    if (totalPages <= 5) {
                      page = index + 1;
                    } else if (currentPage <= 3) {
                      page = index + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + index;
                    } else {
                      page = currentPage - 2 + index;
                    }

                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className="h-8 w-8 p-0"
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="h-8 px-3"
                >
                  Próximo
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Modern Timer Management Modal */}
          {selectedChamadoForTimer && (
            <ModernTimerModal
              isOpen={timerManagementOpen}
              onClose={() => {
                setTimerManagementOpen(false);
                setSelectedChamadoForTimer('');
              }}
              chamado={parseInt(selectedChamadoForTimer)}
              currentLevel={getCurrentActiveLevel(parseInt(selectedChamadoForTimer)) || 1}
              remainingTime={getCurrentActiveLevel(parseInt(selectedChamadoForTimer)) ? getRemainingTime(parseInt(selectedChamadoForTimer), getCurrentActiveLevel(parseInt(selectedChamadoForTimer))!) : 0}
              chamadoData={timers.get(parseInt(selectedChamadoForTimer))}
              formatTime={formatTime}
              onNextLevel={(chamado, level, observacao) => {
                const success = startTimer(chamado, level, 1200);
                if (success) {
                  updateObservacao(chamado, level - 1, observacao);
                }
              }}
              updateStatusFinal={(chamado, levelStatusKey, status) => {
                updateStatusFinal(chamado, status);
              }}
              updateObservacao={updateObservacao}
            />
          )}

          {/* Modal de Observação */}
          <Dialog open={observacaoDialogOpen} onOpenChange={setObservacaoDialogOpen}>
            <DialogContent className="sm:max-w-lg border-border bg-card shadow-modal">
              <DialogHeader className="text-left">
                <DialogTitle className="text-xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  📝 Observação - Chamado {selectedChamadoForEdit}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Registre observações importantes e defina o operador responsável pelo chamado
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="operador" className="text-sm font-semibold text-foreground">
                    👤 Operador Responsável
                  </Label>
                  <Input
                    id="operador"
                    value={operadorText}
                    onChange={(e) => setOperadorText(e.target.value)}
                    placeholder="Ex: João Silva"
                    className="border-border focus:border-primary transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="observacao" className="text-sm font-semibold text-foreground">
                    📄 Observações
                  </Label>
                  <Textarea
                    id="observacao"
                    value={observacaoText}
                    onChange={(e) => setObservacaoText(e.target.value)}
                    placeholder="Descreva o status atual, ações tomadas, próximos passos..."
                    rows={5}
                    className="border-border focus:border-primary transition-colors resize-none"
                  />
                  <div className="text-xs text-muted-foreground">
                    {observacaoText.length}/500 caracteres
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={() => setObservacaoDialogOpen(false)}
                    className="px-6"
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="timer"
                    onClick={handleSaveObservacao}
                    className="px-6"
                    disabled={!operadorText.trim() && !observacaoText.trim()}
                  >
                    💾 Salvar Observação
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};