'use client';

import { Phone, Mail, MapPin, Building2, User } from 'lucide-react';
import { PessoaResumo, TipoCadastro, TIPO_CADASTRO_LABELS } from '@/types/crm';
import { Badge } from '@/components/ui/badge';

interface PessoaCardProps {
  pessoa: PessoaResumo;
  onClick?: () => void;
}

const tipoCadastroCores: Record<TipoCadastro, string> = {
  cliente: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  prospecto: 'bg-amber-100 text-amber-700 border-amber-200',
  parte_contraria: 'bg-red-100 text-red-700 border-red-200',
  correspondente: 'bg-blue-100 text-blue-700 border-blue-200',
  testemunha: 'bg-purple-100 text-purple-700 border-purple-200',
  perito: 'bg-teal-100 text-teal-700 border-teal-200',
  juiz: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  promotor: 'bg-violet-100 text-violet-700 border-violet-200',
  outros: 'bg-gray-100 text-gray-700 border-gray-200',
};

export function PessoaCard({ pessoa, onClick }: PessoaCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-lg hover:border-[#89bcbe] transition-all duration-200 cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {pessoa.tipo_pessoa === 'pj' ? (
              <Building2 className="w-4 h-4 text-slate-400" />
            ) : (
              <User className="w-4 h-4 text-slate-400" />
            )}
            <h3 className="text-sm font-semibold text-[#34495e] truncate">
              {pessoa.nome_completo}
            </h3>
          </div>
          {pessoa.nome_fantasia && (
            <p className="text-xs text-slate-500 truncate ml-6">{pessoa.nome_fantasia}</p>
          )}
        </div>

        <Badge
          variant="outline"
          className={`ml-2 text-[10px] ${tipoCadastroCores[pessoa.tipo_cadastro]}`}
        >
          {TIPO_CADASTRO_LABELS[pessoa.tipo_cadastro]}
        </Badge>
      </div>

      {/* Informacoes de Contato */}
      <div className="space-y-1.5 mb-3">
        {pessoa.telefone && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Phone className="w-3 h-3 text-[#89bcbe]" />
            <span className="truncate">{pessoa.telefone}</span>
          </div>
        )}
        {pessoa.email && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Mail className="w-3 h-3 text-[#89bcbe]" />
            <span className="truncate">{pessoa.email}</span>
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
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
        <div className="text-center">
          <div className="text-xs font-semibold text-[#34495e]">
            {pessoa.oportunidades_ativas || 0}
          </div>
          <div className="text-[10px] text-slate-500">Oportunidades</div>
        </div>
        <div className="text-center">
          <Badge
            variant={pessoa.status === 'ativo' ? 'default' : 'secondary'}
            className="text-[10px]"
          >
            {pessoa.status}
          </Badge>
        </div>
      </div>

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
