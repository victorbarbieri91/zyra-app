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
import { Phone, Video, Mail, MessageCircle, Users, Calendar, FileText, Briefcase, FileCheck } from 'lucide-react';
import type { InteracaoJSONB } from '@/types/crm';

type TipoInteracao = InteracaoJSONB['tipo'];

interface InteracaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pessoaId?: string;
  pessoaNome?: string;
  oportunidadeId?: string;
  onSave?: (interacao: Omit<InteracaoJSONB, 'id'>) => Promise<void>;
}

const tiposInteracao: { value: TipoInteracao; label: string; icon: any }[] = [
  { value: 'ligacao', label: 'Ligacao', icon: Phone },
  { value: 'reuniao', label: 'Reuniao', icon: Users },
  { value: 'email', label: 'E-mail', icon: Mail },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { value: 'videochamada', label: 'Videochamada', icon: Video },
  { value: 'visita', label: 'Visita', icon: Calendar },
  { value: 'proposta_enviada', label: 'Proposta Enviada', icon: Briefcase },
  { value: 'contrato_enviado', label: 'Contrato Enviado', icon: FileCheck },
  { value: 'outros', label: 'Outros', icon: FileText },
];

export function InteracaoModal({
  open,
  onOpenChange,
  pessoaId,
  pessoaNome,
  oportunidadeId,
  onSave,
}: InteracaoModalProps) {
  const [formData, setFormData] = useState({
    tipo: '' as TipoInteracao | '',
    descricao: '',
    data: new Date().toISOString().slice(0, 16),
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.tipo || !formData.descricao) return;

    setSaving(true);
    try {
      if (onSave) {
        await onSave({
          tipo: formData.tipo as TipoInteracao,
          descricao: formData.descricao,
          data: formData.data,
          user_id: '', // Sera preenchido pelo backend
        });
      }
      onOpenChange(false);
      setFormData({
        tipo: '',
        descricao: '',
        data: new Date().toISOString().slice(0, 16),
      });
    } catch (error) {
      console.error('Erro ao salvar interacao:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Interacao</DialogTitle>
          <DialogDescription>
            {pessoaNome ? `Registrar interacao com ${pessoaNome}` : 'Registrar nova interacao'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de Interacao */}
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de Interacao *</Label>
            <Select
              value={formData.tipo}
              onValueChange={(value) => setFormData({ ...formData, tipo: value as TipoInteracao })}
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

          {/* Data e Hora */}
          <div className="space-y-2">
            <Label htmlFor="data">Data e Hora *</Label>
            <Input
              id="data"
              type="datetime-local"
              value={formData.data}
              onChange={(e) => setFormData({ ...formData, data: e.target.value })}
              required
            />
          </div>

          {/* Descricao */}
          <div className="space-y-2">
            <Label htmlFor="descricao">Descricao *</Label>
            <Textarea
              id="descricao"
              placeholder="Descreva os detalhes da interacao..."
              rows={4}
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-[#34495e] to-[#46627f]"
              disabled={saving || !formData.tipo || !formData.descricao}
            >
              {saving ? 'Salvando...' : 'Registrar Interacao'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
