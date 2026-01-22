'use client';

import { DollarSign, Calendar, TrendingUp, User, MessageSquare } from 'lucide-react';
import { OportunidadeComDados, ETAPA_COLORS, AREA_JURIDICA_LABELS } from '@/types/crm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface OportunidadeCardProps {
  oportunidade: OportunidadeComDados;
  onClick?: () => void;
  onRegistrarInteracao?: (oportunidadeId: string, pessoaId: string, pessoaNome: string) => void;
}

export function OportunidadeCard({ oportunidade, onClick, onRegistrarInteracao }: OportunidadeCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const probabilidadeCor = (prob: number) => {
    if (prob >= 75) return 'bg-emerald-100 text-emerald-700';
    if (prob >= 50) return 'bg-amber-100 text-amber-700';
    return 'bg-slate-100 text-slate-600';
  };

  const etapaCor = ETAPA_COLORS[oportunidade.etapa] || '#94a3b8';

  return (
    <div
      onClick={onClick}
      className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-lg transition-all duration-200 cursor-pointer group"
      style={{
        borderLeft: `4px solid ${etapaCor}`,
      }}
    >
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-sm font-semibold text-[#34495e] line-clamp-2 flex-1">
            {oportunidade.titulo}
          </h3>
          {oportunidade.probabilidade !== null && oportunidade.probabilidade !== undefined && (
            <Badge
              variant="secondary"
              className={`text-[10px] ${probabilidadeCor(oportunidade.probabilidade)}`}
            >
              {oportunidade.probabilidade}%
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600">
          <User className="w-3 h-3" />
          <span className="truncate">{oportunidade.pessoa_nome}</span>
        </div>
      </div>

      {/* Valor */}
      {oportunidade.valor_estimado !== null && oportunidade.valor_estimado !== undefined && (
        <div className="mb-3 flex items-center gap-2">
          <div className="flex-1 bg-gradient-to-r from-[#f0f9f9] to-[#e8f5f5] rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
              <DollarSign className="w-3 h-3 text-[#89bcbe]" />
              <span>Valor Estimado</span>
            </div>
            <div className="text-lg font-bold text-[#34495e]">
              {formatCurrency(oportunidade.valor_estimado)}
            </div>
          </div>
        </div>
      )}

      {/* Metadados */}
      <div className="space-y-1.5 mb-3 text-xs text-slate-600">
        {oportunidade.area_juridica && (
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3 h-3 text-[#89bcbe]" />
            <span>{AREA_JURIDICA_LABELS[oportunidade.area_juridica]}</span>
          </div>
        )}
        {oportunidade.data_prevista_fechamento && (
          <div className="flex items-center gap-2">
            <Calendar className="w-3 h-3 text-[#89bcbe]" />
            <span>
              Prev. fechamento:{' '}
              {new Date(oportunidade.data_prevista_fechamento).toLocaleDateString('pt-BR')}
            </span>
          </div>
        )}
      </div>

      {/* Tags */}
      {oportunidade.tags && oportunidade.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {oportunidade.tags.slice(0, 3).map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="text-[10px] bg-slate-100 text-slate-600"
            >
              {tag}
            </Badge>
          ))}
          {oportunidade.tags.length > 3 && (
            <Badge
              variant="secondary"
              className="text-[10px] bg-slate-100 text-slate-600"
            >
              +{oportunidade.tags.length - 3}
            </Badge>
          )}
        </div>
      )}

      {/* Footer com Acoes */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-500">
          {oportunidade.interacoes?.length || 0} interacoes
        </span>
        {onRegistrarInteracao ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onRegistrarInteracao(oportunidade.id, oportunidade.pessoa_id, oportunidade.pessoa_nome);
            }}
          >
            <MessageSquare className="w-3 h-3" />
            Interacao
          </Button>
        ) : (
          <span className="text-slate-400">{oportunidade.responsavel_nome}</span>
        )}
      </div>
    </div>
  );
}
