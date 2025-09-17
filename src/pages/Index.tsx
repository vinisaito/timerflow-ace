import { useState } from 'react';
import { ActionTable } from '@/components/ActionTable/ActionTable';

// Dados de exemplo para demonstração
const mockAlertData = [
  {
    id: '1',
    chamado: '123456',
    tipo_chamado: 'Incidente',
    grupo_chamado: 'TI',
    status_chamado: 'Aberto',
    abertura_chamado: '2024-01-15T10:30:00',
    resumo_chamado: 'Sistema indisponível',
    severidade_chamado: 'Severidade 4',
    acionado: 'false',
    chat: false
  },
  {
    id: '2', 
    chamado: '123457',
    tipo_chamado: 'Requisição',
    grupo_chamado: 'Suporte',
    status_chamado: 'Em Andamento',
    abertura_chamado: '2024-01-15T11:15:00',
    resumo_chamado: 'Instalação de software',
    severidade_chamado: 'Severidade 3',
    acionado: 'true',
    chat: true
  }
];

const Index = () => {
  const [alertData] = useState(mockAlertData);
  const [loading] = useState(false);

  const handleUpdateAcknowledgment = (alertId: string, acknowledged: boolean) => {
    console.log(`Acionamento atualizado para alerta ${alertId}: ${acknowledged}`);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-full mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Sistema de Gestão de Chamados
          </h1>
          <p className="text-muted-foreground mt-2">
            Monitore e gerencie chamados com timers em tempo real via WebSocket
          </p>
        </div>
        
        <ActionTable 
          alertData={alertData}
          onUpdateAcknowledgment={handleUpdateAcknowledgment}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default Index;