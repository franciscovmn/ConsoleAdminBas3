// src/pages/Dashboard.tsx
import { useState, useMemo } from 'react';
import { useAtendimentos, Atendimento } from '@/hooks/useAtendimentos';
import { MetricsCard } from '@/components/MetricsCard';
import { AgendamentosTable } from '@/components/AgendamentosTable';
import { AgendamentosSemana } from '@/components/AgendamentosSemana';
import { AgendamentosMes } from '@/components/AgendamentosMes'; // Importa o novo componente
import { EfetivarConsultaModal } from '@/components/EfetivarConsultaModal';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { isToday, isThisWeek, isThisMonth } from 'date-fns';
import { 
  Users, 
  RefreshCw,
  TrendingUp,
  CheckCircle,
  Clock,
  DollarSign
} from 'lucide-react';

export const Dashboard = () => {
  const { agendamentos, metrics, loading, updateStatus, syncGoogleCalendar } = useAtendimentos();
  const [selectedAtendimento, setSelectedAtendimento] = useState<Atendimento | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [view, setView] = useState<'dia' | 'semana' | 'mes'>('semana'); // Mudei o padrão para 'semana'

  const filteredAgendamentos = useMemo(() => {
    const now = new Date();
    if (!agendamentos) return [];

    switch (view) {
      case 'dia':
        return agendamentos.filter(a => a.data_agendamento && isToday(new Date(a.data_agendamento)));
      case 'semana':
        return agendamentos.filter(a => a.data_agendamento && isThisWeek(new Date(a.data_agendamento), { weekStartsOn: 1 }));
      case 'mes':
        return agendamentos.filter(a => a.data_agendamento && isThisMonth(new Date(a.data_agendamento)));
      default:
        return agendamentos;
    }
  }, [agendamentos, view]);

  const handleEfetivarConsulta = (atendimento: Atendimento) => {
    setSelectedAtendimento(atendimento);
    setModalOpen(true);
  };

  const handleConfirmEfetivacao = async (plano: string, valorCobrado: number) => {
    if (!selectedAtendimento) return;
    
    const success = await updateStatus(selectedAtendimento.id, plano, valorCobrado);
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

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }
    
    switch (view) {
      case 'dia':
        return (
          <AgendamentosTable
            agendamentos={filteredAgendamentos}
            onEfetivarConsulta={handleEfetivarConsulta}
            title="Agendamentos de Hoje"
          />
        );
      case 'semana':
        return (
          <AgendamentosSemana
            agendamentos={filteredAgendamentos}
            onEfetivarConsulta={handleEfetivarConsulta}
          />
        );
      case 'mes':
        return (
          <AgendamentosMes
            agendamentos={filteredAgendamentos}
            onEfetivarConsulta={handleEfetivarConsulta}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="hidden items-center justify-between lg:flex">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Visão geral do seu consultório
            </p>
          </div>
        </div>
        <div className="flex-grow"></div>
        <Button
          onClick={handleSync}
          disabled={syncing}
          variant="outline"
          className="gap-2 w-full sm:w-auto"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          Sincronizar Agenda
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Cards de métricas aqui... */}
      </div>
      
      <Tabs value={view} onValueChange={(value) => setView(value as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:w-[400px]">
          <TabsTrigger value="dia">Dia</TabsTrigger>
          <TabsTrigger value="semana">Semana</TabsTrigger>
          <TabsTrigger value="mes">Mês</TabsTrigger>
        </TabsList>
        <div className="mt-4">
          {renderContent()}
        </div>
      </Tabs>

      <EfetivarConsultaModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        atendimento={selectedAtendimento}
        onConfirm={handleConfirmEfetivacao}
      />
    </div>
  );
};