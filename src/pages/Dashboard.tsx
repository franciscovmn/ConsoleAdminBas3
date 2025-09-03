import { useState } from 'react';
import { useAtendimentos, Atendimento } from '@/hooks/useAtendimentos';
import { MetricsCard } from '@/components/MetricsCard';
import { AgendamentosTable } from '@/components/AgendamentosTable';
import { EfetivarConsultaModal } from '@/components/EfetivarConsultaModal';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Calendar, 
  DollarSign, 
  RefreshCw,
  TrendingUp,
  CheckCircle,
  Clock
} from 'lucide-react';

export const Dashboard = () => {
  const { agendamentos, metrics, loading, updateStatus, syncGoogleCalendar } = useAtendimentos();
  const [selectedAtendimento, setSelectedAtendimento] = useState<Atendimento | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleEfetivarConsulta = (atendimento: Atendimento) => {
    setSelectedAtendimento(atendimento);
    setModalOpen(true);
  };

// src/pages/Dashboard.tsx -> Aplicar esta correção também

  const handleConfirmEfetivacao = async (plano: string, valorCobrado: number) => {
    if (!selectedAtendimento) return;
    
    // CORRIGIDO: Passando o objeto 'selectedAtendimento' completo
    const success = await updateStatus(selectedAtendimento, plano, valorCobrado);
    
    if (success) {
      setModalOpen(false);
      setSelectedAtendimento(null);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    await syncGoogleCalendar();
    setSyncing(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Visão geral do seu consultório
          </p>
        </div>
        <Button
          onClick={handleSync}
          disabled={syncing}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          Sincronizar
        </Button>
      </div>

      {/* Métricas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <MetricsCard
          title="Novos Contatos (Mês)"
          value={metrics.novosContatos}
          icon={Users}
          variant="primary"
          trend="Desde o início do mês"
        />
        <MetricsCard
          title="Consultas Atendidas (Mês)"
          value={metrics.consultasAtendidas}
          icon={CheckCircle}
          variant="success"
          trend="Consultas efetivadas"
        />
        <MetricsCard
          title="Receita do Mês"
          value={formatCurrency(metrics.receitaMes)}
          icon={DollarSign}
          trend="Receita total faturada"
        />
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <MetricsCard
          title="Agendamentos Pendentes"
          value={agendamentos.length}
          icon={Clock}
          trend="Aguardando atendimento"
          className="md:col-span-1"
        />
        <MetricsCard
          title="Taxa de Conversão"
          value={`${metrics.novosContatos > 0 ? Math.round((metrics.consultasAtendidas / metrics.novosContatos) * 100) : 0}%`}
          icon={TrendingUp}
          trend="Contatos que viraram consultas"
          className="md:col-span-1"
        />
      </div>

      {/* Tabela de Agendamentos */}
      <AgendamentosTable
        agendamentos={agendamentos}
        onEfetivarConsulta={handleEfetivarConsulta}
        loading={loading}
      />

      {/* Modal de Efetivação */}
      <EfetivarConsultaModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        atendimento={selectedAtendimento}
        onConfirm={handleConfirmEfetivacao}
      />
    </div>
  );
};