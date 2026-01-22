'use client';

import {
  Phone,
  Video,
  Mail,
  MessageCircle,
  Users,
  MapPin,
  Calendar,
  Briefcase,
  FileCheck,
  FileText,
} from 'lucide-react';
import { InteracaoJSONB } from '@/types/crm';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type TipoInteracao = InteracaoJSONB['tipo'];

interface InteracaoTimelineProps {
  interacoes: InteracaoJSONB[];
}

const tipoInteracaoConfig: Record<
  TipoInteracao,
  { icon: React.ElementType; cor: string; bgCor: string; label: string }
> = {
  ligacao: { icon: Phone, cor: 'text-emerald-600', bgCor: 'bg-emerald-100', label: 'Ligacao' },
  reuniao: { icon: Users, cor: 'text-blue-600', bgCor: 'bg-blue-100', label: 'Reuniao' },
  email: { icon: Mail, cor: 'text-purple-600', bgCor: 'bg-purple-100', label: 'E-mail' },
  whatsapp: { icon: MessageCircle, cor: 'text-green-600', bgCor: 'bg-green-100', label: 'WhatsApp' },
  visita: { icon: MapPin, cor: 'text-amber-600', bgCor: 'bg-amber-100', label: 'Visita' },
  videochamada: { icon: Video, cor: 'text-teal-600', bgCor: 'bg-teal-100', label: 'Videochamada' },
  proposta_enviada: { icon: Briefcase, cor: 'text-indigo-600', bgCor: 'bg-indigo-100', label: 'Proposta Enviada' },
  contrato_enviado: { icon: FileCheck, cor: 'text-violet-600', bgCor: 'bg-violet-100', label: 'Contrato Enviado' },
  outros: { icon: FileText, cor: 'text-gray-600', bgCor: 'bg-gray-100', label: 'Outros' },
};

export function InteracaoTimeline({ interacoes }: InteracaoTimelineProps) {
  if (!interacoes || interacoes.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Nenhuma interacao registrada</p>
      </div>
    );
  }

  // Ordenar por data mais recente
  const interacoesOrdenadas = [...interacoes].sort(
    (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
  );

  return (
    <div className="space-y-4">
      {interacoesOrdenadas.map((interacao, index) => {
        const config = tipoInteracaoConfig[interacao.tipo];
        const Icon = config.icon;
        const isLast = index === interacoesOrdenadas.length - 1;

        return (
          <div key={interacao.id} className="relative pl-8">
            {/* Linha da Timeline */}
            {!isLast && (
              <div
                className="absolute left-[13px] top-8 bottom-0 w-[2px] bg-slate-200"
                style={{ height: 'calc(100% + 16px)' }}
              />
            )}

            {/* Icone */}
            <div
              className={`absolute left-0 top-0 w-7 h-7 rounded-lg flex items-center justify-center ${config.bgCor} border-2 border-white shadow-sm`}
            >
              <Icon className={`w-3.5 h-3.5 ${config.cor}`} />
            </div>

            {/* Card da Interacao */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant="secondary"
                      className={`text-[10px] ${config.bgCor} ${config.cor}`}
                    >
                      {config.label}
                    </Badge>
                    {interacao.etapa_nova && interacao.etapa_anterior && (
                      <Badge variant="outline" className="text-[10px]">
                        {interacao.etapa_anterior} → {interacao.etapa_nova}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-3">{interacao.descricao}</p>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-[10px] text-slate-500">
                    {formatDistanceToNow(new Date(interacao.data), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(interacao.data).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>

              {/* Footer - Usuario */}
              {interacao.user_nome && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#89bcbe] flex items-center justify-center text-white text-[10px]">
                    {interacao.user_nome.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs text-slate-600">{interacao.user_nome}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
