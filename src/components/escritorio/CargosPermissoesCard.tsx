'use client';

import { Shield, Settings, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Cargo, CARGO_LABELS } from '@/types/escritorio';

interface CargosPermissoesCardProps {
  cargos: Cargo[];
  onConfigurar: () => void;
}

export function CargosPermissoesCard({ cargos, onConfigurar }: CargosPermissoesCardProps) {
  // Ordenar cargos por nível
  const cargosOrdenados = [...cargos].sort((a, b) => a.nivel - b.nivel);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-[#46627f]" />
          <div>
            <h3 className="text-sm font-semibold text-[#34495e]">Cargos e Permissões</h3>
            <p className="text-xs text-[#6c757d]">{cargos.length} cargos configurados</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onConfigurar}
          className="text-[#46627f] hover:text-[#34495e] hover:bg-slate-50"
        >
          <Settings className="w-4 h-4 mr-1.5" />
          Configurar
        </Button>
      </div>

      {/* Lista de cargos */}
      <div className="flex-1 p-4">
        {cargosOrdenados.length === 0 ? (
          <div className="text-center py-6 text-[#6c757d]">
            <Shield className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhum cargo configurado</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {cargosOrdenados.map((cargo) => (
              <div
                key={cargo.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-slate-50"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cargo.cor || '#64748b' }}
                />
                <span className="text-sm text-[#34495e] truncate">
                  {cargo.nome_display}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-100">
        <Button
          variant="outline"
          size="sm"
          onClick={onConfigurar}
          className="w-full border-slate-200 text-[#34495e]"
        >
          Gerenciar Permissões
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
