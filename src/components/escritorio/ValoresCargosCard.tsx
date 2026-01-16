'use client';

import { useState } from 'react';
import { DollarSign, Clock, Check, X, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Cargo } from '@/types/escritorio';
import { cn } from '@/lib/utils';

interface ValoresCargosCardProps {
  cargos: Cargo[];
  onUpdateValorHora: (cargoId: string, valorHora: number | null) => Promise<boolean>;
  carregando?: boolean;
}

export function ValoresCargosCard({
  cargos,
  onUpdateValorHora,
  carregando = false,
}: ValoresCargosCardProps) {
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [valorEditando, setValorEditando] = useState<string>('');
  const [salvando, setSalvando] = useState(false);

  // Ordenar cargos por nível
  const cargosOrdenados = [...cargos].sort((a, b) => a.nivel - b.nivel);

  const iniciarEdicao = (cargo: Cargo) => {
    setEditandoId(cargo.id);
    setValorEditando(cargo.valor_hora_padrao?.toString() || '');
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setValorEditando('');
  };

  const salvarEdicao = async (cargoId: string) => {
    setSalvando(true);
    const valorNumerico = valorEditando ? parseFloat(valorEditando) : null;
    const sucesso = await onUpdateValorHora(cargoId, valorNumerico);
    if (sucesso) {
      setEditandoId(null);
      setValorEditando('');
    }
    setSalvando(false);
  };

  const formatarValor = (valor: number | null) => {
    if (valor === null) return '—';
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#34495e]">Valores por Cargo</h3>
            <p className="text-xs text-[#6c757d]">Valor hora padrão para timesheet</p>
          </div>
        </div>
      </div>

      {/* Tabela de valores */}
      <div className="flex-1 p-4">
        {carregando ? (
          <div className="text-center py-6 text-[#6c757d]">
            <Clock className="w-6 h-6 mx-auto mb-2 animate-pulse" />
            <p className="text-sm">Carregando...</p>
          </div>
        ) : cargosOrdenados.length === 0 ? (
          <div className="text-center py-6 text-[#6c757d]">
            <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhum cargo configurado</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cargosOrdenados.map((cargo) => {
              const isEditando = editandoId === cargo.id;

              return (
                <div
                  key={cargo.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg transition-colors',
                    isEditando ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50 hover:bg-slate-100'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cargo.cor || '#64748b' }}
                    />
                    <span className="text-sm font-medium text-[#34495e]">
                      {cargo.nome_display}
                    </span>
                  </div>

                  {isEditando ? (
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                          R$
                        </span>
                        <Input
                          type="number"
                          value={valorEditando}
                          onChange={(e) => setValorEditando(e.target.value)}
                          className="w-32 pl-10 h-8 text-sm"
                          placeholder="0,00"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') salvarEdicao(cargo.id);
                            if (e.key === 'Escape') cancelarEdicao();
                          }}
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => salvarEdicao(cargo.id)}
                        disabled={salvando}
                        className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancelarEdicao}
                        disabled={salvando}
                        className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'text-sm font-medium',
                          cargo.valor_hora_padrao ? 'text-emerald-600' : 'text-slate-400'
                        )}
                      >
                        {formatarValor(cargo.valor_hora_padrao)}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => iniciarEdicao(cargo)}
                        className="h-7 w-7 p-0 text-slate-400 hover:text-[#34495e] hover:bg-slate-200"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer com dica */}
      <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
        <p className="text-xs text-[#6c757d]">
          <Clock className="w-3 h-3 inline mr-1" />
          Valores usados no cálculo de timesheet. Podem ser personalizados por contrato.
        </p>
      </div>
    </div>
  );
}
