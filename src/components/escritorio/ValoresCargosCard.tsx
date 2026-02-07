'use client';

import { useState, useRef } from 'react';
import { DollarSign, Clock } from 'lucide-react';
import { Cargo } from '@/types/escritorio';
import { cn } from '@/lib/utils';

interface ValoresCargosCardProps {
  cargos: Cargo[];
  onUpdateValorHora: (cargoId: string, valorHora: number | null) => Promise<boolean>;
  carregando?: boolean;
}

const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

export function ValoresCargosCard({
  cargos,
  onUpdateValorHora,
  carregando = false,
}: ValoresCargosCardProps) {
  // raw = valor digitado como string enquanto focused, keyed por cargo.id
  const [rawValues, setRawValues] = useState<Record<string, string>>({});
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const valoresAtuais = useRef<Record<string, number>>({});

  const cargosOrdenados = [...cargos].sort((a, b) => a.nivel - b.nivel);

  const getValor = (cargo: Cargo): number => {
    return valoresAtuais.current[cargo.id] ?? cargo.valor_hora_padrao ?? 0;
  };

  const handleFocus = (cargo: Cargo) => {
    setFocusedId(cargo.id);
    const valor = getValor(cargo);
    // Mostra número limpo: "350" ou "" se zero
    setRawValues((prev) => ({
      ...prev,
      [cargo.id]: valor > 0 ? String(valor).replace('.', ',') : '',
    }));
  };

  const handleChange = (cargoId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    // Permite apenas dígitos e vírgula
    const cleaned = e.target.value.replace(/[^\d,]/g, '');
    setRawValues((prev) => ({ ...prev, [cargoId]: cleaned }));
  };

  const parseRawToNumber = (raw: string): number => {
    if (!raw.trim()) return 0;
    // "350,50" → 350.50
    const normalized = raw.replace(',', '.');
    const num = parseFloat(normalized);
    return isNaN(num) ? 0 : num;
  };

  const salvar = async (cargoId: string, valor: number) => {
    setSalvandoId(cargoId);
    valoresAtuais.current[cargoId] = valor;
    await onUpdateValorHora(cargoId, valor || null);
    setSalvandoId(null);
  };

  const handleBlur = (cargoId: string) => {
    setFocusedId(null);
    const raw = rawValues[cargoId] ?? '';
    const valor = parseRawToNumber(raw);
    salvar(cargoId, valor);
    // Limpa raw pra voltar a mostrar o formatado
    setRawValues((prev) => {
      const next = { ...prev };
      delete next[cargoId];
      return next;
    });
  };

  const handleKeyDown = (cargoId: string, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
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

      {/* Lista de cargos */}
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
          <div className="grid grid-cols-2 gap-2">
            {cargosOrdenados.map((cargo) => {
              const valor = getValor(cargo);
              const isFocused = focusedId === cargo.id;
              const isSalvando = salvandoId === cargo.id;
              const isEditing = cargo.id in rawValues;

              return (
                <div
                  key={cargo.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg transition-colors',
                    isFocused ? 'bg-blue-50 ring-1 ring-blue-300' : 'bg-slate-50 hover:bg-slate-100'
                  )}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cargo.cor || '#64748b' }}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-[#34495e] truncate block">
                      {cargo.nome_display}
                    </span>
                  </div>
                  <div className="relative flex-shrink-0">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={isEditing ? rawValues[cargo.id] : formatCurrency(valor)}
                      onChange={(e) => handleChange(cargo.id, e)}
                      onFocus={() => handleFocus(cargo)}
                      onBlur={() => handleBlur(cargo.id)}
                      onKeyDown={(e) => handleKeyDown(cargo.id, e)}
                      placeholder="0"
                      className={cn(
                        'w-28 h-7 pr-6 pl-2 text-xs text-right font-medium rounded-md border bg-white transition-colors cursor-text',
                        'focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400',
                        isSalvando && 'opacity-60',
                        !isEditing && valor > 0 ? 'text-emerald-600 border-slate-200' : 'text-slate-500 border-slate-200'
                      )}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">/h</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
        <p className="text-xs text-[#6c757d]">
          <Clock className="w-3 h-3 inline mr-1" />
          Valores usados no cálculo de timesheet. Podem ser personalizados por contrato.
        </p>
      </div>
    </div>
  );
}
