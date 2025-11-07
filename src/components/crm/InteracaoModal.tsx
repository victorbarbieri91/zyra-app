'use client';

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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Phone, Video, Mail, MessageCircle, Users, Calendar, FileText } from 'lucide-react';
import type { TipoInteracao } from '@/types/crm';

interface InteracaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pessoaId?: string;
  pessoaNome?: string;
  oportunidadeId?: string;
}

const tiposInteracao: { value: TipoInteracao; label: string; icon: any }[] = [
  { value: 'ligacao', label: 'Ligação', icon: Phone },
  { value: 'reuniao', label: 'Reunião', icon: Users },
  { value: 'email', label: 'E-mail', icon: Mail },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { value: 'videochamada', label: 'Videochamada', icon: Video },
  { value: 'visita', label: 'Visita', icon: Calendar },
  { value: 'mensagem', label: 'Mensagem', icon: MessageCircle },
  { value: 'outros', label: 'Outros', icon: FileText },
];

export function InteracaoModal({
  open,
  onOpenChange,
  pessoaId,
  pessoaNome,
  oportunidadeId,
}: InteracaoModalProps) {
  const [formData, setFormData] = useState({
    tipo: '' as TipoInteracao,
    assunto: '',
    descricao: '',
    data_hora: new Date().toISOString().slice(0, 16),
    duracao_minutos: '',
    resultado: '',
    follow_up: false,
    follow_up_data: '',
    follow_up_descricao: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Registrar interação:', {
      ...formData,
      pessoa_id: pessoaId,
      oportunidade_id: oportunidadeId,
    });
    onOpenChange(false);
    // TODO: Integrar com Supabase
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Interação</DialogTitle>
          <DialogDescription>
            {pessoaNome ? `Registrar interação com ${pessoaNome}` : 'Registrar nova interação'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tipo de Interação */}
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de Interação *</Label>
            <Select
              value={formData.tipo}
              onValueChange={(value) => setFormData({ ...formData, tipo: value as TipoInteracao })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {tiposInteracao.map((tipo) => {
                  const Icon = tipo.icon;
                  return (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {tipo.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Data e Hora + Duração */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_hora">Data e Hora *</Label>
              <Input
                id="data_hora"
                type="datetime-local"
                value={formData.data_hora}
                onChange={(e) => setFormData({ ...formData, data_hora: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duracao">Duração (minutos)</Label>
              <Input
                id="duracao"
                type="number"
                placeholder="Ex: 30"
                value={formData.duracao_minutos}
                onChange={(e) => setFormData({ ...formData, duracao_minutos: e.target.value })}
              />
            </div>
          </div>

          {/* Assunto */}
          <div className="space-y-2">
            <Label htmlFor="assunto">Assunto *</Label>
            <Input
              id="assunto"
              placeholder="Ex: Reunião inicial para discussão do caso"
              value={formData.assunto}
              onChange={(e) => setFormData({ ...formData, assunto: e.target.value })}
              required
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição *</Label>
            <Textarea
              id="descricao"
              placeholder="Descreva os detalhes da interação..."
              rows={4}
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              required
            />
          </div>

          {/* Resultado */}
          <div className="space-y-2">
            <Label htmlFor="resultado">Resultado</Label>
            <Textarea
              id="resultado"
              placeholder="Qual foi o resultado dessa interação?"
              rows={2}
              value={formData.resultado}
              onChange={(e) => setFormData({ ...formData, resultado: e.target.value })}
            />
          </div>

          {/* Follow-up */}
          <div className="space-y-4 p-4 border border-slate-200 rounded-lg bg-slate-50">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="follow_up" className="text-sm font-semibold text-slate-900">
                  Agendar Follow-up
                </Label>
                <p className="text-xs text-slate-600 mt-1">
                  Criar lembrete para acompanhamento futuro
                </p>
              </div>
              <Switch
                id="follow_up"
                checked={formData.follow_up}
                onCheckedChange={(checked) => setFormData({ ...formData, follow_up: checked })}
              />
            </div>

            {formData.follow_up && (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="follow_up_data">Data do Follow-up *</Label>
                  <Input
                    id="follow_up_data"
                    type="date"
                    value={formData.follow_up_data}
                    onChange={(e) =>
                      setFormData({ ...formData, follow_up_data: e.target.value })
                    }
                    required={formData.follow_up}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="follow_up_descricao">Descrição do Follow-up *</Label>
                  <Textarea
                    id="follow_up_descricao"
                    placeholder="O que deve ser feito no follow-up?"
                    rows={2}
                    value={formData.follow_up_descricao}
                    onChange={(e) =>
                      setFormData({ ...formData, follow_up_descricao: e.target.value })
                    }
                    required={formData.follow_up}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-[#34495e] to-[#46627f]"
            >
              Registrar Interação
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
