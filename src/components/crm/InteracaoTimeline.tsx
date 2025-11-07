'use client';

import {
  Phone,
  Video,
  Mail,
  MessageCircle,
  Users,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { InteracaoComUsuario, TipoInteracao } from '@/types/crm';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface InteracaoTimelineProps {
  interacoes: InteracaoComUsuario[];
}

const tipoInteracaoConfig: Record<
  TipoInteracao,
  { icon: React.ElementType; cor: string; label: string }
> = {
  ligacao: { icon: Phone, cor: 'emerald', label: 'Ligação' },
  reuniao: { icon: Users, cor: 'blue', label: 'Reunião' },
  email: { icon: Mail, cor: 'purple', label: 'E-mail' },
  whatsapp: { icon: MessageCircle, cor: 'green', label: 'WhatsApp' },
  visita: { icon: MapPin, cor: 'amber', label: 'Visita' },
  videochamada: { icon: Video, cor: 'teal', label: 'Videochamada' },
  mensagem: { icon: MessageCircle, cor: 'slate', label: 'Mensagem' },
  outros: { icon: Calendar, cor: 'gray', label: 'Outros' },
};

export function InteracaoTimeline({ interacoes }: InteracaoTimelineProps) {
  if (interacoes.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Nenhuma interação registrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {interacoes.map((interacao, index) => {
        const config = tipoInteracaoConfig[interacao.tipo];
        const Icon = config.icon;
        const isLast = index === interacoes.length - 1;

        return (
          <div key={interacao.id} className="relative pl-8">
            {/* Linha da Timeline */}
            {!isLast && (
              <div
                className="absolute left-[13px] top-8 bottom-0 w-[2px] bg-slate-200"
                style={{ height: 'calc(100% + 16px)' }}
              />
            )}

            {/* Ícone */}
            <div
              className={`
                absolute left-0 top-0
                w-7 h-7 rounded-lg
                flex items-center justify-center
                bg-${config.cor}-100 border-2 border-white shadow-sm
              `}
            >
              <Icon className={`w-3.5 h-3.5 text-${config.cor}-600`} />
            </div>

            {/* Card da Interação */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant="secondary"
                      className={`text-[10px] bg-${config.cor}-100 text-${config.cor}-700`}
                    >
                      {config.label}
                    </Badge>
                    <span className="text-xs font-semibold text-[#34495e]">
                      {interacao.assunto}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">{interacao.descricao}</p>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-[10px] text-slate-500">
                    {formatDistanceToNow(new Date(interacao.data_hora), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(interacao.data_hora).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>

              {/* Detalhes */}
              <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-600">
                {/* Duração */}
                {interacao.duracao_minutos && interacao.duracao_minutos > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-[#89bcbe]" />
                    <span>{interacao.duracao_minutos} min</span>
                  </div>
                )}

                {/* Resultado */}
                {interacao.resultado && (
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span>{interacao.resultado}</span>
                  </div>
                )}

                {/* Participantes */}
                {interacao.participantes && interacao.participantes.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3 h-3 text-[#89bcbe]" />
                    <span>{interacao.participantes.length} participante(s)</span>
                  </div>
                )}
              </div>

              {/* Follow-up Pendente */}
              {interacao.follow_up && !interacao.follow_up_concluido && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-start gap-2 text-xs">
                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-amber-700 mb-1">
                        Follow-up Pendente
                      </div>
                      {interacao.follow_up_descricao && (
                        <p className="text-slate-600 mb-2">{interacao.follow_up_descricao}</p>
                      )}
                      {interacao.follow_up_data && (
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {new Date(interacao.follow_up_data).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Footer - Usuário */}
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                <Avatar className="w-5 h-5">
                  {interacao.user_avatar ? (
                    <img src={interacao.user_avatar} alt={interacao.user_nome} />
                  ) : (
                    <div className="bg-[#89bcbe] w-full h-full flex items-center justify-center text-white text-[10px]">
                      {interacao.user_nome.charAt(0).toUpperCase()}
                    </div>
                  )}
                </Avatar>
                <span className="text-xs text-slate-600">{interacao.user_nome}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
