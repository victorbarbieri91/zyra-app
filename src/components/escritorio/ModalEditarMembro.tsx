'use client';

import { useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { UserCog, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { atualizarRoleMembro, removerMembroEscritorio } from '@/lib/supabase/escritorio-helpers';
import { cn } from '@/lib/utils';

interface Membro {
  id: string;
  usuario_id: string;
  nome: string;
  email: string;
  role: 'owner' | 'admin' | 'advogado' | 'assistente';
  avatar_url?: string;
}

interface ModalEditarMembroProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  membro: Membro | null;
  escritorioId: string;
  onSuccess?: () => void;
}

const roleLabels = {
  owner: 'Proprietário',
  admin: 'Administrador',
  advogado: 'Advogado',
  assistente: 'Assistente',
};

const roleBadgeColors = {
  owner: 'bg-gradient-to-r from-[#34495e] to-[#46627f] text-white border-0',
  admin: 'bg-gradient-to-r from-[#89bcbe] to-[#6ba9ab] text-white border-0',
  advogado: 'bg-blue-100 text-blue-700 border-blue-200',
  assistente: 'bg-slate-100 text-slate-700 border-slate-200',
};

export function ModalEditarMembro({
  open,
  onOpenChange,
  membro,
  escritorioId,
  onSuccess,
}: ModalEditarMembroProps) {
  const [salvando, setSalvando] = useState(false);
  const [removendo, setRemovendo] = useState(false);
  const [novaRole, setNovaRole] = useState<string>(membro?.role || 'advogado');
  const [dialogRemoverAberto, setDialogRemoverAberto] = useState(false);

  if (!membro) return null;

  const isOwner = membro.role === 'owner';
  const roleAlterada = novaRole !== membro.role;

  const handleSalvar = async () => {
    if (!roleAlterada) {
      toast.info('Nenhuma alteração foi feita');
      return;
    }

    setSalvando(true);
    try {
      const sucesso = await atualizarRoleMembro(
        membro.id,
        novaRole as 'admin' | 'advogado' | 'assistente' | 'readonly'
      );

      if (sucesso) {
        toast.success('Função do membro atualizada com sucesso');
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        toast.error('Erro ao atualizar função do membro');
      }
    } catch (error) {
      console.error('Erro ao atualizar membro:', error);
      toast.error('Erro ao atualizar função do membro');
    } finally {
      setSalvando(false);
    }
  };

  const handleRemover = async () => {
    setRemovendo(true);
    try {
      const sucesso = await removerMembroEscritorio(membro.id);

      if (sucesso) {
        toast.success('Membro removido do escritório');
        setDialogRemoverAberto(false);
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        toast.error('Erro ao remover membro');
      }
    } catch (error) {
      console.error('Erro ao remover membro:', error);
      toast.error('Erro ao remover membro');
    } finally {
      setRemovendo(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#34495e]">
              <UserCog className="w-5 h-5 text-[#89bcbe]" />
              Editar Membro
            </DialogTitle>
            <DialogDescription className="text-[#6c757d]">
              Altere a função do membro ou remova-o do escritório.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Informações do Membro */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#34495e] to-[#46627f] flex items-center justify-center text-white font-semibold">
                  {membro.nome
                    ?.split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase() || '??'}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[#34495e]">{membro.nome}</p>
                  <p className="text-sm text-[#6c757d]">{membro.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#adb5bd]">Função atual:</span>
                <Badge variant="outline" className={cn('text-xs border', roleBadgeColors[membro.role])}>
                  {roleLabels[membro.role]}
                </Badge>
              </div>
            </div>

            {/* Alterar Função */}
            {!isOwner && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#34495e]">Nova Função</label>
                <Select value={novaRole} onValueChange={setNovaRole}>
                  <SelectTrigger className="border-slate-200 focus:ring-[#89bcbe]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="advogado">Advogado</SelectItem>
                    <SelectItem value="assistente">Assistente</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-[#adb5bd]">
                  Apenas o proprietário pode transferir a propriedade do escritório.
                </p>
              </div>
            )}

            {isOwner && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-700">
                  ⚠️ Não é possível alterar a função ou remover o proprietário do escritório.
                </p>
              </div>
            )}

            {/* Botões */}
            <div className="flex flex-col gap-2 pt-2">
              {!isOwner && (
                <>
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
                      disabled={salvando || !roleAlterada}
                    >
                      {salvando ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                  </div>

                  <div className="border-t border-slate-200 pt-2 mt-2">
                    <Button
                      variant="destructive"
                      onClick={() => setDialogRemoverAberto(true)}
                      className="w-full"
                      disabled={salvando}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remover do Escritório
                    </Button>
                  </div>
                </>
              )}

              {isOwner && (
                <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
                  Fechar
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Remoção */}
      <AlertDialog open={dialogRemoverAberto} onOpenChange={setDialogRemoverAberto}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Confirmar Remoção
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{membro.nome}</strong> do escritório?
              <br />
              <br />
              Esta ação não pode ser desfeita. O membro perderá acesso a todos os dados e processos
              do escritório.
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
