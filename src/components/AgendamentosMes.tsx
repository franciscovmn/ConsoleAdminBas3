// src/components/AgendamentosMes.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Atendimento } from '@/hooks/useAtendimentos';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay,
  getDay,
  isToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, Phone, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgendamentosMesProps {
  agendamentos: Atendimento[];
  onEfetivarConsulta: (atendimento: Atendimento) => void;
}

export const AgendamentosMes: React.FC<AgendamentosMesProps> = ({
  agendamentos,
  onEfetivarConsulta,
}) => {
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startingDayIndex = getDay(monthStart) === 0 ? 6 : getDay(monthStart) - 1;
  const leadingEmptyDays = Array.from({ length: startingDayIndex }).map((_, i) => (
    <div key={`empty-start-${i}`} className="border-r border-b"></div>
  ));

  const getAgendamentosDoDia = (dia: Date) => {
    return agendamentos
      .filter(a => a.data_agendamento && isSameDay(new Date(a.data_agendamento), dia))
      .sort((a, b) => new Date(a.data_agendamento!).getTime() - new Date(b.data_agendamento!).getTime());
  };

  const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="capitalize">{format(today, 'MMMM yyyy', { locale: ptBR })}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 border-t border-l">
          {weekDays.map(day => (
            <div key={day} className="p-2 text-center font-semibold text-sm border-r border-b bg-muted/50">
              {day}
            </div>
          ))}

          {leadingEmptyDays}

          {daysInMonth.map((day, index) => {
            const agendamentosDoDia = getAgendamentosDoDia(day);
            return (
              <div key={index} className="border-r border-b p-2 min-h-[120px] space-y-1">
                <div className={cn(
                  "text-xs font-semibold text-right",
                  isToday(day) && "bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center float-right",
                  !isSameMonth(day, today) && "text-muted-foreground"
                )}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-1 clear-right">
                  {agendamentosDoDia.map(agendamento => (
                    <Popover key={agendamento.id}>
                      <PopoverTrigger asChild>
                        <div className="bg-primary/10 p-1.5 rounded-md text-xs cursor-pointer hover:bg-primary/20">
                          <p className="font-semibold truncate">{agendamento.nome_cliente}</p>
                          <div className="flex items-center gap-1 text-primary/80">
                            <Clock className="h-3 w-3" />
                            {format(new Date(agendamento.data_agendamento!), 'HH:mm')}
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
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};