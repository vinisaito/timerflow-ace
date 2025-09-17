import { useState, useCallback, useRef, useEffect } from 'react';

interface TimerState {
  chamado: number;
  level1_status?: string;
  level2_status?: string;
  level3_status?: string;
  level4_status?: string;
  level5_status?: string;
  level1_remaining?: number;
  level2_remaining?: number;
  level3_remaining?: number;
  level4_remaining?: number;
  level5_remaining?: number;
  level1_observacao?: string;
  level2_observacao?: string;
  level3_observacao?: string;
  level4_observacao?: string;
  level5_observacao?: string;
  operador?: string;
  statusFinal?: string;
}

export const useWebsocketTimers = () => {
  const [timers, setTimers] = useState<Map<number, TimerState>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [watchedChamados, setWatchedChamados] = useState<number[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Conectar ao WebSocket
  const connect = useCallback(() => {
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        return;
      }

      const ws = new WebSocket('wss://rsgjd6wsza.execute-api.us-east-1.amazonaws.com');
      
      ws.onopen = () => {
        console.log('WebSocket conectado');
        setIsConnected(true);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.chamado && data.type === 'timer_update') {
            setTimers(prev => {
              const newMap = new Map(prev);
              newMap.set(data.chamado, { ...data });
              return newMap;
            });
          }
        } catch (error) {
          console.error('Erro ao processar mensagem WebSocket:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket desconectado');
        setIsConnected(false);
        
        // Tentar reconectar após 3 segundos
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error('Erro WebSocket:', error);
        setIsConnected(false);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Erro ao conectar WebSocket:', error);
      setIsConnected(false);
    }
  }, []);

  // Inicializar conexão
  useEffect(() => {
    connect();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  // Enviar mensagem via WebSocket
  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  // Iniciar timer
  const startTimer = useCallback((chamado: number, level: number, duration: number) => {
    return sendMessage({
      action: 'start_timer',
      chamado,
      level,
      duration
    });
  }, [sendMessage]);

  // Atualizar observação
  const updateObservacao = useCallback((chamado: number, level: number, observacao: string) => {
    return sendMessage({
      action: 'update_observacao',
      chamado,
      level,
      observacao
    });
  }, [sendMessage]);

  // Atualizar operador
  const updateOperador = useCallback((chamado: number, operador: string) => {
    return sendMessage({
      action: 'update_operador',
      chamado,
      operador
    });
  }, [sendMessage]);

  // Finalizar chamado
  const updateStatusFinal = useCallback((chamado: number, status: string) => {
    return sendMessage({
      action: 'finalize',
      chamado,
      status
    });
  }, [sendMessage]);

  // Obter estado atual
  const getState = useCallback((chamado: number) => {
    return sendMessage({
      action: 'get_state',
      chamado
    });
  }, [sendMessage]);

  // Obter tempo restante
  const getRemainingTime = useCallback((chamado: number, level: number): number => {
    const timerState = timers.get(chamado);
    if (!timerState) return 0;
    
    const remainingKey = `level${level}_remaining` as keyof TimerState;
    return timerState[remainingKey] as number || 0;
  }, [timers]);

  // Formatar tempo
  const formatTime = useCallback((seconds: number): string => {
    if (seconds <= 0) return '00:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  // Verificar se timer está ativo
  const isTimerActive = useCallback((chamado: number, level: number): boolean => {
    const timerState = timers.get(chamado);
    if (!timerState) return false;
    
    const statusKey = `level${level}_status` as keyof TimerState;
    return timerState[statusKey] === 'running';
  }, [timers]);

  // Definir chamados para monitorar
  const setWatchedChamadosCallback = useCallback((chamados: number[]) => {
    setWatchedChamados(chamados);
    
    // Solicitar estado atual de todos os chamados
    chamados.forEach(chamado => {
      getState(chamado);
    });
  }, [getState]);

  return {
    timers,
    isConnected,
    watchedChamados,
    startTimer,
    updateObservacao,
    updateOperador,
    updateStatusFinal,
    getRemainingTime,
    formatTime,
    isTimerActive,
    getState,
    setWatchedChamados: setWatchedChamadosCallback
  };
};