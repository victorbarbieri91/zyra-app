'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { criarEscritorio } from '@/lib/supabase/escritorio-helpers';

interface ModalCriarEscritorioProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ModalCriarEscritorio({
  open,
  onOpenChange,
  onSuccess,
}: ModalCriarEscritorioProps) {
  const [nome, setNome] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [salvando, setSalvando] = useState(false);

  const formatarCNPJ = (valor: string) => {
    const numeros = valor.replace(/\D/g, '');
    if (numeros.length <= 14) {
      return numeros
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return numeros.slice(0, 14);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      toast.error('Informe o nome do escritório');
      return;
    }

    setSalvando(true);
    try {
      const escritorio = await criarEscritorio({
        nome: nome.trim(),
        cnpj: cnpj.trim() || undefined,
      });

      if (escritorio) {
        toast.success('Escritório criado com sucesso');
        setNome('');
        setCnpj('');
        onOpenChange(false);
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      console.error('Erro ao criar escritório:', error);
      toast.error('Erro ao criar escritório');
    } finally {
      setSalvando(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setNome('');
      setCnpj('');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#34495e]">
            Novo Escritório
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="nome" className="text-[#34495e]">
              Nome do Escritório
            </Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Silva & Advogados"
              className="border-slate-200"
              disabled={salvando}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cnpj" className="text-[#34495e]">
              CNPJ
            </Label>
            <Input
              id="cnpj"
              value={cnpj}
              onChange={(e) => setCnpj(formatarCNPJ(e.target.value))}
              placeholder="00.000.000/0000-00"
              className="border-slate-200"
              disabled={salvando}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              className="flex-1"
              disabled={salvando}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-[#34495e] hover:bg-[#46627f] text-white"
              disabled={salvando}
            >
              {salvando ? 'Criando...' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
