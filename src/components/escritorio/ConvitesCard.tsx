'use client';

import { Mail, Send, ChevronRight, Clock, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConviteEscritorio } from '@/types/escritorio';
import { formatBrazilDateTime } from '@/lib/timezone';

interface ConvitesCardProps {
  convites: ConviteEscritorio[];
  onNovo: () => void;
  onReenviar: (conviteId: string) => void;
  onCancelar: (conviteId: string) => void;
  onVerTodos: () => void;
}

export function ConvitesCard({ convites, onNovo, onReenviar, onCancelar, onVerTodos }: ConvitesCardProps) {
  // Filtrar apenas convites pendentes (não aceitos e não expirados)
  const now = new Date();
  const convitesPendentes = convites.filter((c) => {
    const expiraEm = new Date(c.expira_em);
    return !c.aceito && expiraEm > now;
  });

  // Mostrar apenas os primeiros 3 convites
  const convitesExibidos = convitesPendentes.slice(0, 3);
  const totalPendentes = convitesPendentes.length;
  const temMais = totalPendentes > 3;

  const isExpirando = (expiraEm: string) => {
    const expiracao = new Date(expiraEm);
    const horasRestantes = (expiracao.getTime() - now.getTime()) / (1000 * 60 * 60);
    return horasRestantes < 48;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mail className="w-5 h-5 text-[#46627f]" />
          <div>
            <h3 className="text-sm font-semibold text-[#34495e]">Convites Pendentes</h3>
            <p className="text-xs text-[#6c757d]">
              {totalPendentes} aguardando aceite
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onNovo}
          className="text-[#46627f] hover:text-[#34495e] hover:bg-slate-50"
        >
          <Send className="w-4 h-4 mr-1.5" />
          Novo
        </Button>
      </div>

      {/* Lista de convites */}
      <div className="flex-1 p-3 space-y-2">
        {convitesExibidos.length === 0 ? (
          <div className="text-center py-6 text-[#6c757d]">
            <Mail className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhum convite pendente</p>
            <p className="text-xs">Convide membros para seu escritório</p>
          </div>
        ) : (
          convitesExibidos.map((convite) => (
            <div
              key={convite.id}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 group"
            >
              {/* Iniciais do email */}
              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-[#46627f]">
                  {convite.email.substring(0, 2).toUpperCase()}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#34495e] truncate">
                  {convite.email}
                </p>
                <div className="flex items-center gap-2">
                  {convite.cargo && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded font-medium"
                      style={{
                        backgroundColor: `${convite.cargo.cor}15`,
                        color: convite.cargo.cor || '#64748b',
                      }}
                    >
                      {convite.cargo.nome_display}
                    </span>
                  )}
                  <span className={`text-xs flex items-center gap-1 ${
                    isExpirando(convite.expira_em) ? 'text-amber-600' : 'text-slate-500'
                  }`}>
                    <Clock className="w-3 h-3" />
                    {isExpirando(convite.expira_em) ? 'Expirando' : 'Enviado'}
                  </span>
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onReenviar(convite.id)}
                  className="w-7 h-7 text-[#6c757d] hover:text-[#1E3A8A]"
                  title="Reenviar"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onCancelar(convite.id)}
                  className="w-7 h-7 text-[#6c757d] hover:text-red-600"
                  title="Cancelar"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {temMais && (
        <div className="px-4 py-3 border-t border-slate-100">
          <Button
            variant="ghost"
            size="sm"
            onClick={onVerTodos}
            className="w-full text-[#6c757d] hover:text-[#34495e]"
          >
            Ver todos ({totalPendentes})
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
