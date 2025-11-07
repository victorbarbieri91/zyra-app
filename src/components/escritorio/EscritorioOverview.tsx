'use client';

import { Building2, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Escritorio } from '@/lib/supabase/escritorio-helpers';

interface EscritorioOverviewProps {
  escritorio: Escritorio;
  onEdit: () => void;
}

const getPlanoBadge = (plano: string) => {
  const badges: Record<string, { label: string; class: string }> = {
    free: { label: 'Free', class: 'bg-slate-100 text-slate-700' },
    basic: { label: 'Basic', class: 'bg-blue-100 text-blue-700' },
    professional: { label: 'Professional', class: 'bg-gradient-to-r from-[#89bcbe] to-[#6ba9ab] text-white' },
    enterprise: { label: 'Enterprise', class: 'bg-gradient-to-r from-[#34495e] to-[#46627f] text-white' },
  };
  return badges[plano] || badges.free;
};

export function EscritorioOverview({ escritorio, onEdit }: EscritorioOverviewProps) {
  const planoBadge = getPlanoBadge(escritorio.plano);

  const formatCNPJ = (cnpj?: string) => {
    if (!cnpj) return 'Não informado';
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  };

  return (
    <Card className="border-[#89bcbe] shadow-lg bg-gradient-to-br from-white to-[#f0f9f9]/30">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            {/* Logo/Icon */}
            <div className="w-16 h-16 bg-gradient-to-br from-[#89bcbe] to-[#6ba9ab] rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md">
              {escritorio.logo_url ? (
                <img
                  src={escritorio.logo_url}
                  alt={escritorio.nome}
                  className="w-full h-full rounded-2xl object-cover"
                />
              ) : (
                <Building2 className="w-8 h-8 text-white" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-[#34495e] mb-1 truncate">
                {escritorio.nome}
              </h3>
              <p className="text-xs text-[#6c757d] mb-2">
                CNPJ: {formatCNPJ(escritorio.cnpj)}
              </p>
              <Badge className={`text-[10px] px-2 py-1 ${planoBadge.class}`}>
                Plano {planoBadge.label}
              </Badge>
            </div>
          </div>

          {/* Edit Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="text-[#46627f] hover:text-[#34495e]"
          >
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="bg-white/60 rounded-lg p-3 border border-[#89bcbe]/20">
            <p className="text-[10px] font-medium text-[#46627f] mb-1">Criado em</p>
            <p className="text-sm font-semibold text-[#34495e]">
              {new Date(escritorio.created_at).toLocaleDateString('pt-BR')}
            </p>
          </div>

          <div className="bg-white/60 rounded-lg p-3 border border-[#89bcbe]/20">
            <p className="text-[10px] font-medium text-[#46627f] mb-1">Status</p>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${escritorio.ativo ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <p className="text-sm font-semibold text-[#34495e]">
                {escritorio.ativo ? 'Ativo' : 'Inativo'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
