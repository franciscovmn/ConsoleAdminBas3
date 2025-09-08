import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, User, Phone } from 'lucide-react';
import { Atendimento } from '@/hooks/useAtendimentos';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AgendamentosTableProps {
  agendamentos: Atendimento[];
  onEfetivarConsulta: (atendimento: Atendimento) => void;
  loading?: boolean;
}

export const AgendamentosTable: React.FC<AgendamentosTableProps> = ({
  agendamentos,
  onEfetivarConsulta,
  loading = false
}) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Data não definida';
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return 'Data inválida';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Próximos Agendamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Próximos Agendamentos
          <span className="text-sm font-normal text-muted-foreground">
            ({agendamentos.length} consultas)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {agendamentos.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum agendamento encontrado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Os agendamentos do Google Calendar aparecerão aqui automaticamente
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Cliente</TableHead>
                  <TableHead className="font-semibold">Data & Hora</TableHead>
                  <TableHead className="font-semibold">Contato</TableHead>
                  <TableHead className="text-right font-semibold">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agendamentos.map((agendamento) => (
                  <TableRow key={agendamento.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {agendamento.nome_cliente}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {formatDate(agendamento.data_agendamento)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {agendamento.contato_cliente || 'Não informado'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        onClick={() => onEfetivarConsulta(agendamento)}
                        variant="default"
                        size="sm"
                        className="bg-success hover:bg-success/90 text-success-foreground shadow-success"
                      >
                        Efetivar Consulta
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};