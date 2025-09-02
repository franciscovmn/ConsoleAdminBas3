import { useAtendimentos } from '@/hooks/useAtendimentos';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar,
  DollarSign,
  Users,
  Target
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const Relatorios = () => {
  const { atendimentos, loading } = useAtendimentos();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Calcular métricas dos últimos 6 meses
  const last6Months = eachMonthOfInterval({
    start: subMonths(new Date(), 5),
    end: new Date()
  });

  const monthlyData = last6Months.map(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    
    const atendimentosDoMes = atendimentos.filter(a => {
      const date = new Date(a.updated_at);
      return date >= monthStart && date <= monthEnd && a.status === 'atendido';
    });

    const receita = atendimentosDoMes.reduce((total, a) => total + (a.valor_cobrado || 0), 0);
    
    return {
      month: format(month, 'MMM', { locale: ptBR }),
      fullMonth: format(month, 'MMMM yyyy', { locale: ptBR }),
      consultas: atendimentosDoMes.length,
      receita
    };
  });

  // Métricas gerais
  const totalConsultas = atendimentos.filter(a => a.status === 'atendido').length;
  const receitaTotal = atendimentos
    .filter(a => a.status === 'atendido')
    .reduce((total, a) => total + (a.valor_cobrado || 0), 0);
  
  const ticketMedio = totalConsultas > 0 ? receitaTotal / totalConsultas : 0;
  
  const consultasAgendadas = atendimentos.filter(a => a.status === 'agendado').length;
  const taxaConversao = atendimentos.length > 0 ? (totalConsultas / atendimentos.length) * 100 : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChart3 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground">
            Análise detalhada do desempenho do consultório
          </p>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-primary bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Consultas</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalConsultas}</div>
            <p className="text-xs text-muted-foreground">
              Consultas realizadas
            </p>
          </CardContent>
        </Card>

        <Card className="border-success bg-gradient-to-br from-success/5 to-success/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(receitaTotal)}</div>
            <p className="text-xs text-muted-foreground">
              Faturamento acumulado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(ticketMedio)}</div>
            <p className="text-xs text-muted-foreground">
              Valor médio por consulta
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taxaConversao.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Agendamentos → Consultas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Evolução Mensal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Evolução dos Últimos 6 Meses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {monthlyData.map((data, index) => (
              <div key={index} className="grid grid-cols-3 gap-4 p-4 rounded-lg border bg-card">
                <div>
                  <h4 className="font-medium capitalize">{data.fullMonth}</h4>
                  <p className="text-sm text-muted-foreground">Período</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{data.consultas}</p>
                  <p className="text-sm text-muted-foreground">Consultas</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(data.receita)}</p>
                  <p className="text-sm text-muted-foreground">Receita</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status Atual */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Agendamentos Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{consultasAgendadas}</div>
            <p className="text-muted-foreground">
              Consultas aguardando atendimento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Meta do Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Consultas realizadas</span>
                <span className="font-medium">
                  {monthlyData[monthlyData.length - 1]?.consultas || 0} / 25
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min(((monthlyData[monthlyData.length - 1]?.consultas || 0) / 25) * 100, 100)}%` 
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Objetivo mensal de consultas
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};