import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Atendimento } from '@/hooks/useAtendimentos';
import { Loader2, DollarSign, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EfetivarConsultaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  atendimento: Atendimento | null;
  onConfirm: (plano: string, valorCobrado: number) => Promise<void>;
}

const planos = [
  { value: 'consulta_avulsa', label: 'Consulta Avulsa', valor: 150 },
  { value: 'plano_trimestral', label: 'Plano Trimestral', valor: 120 },
  { value: 'plano_semestral', label: 'Plano Semestral', valor: 100 },
  { value: 'plano_anual', label: 'Plano Anual', valor: 80 },
];

export const EfetivarConsultaModal: React.FC<EfetivarConsultaModalProps> = ({
  open,
  onOpenChange,
  atendimento,
  onConfirm
}) => {
  const [selectedPlano, setSelectedPlano] = useState('consulta_avulsa');
  const [valorCobrado, setValorCobrado] = useState('150');
  const [loading, setLoading] = useState(false);

  const handlePlanoChange = (value: string) => {
    setSelectedPlano(value);
    const plano = planos.find(p => p.value === value);
    if (plano) {
      setValorCobrado(plano.valor.toString());
    }
  };

  const handleConfirm = async () => {
    if (!atendimento) return;
    
    setLoading(true);
    try {
      await onConfirm(selectedPlano, parseFloat(valorCobrado));
      onOpenChange(false);
      // Reset form
      setSelectedPlano('consulta_avulsa');
      setValorCobrado('150');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Data não definida';
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return 'Data inválida';
    }
  };

  const valorPadrao = atendimento?.valor_padrao || 150;
  const desconto = valorPadrao - parseFloat(valorCobrado || '0');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Efetivar Consulta
          </DialogTitle>
          <DialogDescription>
            Confirme os detalhes da consulta realizada
          </DialogDescription>
        </DialogHeader>

        {atendimento && (
          <div className="space-y-6">
            {/* Informações do Cliente */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{atendimento.nome_cliente}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {formatDate(atendimento.data_agendamento)}
                </span>
              </div>
            </div>

            {/* Seleção de Plano */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Tipo de Plano</Label>
              <RadioGroup value={selectedPlano} onValueChange={handlePlanoChange}>
                {planos.map((plano) => (
                  <div key={plano.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={plano.value} id={plano.value} />
                    <Label htmlFor={plano.value} className="flex-1 cursor-pointer">
                      <div className="flex justify-between items-center">
                        <span>{plano.label}</span>
                        <span className="text-sm text-muted-foreground">
                          R$ {plano.valor},00
                        </span>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Valor Cobrado */}
            <div className="space-y-2">
              <Label htmlFor="valor" className="text-base font-medium">
                Valor Final Cobrado
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  min="0"
                  value={valorCobrado}
                  onChange={(e) => setValorCobrado(e.target.value)}
                  className="pl-10"
                  placeholder="0,00"
                />
              </div>
              {desconto !== 0 && (
                <p className="text-sm text-muted-foreground">
                  {desconto > 0 ? 'Desconto' : 'Acréscimo'}: R$ {Math.abs(desconto).toFixed(2)}
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || !valorCobrado}
            className="bg-success hover:bg-success/90 text-success-foreground"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};