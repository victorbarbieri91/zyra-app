'use client';

import { Phone, Mail, MessageCircle, MapPin, Clock, TrendingUp } from 'lucide-react';
import { PessoaResumo, TipoContato } from '@/types/crm';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PessoaCardProps {
  pessoa: PessoaResumo;
  onClick?: () => void;
}

const tipoContatoLabels: Record<TipoContato, string> = {
  cliente: 'Cliente',
  parte_contraria: 'Parte Contrária',
  correspondente: 'Correspondente',
  testemunha: 'Testemunha',
  perito: 'Perito',
  juiz: 'Juiz',
  promotor: 'Promotor',
  outros: 'Outros',
};

const tipoContatoCores: Record<TipoContato, string> = {
  cliente: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  parte_contraria: 'bg-red-100 text-red-700 border-red-200',
  correspondente: 'bg-blue-100 text-blue-700 border-blue-200',
  testemunha: 'bg-amber-100 text-amber-700 border-amber-200',
  perito: 'bg-purple-100 text-purple-700 border-purple-200',
  juiz: 'bg-slate-100 text-slate-700 border-slate-200',
  promotor: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  outros: 'bg-gray-100 text-gray-700 border-gray-200',
};

export function PessoaCard({ pessoa, onClick }: PessoaCardProps) {
  const diasSemContato = pessoa.dias_sem_contato;
  const temAlertas = diasSemContato && diasSemContato > 30;

  return (
    <div
      onClick={onClick}
      className={`
        bg-white border border-slate-200 rounded-lg p-4
        hover:shadow-lg hover:border-[#89bcbe] transition-all duration-200 cursor-pointer
        ${temAlertas ? 'border-l-4 border-l-amber-500' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[#34495e] truncate">
            {pessoa.nome_completo}
          </h3>
          {pessoa.nome_fantasia && (
            <p className="text-xs text-slate-500 truncate">{pessoa.nome_fantasia}</p>
          )}
        </div>

        <Badge
          variant="outline"
          className={`ml-2 text-[10px] ${tipoContatoCores[pessoa.tipo_contato]}`}
        >
          {tipoContatoLabels[pessoa.tipo_contato]}
        </Badge>
      </div>

      {/* Informações de Contato */}
      <div className="space-y-1.5 mb-3">
        {pessoa.celular && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Phone className="w-3 h-3 text-[#89bcbe]" />
            <span className="truncate">{pessoa.celular}</span>
          </div>
        )}
        {pessoa.email_principal && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Mail className="w-3 h-3 text-[#89bcbe]" />
            <span className="truncate">{pessoa.email_principal}</span>
          </div>
        )}
        {(pessoa.cidade || pessoa.uf) && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <MapPin className="w-3 h-3 text-[#89bcbe]" />
            <span className="truncate">
              {pessoa.cidade}
              {pessoa.cidade && pessoa.uf && ', '}
              {pessoa.uf}
            </span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
        <div className="text-center">
          <div className="text-xs font-semibold text-[#34495e]">
            {pessoa.total_interacoes}
          </div>
          <div className="text-[10px] text-slate-500">Interações</div>
        </div>
        <div className="text-center">
          <div className="text-xs font-semibold text-[#34495e]">
            {pessoa.oportunidades_ativas}
          </div>
          <div className="text-[10px] text-slate-500">Oportunidades</div>
        </div>
        <div className="text-center">
          <div className="text-xs font-semibold text-[#34495e]">
            {pessoa.total_processos}
          </div>
          <div className="text-[10px] text-slate-500">Processos</div>
        </div>
      </div>

      {/* Última Interação / Alertas */}
      {diasSemContato !== null && diasSemContato !== undefined && (
        <div
          className={`mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs ${
            temAlertas ? 'text-amber-600' : 'text-slate-500'
          }`}
        >
          <Clock className="w-3 h-3" />
          <span>
            {diasSemContato === 0
              ? 'Contato hoje'
              : diasSemContato === 1
              ? 'Último contato há 1 dia'
              : `Último contato há ${diasSemContato} dias`}
          </span>
        </div>
      )}

      {/* Follow-ups Pendentes */}
      {pessoa.follow_ups_pendentes > 0 && (
        <div className="mt-2 flex items-center gap-2 text-xs text-blue-600">
          <MessageCircle className="w-3 h-3" />
          <span>{pessoa.follow_ups_pendentes} follow-up(s) pendente(s)</span>
        </div>
      )}

      {/* Tags */}
      {pessoa.tags && pessoa.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {pessoa.tags.slice(0, 3).map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="text-[10px] bg-slate-100 text-slate-600"
            >
              {tag}
            </Badge>
          ))}
          {pessoa.tags.length > 3 && (
            <Badge
              variant="secondary"
              className="text-[10px] bg-slate-100 text-slate-600"
            >
              +{pessoa.tags.length - 3}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
