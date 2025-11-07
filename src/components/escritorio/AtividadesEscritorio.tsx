'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserPlus, UserMinus, Settings, TrendingUp, Shield, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Atividade {
  id: string;
  tipo: 'membro_adicionado' | 'membro_removido' | 'config_alterada' | 'plano_atualizado' | 'convite_enviado';
  titulo: string;
  descricao: string;
  data: string;
  usuario?: string;
}

interface AtividadesEscritorioProps {
  atividades: Atividade[];
}

const atividadeConfig = {
  membro_adicionado: {
    icon: UserPlus,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  membro_removido: {
    icon: UserMinus,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
  },
  config_alterada: {
    icon: Settings,
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-600',
  },
  plano_atualizado: {
    icon: TrendingUp,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
  },
  convite_enviado: {
    icon: Mail,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
  },
};

function TimelineItem({ atividade, isLast }: { atividade: Atividade; isLast: boolean }) {
  const config = atividadeConfig[atividade.tipo];
  const Icon = config.icon;

  const dataFormatada = new Date(atividade.data).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="relative flex gap-3 pb-4">
      {/* Linha vertical */}
      {!isLast && (
        <div className="absolute left-4 top-9 w-px h-[calc(100%-12px)] bg-slate-200" />
      )}

      {/* Ícone */}
      <div
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 z-10',
          config.iconBg
        )}
      >
        <Icon className={cn('w-4 h-4', config.iconColor)} />
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-medium text-[#34495e] leading-tight">
            {atividade.titulo}
          </p>
          <time className="text-xs text-[#adb5bd] whitespace-nowrap">{dataFormatada}</time>
        </div>
        <p className="text-xs text-[#6c757d] leading-snug">{atividade.descricao}</p>
        {atividade.usuario && (
          <p className="text-xs text-[#adb5bd] mt-1">Por {atividade.usuario}</p>
        )}
      </div>
    </div>
  );
}

export function AtividadesEscritorio({ atividades }: AtividadesEscritorioProps) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium text-[#34495e] flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#89bcbe]" />
          Atividades Recentes
        </CardTitle>
      </CardHeader>

      <CardContent>
        {atividades.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm text-[#adb5bd]">Nenhuma atividade registrada ainda</p>
          </div>
        ) : (
          <ScrollArea className="h-[320px] pr-3">
            {atividades.map((atividade, index) => (
              <TimelineItem
                key={atividade.id}
                atividade={atividade}
                isLast={index === atividades.length - 1}
              />
            ))}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
