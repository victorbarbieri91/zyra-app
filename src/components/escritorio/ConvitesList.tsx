'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mail, Clock, Check, X, Send, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Convite {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'advogado' | 'assistente';
  status: 'enviado' | 'expirado' | 'aceito' | 'recusado';
  criado_em: string;
  expira_em: string;
}

interface ConvitesListProps {
  convites: Convite[];
  onReenviar: (conviteId: string) => void;
  onCancelar: (conviteId: string) => void;
  onNovo: () => void;
}

const statusConfig = {
  enviado: {
    label: 'Enviado',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: Send,
  },
  expirado: {
    label: 'Expirado',
    color: 'bg-red-100 text-red-700 border-red-200',
    icon: Clock,
  },
  aceito: {
    label: 'Aceito',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: Check,
  },
  recusado: {
    label: 'Recusado',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: X,
  },
};

const roleLabels = {
  owner: 'Proprietário',
  admin: 'Administrador',
  advogado: 'Advogado',
  assistente: 'Assistente',
};

export function ConvitesList({ convites, onReenviar, onCancelar, onNovo }: ConvitesListProps) {
  const convitesPendentes = convites.filter((c) => c.status === 'enviado');

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#89bcbe]" />
            <CardTitle className="text-base font-medium text-[#34495e]">
              Convites Pendentes
            </CardTitle>
            {convitesPendentes.length > 0 && (
              <Badge variant="secondary" className="bg-[#89bcbe]/10 text-[#89bcbe] border-[#89bcbe]/20">
                {convitesPendentes.length}
              </Badge>
            )}
          </div>
          <Button
            size="sm"
            onClick={onNovo}
            className="h-8 bg-gradient-to-r from-[#89bcbe] to-[#6ba9ab] hover:from-[#6ba9ab] hover:to-[#89bcbe] text-white"
          >
            <UserPlus className="w-3.5 h-3.5 mr-1.5" />
            Convidar
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {convites.length === 0 ? (
          <div className="text-center py-8">
            <Mail className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-sm text-[#adb5bd] mb-4">Nenhum convite enviado ainda</p>
            <Button
              size="sm"
              variant="outline"
              onClick={onNovo}
              className="border-[#89bcbe] text-[#89bcbe] hover:bg-[#89bcbe]/10"
            >
              Enviar Primeiro Convite
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-[280px] pr-3">
            <div className="space-y-3">
              {convites.map((convite) => {
                const statusInfo = statusConfig[convite.status];
                const StatusIcon = statusInfo.icon;

                return (
                  <div
                    key={convite.id}
                    className="p-3 bg-slate-50/50 rounded-lg border border-slate-200 hover:border-[#89bcbe]/30 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#34495e] truncate">
                          {convite.email}
                        </p>
                        <p className="text-xs text-[#adb5bd]">
                          {roleLabels[convite.role]}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn('ml-2 text-[10px] border', statusInfo.color)}
                      >
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusInfo.label}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-xs text-[#6c757d] mb-2">
                      <span>
                        Enviado{' '}
                        {new Date(convite.criado_em).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </span>
                      {convite.status === 'enviado' && (
                        <span className="text-[#adb5bd]">
                          Expira em{' '}
                          {new Date(convite.expira_em).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </span>
                      )}
                    </div>

                    {(convite.status === 'enviado' || convite.status === 'expirado') && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onReenviar(convite.id)}
                          className="h-7 text-xs text-[#89bcbe] hover:text-[#6ba9ab] hover:bg-[#89bcbe]/10 flex-1"
                        >
                          <Send className="w-3 h-3 mr-1" />
                          Reenviar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onCancelar(convite.id)}
                          className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 flex-1"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Cancelar
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
