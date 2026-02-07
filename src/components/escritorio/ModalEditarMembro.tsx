'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserCog, Trash2, AlertTriangle, DollarSign, Clock, Percent, User } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { MembroCompleto, Cargo, MembroRemuneracao } from '@/types/escritorio';

interface ModalEditarMembroProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  membro: MembroCompleto | null;
  cargos: Cargo[];
  escritorioId: string;
  onSuccess?: () => void;
}

export function ModalEditarMembro({
  open,
  onOpenChange,
  membro,
  cargos,
  escritorioId,
  onSuccess,
}: ModalEditarMembroProps) {
  const [salvando, setSalvando] = useState(false);
  const [removendo, setRemovendo] = useState(false);
  const [cargoSelecionado, setCargoSelecionado] = useState<string>('');
  const [remuneracao, setRemuneracao] = useState<MembroRemuneracao>({
    salario_base: 0,
    percentual_comissao: 0,
    meta_horas_mensal: 160,
    valor_hora: 0,
  });
  const [dialogRemoverAberto, setDialogRemoverAberto] = useState(false);
  const [activeTab, setActiveTab] = useState('cargo');

  const supabase = createClient();

  // Inicializar estados quando o membro muda
  useEffect(() => {
    if (membro) {
      setCargoSelecionado(membro.cargo_id || '');
      setRemuneracao({
        salario_base: membro.remuneracao.salario_base || 0,
        percentual_comissao: membro.remuneracao.percentual_comissao || 0,
        meta_horas_mensal: membro.remuneracao.meta_horas_mensal || 160,
        valor_hora: membro.remuneracao.valor_hora || 0,
      });
      setActiveTab('cargo');
    }
  }, [membro]);

  if (!membro) return null;

  const isDono = membro.is_owner || membro.cargo?.nome === 'dono';

  // Ordenar cargos por nível (excluir "dono" para não-donos)
  const cargosDisponiveis = cargos
    .filter((c) => isDono || c.nome !== 'dono')
    .sort((a, b) => a.nivel - b.nivel);

  const hasChanges = () => {
    const cargoAlterado = cargoSelecionado !== (membro.cargo_id || '');
    const remuneracaoAlterada =
      remuneracao.salario_base !== membro.remuneracao.salario_base ||
      remuneracao.percentual_comissao !== membro.remuneracao.percentual_comissao ||
      remuneracao.meta_horas_mensal !== membro.remuneracao.meta_horas_mensal ||
      remuneracao.valor_hora !== membro.remuneracao.valor_hora;

    return cargoAlterado || remuneracaoAlterada;
  };

  const handleSalvar = async () => {
    if (!hasChanges()) {
      toast.info('Nenhuma alteracao foi feita');
      return;
    }

    setSalvando(true);
    try {
      const updateData: any = {
        salario_base: remuneracao.salario_base,
        percentual_comissao: remuneracao.percentual_comissao,
        meta_horas_mensal: remuneracao.meta_horas_mensal,
        valor_hora: remuneracao.valor_hora,
      };

      // Só atualiza cargo se não for dono
      if (!isDono && cargoSelecionado) {
        updateData.cargo_id = cargoSelecionado;
      }

      const { error } = await supabase
        .from('escritorios_usuarios')
        .update(updateData)
        .eq('id', membro.id);

      if (error) throw error;

      toast.success('Dados do membro atualizados com sucesso');
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Erro ao atualizar membro:', error);
      toast.error('Erro ao atualizar membro');
    } finally {
      setSalvando(false);
    }
  };

  const handleRemover = async () => {
    setRemovendo(true);
    try {
      const { error } = await supabase
        .from('escritorios_usuarios')
        .update({ ativo: false })
        .eq('id', membro.id)
        .eq('is_owner', false);

      if (error) throw error;

      toast.success('Membro removido do escritorio');
      setDialogRemoverAberto(false);
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Erro ao remover membro:', error);
      toast.error('Erro ao remover membro');
    } finally {
      setRemovendo(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#34495e]">
              <UserCog className="w-5 h-5 text-[#89bcbe]" />
              Editar Membro
            </DialogTitle>
            <DialogDescription className="text-[#6c757d]">
              Configure o cargo e remuneracao do membro.
            </DialogDescription>
          </DialogHeader>

          {/* Informacoes do Membro */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#34495e] to-[#46627f] flex items-center justify-center overflow-hidden">
                {membro.avatar_url ? (
                  <img
                    src={membro.avatar_url}
                    alt={membro.nome}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-semibold">
                    {membro.nome
                      ?.split(' ')
                      .map((n) => n[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase() || '??'}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-[#34495e]">{membro.nome}</p>
                <p className="text-sm text-[#6c757d]">{membro.email}</p>
              </div>
              {membro.cargo && (
                <span
                  className="px-2 py-1 rounded text-xs font-medium"
                  style={{
                    backgroundColor: `${membro.cargo.cor}15`,
                    color: membro.cargo.cor || '#64748b',
                  }}
                >
                  {membro.cargo.nome_display}
                </span>
              )}
            </div>
          </div>

          {isDono ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-700">
                O Sócio Administrador do escritório não pode ter seu cargo alterado ou ser removido.
                Apenas as informacoes de remuneracao podem ser editadas.
              </p>
            </div>
          ) : null}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="cargo" className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Cargo
              </TabsTrigger>
              <TabsTrigger value="remuneracao" className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                Remuneracao
              </TabsTrigger>
            </TabsList>

            {/* Tab Cargo */}
            <TabsContent value="cargo" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#34495e]">Cargo</Label>
                <Select
                  value={cargoSelecionado}
                  onValueChange={setCargoSelecionado}
                  disabled={isDono}
                >
                  <SelectTrigger className="border-slate-200 focus:ring-[#89bcbe]">
                    <SelectValue placeholder="Selecione um cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    {cargosDisponiveis.map((cargo) => (
                      <SelectItem key={cargo.id} value={cargo.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: cargo.cor || '#64748b' }}
                          />
                          {cargo.nome_display}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-[#adb5bd]">
                  O cargo define as permissoes do membro no sistema.
                </p>
              </div>
            </TabsContent>

            {/* Tab Remuneracao */}
            <TabsContent value="remuneracao" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#34495e] flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-[#89bcbe]" />
                    Salario Base
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6c757d]">
                      R$
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={remuneracao.salario_base || ''}
                      onChange={(e) =>
                        setRemuneracao((prev) => ({
                          ...prev,
                          salario_base: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="pl-10 border-slate-200 focus:ring-[#89bcbe]"
                      placeholder="0,00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#34495e] flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-[#89bcbe]" />
                    Comissao
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={remuneracao.percentual_comissao || ''}
                      onChange={(e) =>
                        setRemuneracao((prev) => ({
                          ...prev,
                          percentual_comissao: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="pr-8 border-slate-200 focus:ring-[#89bcbe]"
                      placeholder="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#6c757d]">
                      %
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#34495e] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#89bcbe]" />
                    Meta Horas/Mes
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      value={remuneracao.meta_horas_mensal || ''}
                      onChange={(e) =>
                        setRemuneracao((prev) => ({
                          ...prev,
                          meta_horas_mensal: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="pr-8 border-slate-200 focus:ring-[#89bcbe]"
                      placeholder="160"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#6c757d]">
                      h
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#34495e] flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-[#89bcbe]" />
                    Valor/Hora
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6c757d]">
                      R$
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={remuneracao.valor_hora || ''}
                      onChange={(e) =>
                        setRemuneracao((prev) => ({
                          ...prev,
                          valor_hora: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="pl-10 border-slate-200 focus:ring-[#89bcbe]"
                      placeholder="0,00"
                    />
                  </div>
                </div>
              </div>

              <p className="text-xs text-[#adb5bd]">
                Essas informacoes sao usadas para calcular honorarios e comissoes.
              </p>
            </TabsContent>
          </Tabs>

          {/* Botoes */}
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-200">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
                disabled={salvando}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSalvar}
                className="flex-1 bg-gradient-to-r from-[#89bcbe] to-[#6ba9ab] hover:from-[#6ba9ab] hover:to-[#89bcbe] text-white"
                disabled={salvando || !hasChanges()}
              >
                {salvando ? 'Salvando...' : 'Salvar Alteracoes'}
              </Button>
            </div>

            {!isDono && (
              <Button
                variant="ghost"
                onClick={() => setDialogRemoverAberto(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                disabled={salvando}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remover do Escritorio
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmacao de Remocao */}
      <AlertDialog open={dialogRemoverAberto} onOpenChange={setDialogRemoverAberto}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Confirmar Remocao
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{membro.nome}</strong> do escritorio?
              <br />
              <br />
              Esta acao nao pode ser desfeita. O membro perdera acesso a todos os dados e processos
              do escritorio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removendo}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemover}
              disabled={removendo}
              className="bg-red-600 hover:bg-red-700"
            >
              {removendo ? 'Removendo...' : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
