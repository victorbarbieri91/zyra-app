'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mail, RefreshCw, X, Clock } from 'lucide-react';
import { formatBrazilDateTime } from '@/lib/timezone';
import { ConviteEscritorio } from '@/types/escritorio';

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
  return (
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
            convites.map((convite) => (
              <div
                key={convite.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#34495e] truncate">
                    {convite.email}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500">
                      {convite.cargo?.nome_display || convite.role}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Expira {formatBrazilDateTime(convite.expira_em)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onReenviar(convite.id)}
                    className="h-8 w-8 p-0 text-slate-500 hover:text-[#89bcbe] hover:bg-[#89bcbe]/10"
                    title="Reenviar"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCancelar(convite.id)}
                    className="h-8 w-8 p-0 text-slate-500 hover:text-red-500 hover:bg-red-50"
                    title="Cancelar"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
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
  );
}
