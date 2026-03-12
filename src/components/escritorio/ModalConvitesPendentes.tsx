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
import { Mail, RefreshCw, X, Clock } from 'lucide-react';
import { ConviteEscritorio } from '@/types/escritorio';

function getTempoRestante(expiraEm: string): string {
  const agora = new Date();
  const expiracao = new Date(expiraEm);
  const diffMs = expiracao.getTime() - agora.getTime();

  if (diffMs <= 0) return 'Expirado';

  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHoras = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (diffDias > 1) return `Expira em ${diffDias} dias`;
  if (diffDias === 1) return `Expira em 1 dia`;
  if (diffHoras > 1) return `Expira em ${diffHoras} horas`;
  if (diffHoras === 1) return `Expira em 1 hora`;
  return 'Expira em breve';
}

interface ModalConvitesPendentesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  convites: ConviteEscritorio[];
  onReenviar: (id: string) => Promise<void>;
  onCancelar: (id: string) => Promise<void>;
}

export function ModalConvitesPendentes({
  open,
  onOpenChange,
  convites,
  onReenviar,
  onCancelar,
}: ModalConvitesPendentesProps) {
  const [confirmCancelar, setConfirmCancelar] = useState<{ id: string; email: string } | null>(null);
  const [reenviando, setReenviando] = useState<string | null>(null);

  const handleReenviar = async (id: string) => {
    setReenviando(id);
    try {
      await onReenviar(id);
    } finally {
      setReenviando(null);
    }
  };

  const handleConfirmarCancelamento = async () => {
    if (!confirmCancelar) return;
    await onCancelar(confirmCancelar.id);
    setConfirmCancelar(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#34495e]">
              <Mail className="w-5 h-5 text-amber-500" />
              Convites Pendentes
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              {convites.length} convite{convites.length !== 1 ? 's' : ''} aguardando aceitação
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {convites.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">
                Nenhum convite pendente
              </p>
            ) : (
              convites.map((convite) => {
                const tempoRestante = getTempoRestante(convite.expira_em);
                const expirado = tempoRestante === 'Expirado';

                return (
                  <div
                    key={convite.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${expirado ? 'bg-red-50' : 'bg-slate-50'}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#34495e] truncate">
                        {convite.email}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-500">
                          {convite.cargo?.nome_display || convite.role}
                        </span>
                        <span className="text-slate-300">&bull;</span>
                        <span className={`text-xs flex items-center gap-1 ${expirado ? 'text-red-500' : 'text-slate-400'}`}>
                          <Clock className="w-3 h-3" />
                          {tempoRestante}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReenviar(convite.id)}
                        disabled={reenviando === convite.id}
                        className="h-8 w-8 p-0 text-slate-500 hover:text-[#89bcbe] hover:bg-[#89bcbe]/10"
                        title="Reenviar convite"
                      >
                        <RefreshCw className={`w-4 h-4 ${reenviando === convite.id ? 'animate-spin' : ''}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmCancelar({ id: convite.id, email: convite.email })}
                        className="h-8 w-8 p-0 text-slate-500 hover:text-red-500 hover:bg-red-50"
                        title="Cancelar convite"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmCancelar} onOpenChange={(open) => !open && setConfirmCancelar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar convite?</AlertDialogTitle>
            <AlertDialogDescription>
              O convite para <strong>{confirmCancelar?.email}</strong> será removido permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarCancelamento}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Cancelar Convite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
