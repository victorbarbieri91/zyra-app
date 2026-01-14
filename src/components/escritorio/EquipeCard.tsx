'use client';

import { Users, UserPlus, ChevronRight, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MembroCompleto } from '@/types/escritorio';

interface EquipeCardProps {
  membros: MembroCompleto[];
  onConvidar: () => void;
  onVerTodos: () => void;
  onEditarMembro: (membro: MembroCompleto) => void;
}

export function EquipeCard({ membros, onConvidar, onVerTodos, onEditarMembro }: EquipeCardProps) {
  // Mostrar apenas os primeiros 4 membros
  const membrosExibidos = membros.slice(0, 4);
  const totalMembros = membros.length;
  const temMais = totalMembros > 4;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-[#46627f]" />
          <div>
            <h3 className="text-sm font-semibold text-[#34495e]">Equipe</h3>
            <p className="text-xs text-[#6c757d]">{totalMembros} membro{totalMembros !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onConvidar}
          className="text-[#46627f] hover:text-[#34495e] hover:bg-slate-50"
        >
          <UserPlus className="w-4 h-4 mr-1.5" />
          Convidar
        </Button>
      </div>

      {/* Lista de membros */}
      <div className="flex-1 p-3 space-y-2">
        {membrosExibidos.length === 0 ? (
          <div className="text-center py-6 text-[#6c757d]">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhum membro ainda</p>
            <p className="text-xs">Convide pessoas para seu escritório</p>
          </div>
        ) : (
          membrosExibidos.map((membro) => (
            <button
              key={membro.id}
              onClick={() => onEditarMembro(membro)}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors text-left group"
            >
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {membro.avatar_url ? (
                  <img
                    src={membro.avatar_url}
                    alt={membro.nome}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-4 h-4 text-slate-400" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#34495e] truncate">
                  {membro.nome}
                </p>
                <div className="flex items-center gap-2">
                  {membro.cargo && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded font-medium"
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

              {/* Chevron */}
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
            </button>
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
            Ver todos ({totalMembros})
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
