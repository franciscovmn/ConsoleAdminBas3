// src/components/AgendamentosSemana.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Atendimento } from '@/hooks/useAtendimentos';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { User, Clock, Phone, CheckCircle } from 'lucide-react';

interface AgendamentosSemanaProps {
  agendamentos: Atendimento[];
  onEfetivarConsulta: (atendimento: Atendimento) => void;
}

export const AgendamentosSemana: React.FC<AgendamentosSemanaProps> = ({
  agendamentos,
  onEfetivarConsulta,
}) => {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Começa na Segunda-feira

  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  const getAgendamentosDoDia = (dia: Date) => {
    return agendamentos
      .filter(a => a.data_agendamento && isSameDay(new Date(a.data_agendamento), dia))
      .sort((a, b) => new Date(a.data_agendamento!).getTime() - new Date(b.data_agendamento!).getTime());
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agenda da Semana</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
          {weekDays.map((day, index) => {
            const agendamentosDoDia = getAgendamentosDoDia(day);
            return (
              <div key={index} className="bg-muted/50 rounded-lg p-3 space-y-3">
                <div className="text-center font-semibold capitalize">
                  {format(day, 'EEE', { locale: ptBR })}
                  <span className="text-muted-foreground ml-1">{format(day, 'dd')}</span>
                </div>
                <div className="space-y-2">
                  {agendamentosDoDia.length > 0 ? (
                    agendamentosDoDia.map(agendamento => (
                      <Popover key={agendamento.id}>
                        <PopoverTrigger asChild>
                          <div className="bg-card p-2 text-xs rounded-lg cursor-pointer hover:bg-accent transition-colors">
                            <div className="flex items-center gap-2 font-medium">
                               <User className="h-3 w-3" /> {agendamento.nome_cliente}
                            </div>
                             <div className="flex items-center gap-2 text-muted-foreground mt-1">
                               <Clock className="h-3 w-3" /> {format(new Date(agendamento.data_agendamento!), 'HH:mm')}
                            </div>
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-60">
                          <div className="space-y-4">
                            <div className="font-semibold">{agendamento.nome_cliente}</div>
                            <div className="text-sm space-y-2">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span>{format(new Date(agendamento.data_agendamento!), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span>{agendamento.contato_cliente || 'Não informado'}</span>
                              </div>
                            </div>
                            <Button
                              onClick={() => onEfetivarConsulta(agendamento)}
                              className="w-full bg-success hover:bg-success/90"
                              size="sm"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Efetivar Consulta
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    ))
                  ) : (
                    <div className="text-center text-xs text-muted-foreground py-4">
                      Nenhum agendamento.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};