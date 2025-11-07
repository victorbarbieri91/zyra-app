'use client';

import { useState } from 'react';
import { Plus, MessageSquare, TrendingUp, GripVertical, User, Calendar, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InteracaoTimeline } from '@/components/crm/InteracaoTimeline';
import { InteracaoModal } from '@/components/crm/InteracaoModal';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Mock data - cores seguindo o gradiente da paleta
const mockEtapas = [
  { id: '1', nome: 'Lead', cor: '#34495e' },
  { id: '2', nome: 'Proposta Enviada', cor: '#46627f' },
  { id: '3', nome: 'Negociação', cor: '#89bcbe' },
  { id: '4', nome: 'Fechado', cor: '#aacfd0' },
];

const initialOportunidades = [
  {
    id: '1',
    pessoa_id: '1',
    pessoa_nome: 'Ana Paula Costa',
    titulo: 'Ação Trabalhista',
    valor_estimado: 15000,
    etapa_id: '1',
    area_juridica: 'Trabalhista',
    responsavel_nome: 'Dr. João Silva',
    tempo_na_etapa_dias: 5,
    ultima_interacao: {
      data: '2024-01-15',
      descricao: 'Reunião inicial para discussão do caso',
    },
    proxima_acao: 'Enviar proposta comercial',
  },
  {
    id: '2',
    pessoa_id: '2',
    pessoa_nome: 'Empresa XYZ Ltda',
    titulo: 'Assessoria Empresarial',
    valor_estimado: 50000,
    etapa_id: '2',
    area_juridica: 'Empresarial',
    responsavel_nome: 'Dr. João Silva',
    tempo_na_etapa_dias: 10,
    ultima_interacao: {
      data: '2024-01-12',
      descricao: 'Enviada proposta comercial por email',
    },
    proxima_acao: 'Aguardar retorno do cliente',
  },
  {
    id: '3',
    pessoa_id: '3',
    pessoa_nome: 'Empresa ABC Ltda',
    titulo: 'Contrato de Fornecimento',
    valor_estimado: 25000,
    etapa_id: '3',
    area_juridica: 'Contratual',
    responsavel_nome: 'Dr. João Silva',
    tempo_na_etapa_dias: 15,
    ultima_interacao: {
      data: '2024-01-08',
      descricao: 'Ligação de acompanhamento',
    },
    proxima_acao: 'Enviar minuta do contrato',
  },
];

const mockInteracoes = [
  {
    id: '1',
    pessoa_id: '1',
    pessoa_nome: 'Ana Paula Costa',
    user_id: '1',
    user_nome: 'Dr. João Silva',
    tipo: 'reuniao' as const,
    assunto: 'Primeira reunião - Detalhamento do caso',
    descricao: 'Reunião inicial para entender os detalhes da reclamação trabalhista',
    data_hora: '2024-01-15T14:00:00Z',
    duracao_minutos: 60,
    resultado: 'Cliente interessado, solicitou proposta comercial',
    follow_up: true,
    follow_up_data: '2024-01-22T00:00:00Z',
    follow_up_descricao: 'Enviar proposta comercial',
    follow_up_concluido: false,
    oportunidade_id: '1',
    created_at: '2024-01-15T14:00:00Z',
    updated_at: '2024-01-15T14:00:00Z',
  },
  {
    id: '2',
    pessoa_id: '2',
    pessoa_nome: 'Empresa XYZ Ltda',
    user_id: '1',
    user_nome: 'Dr. João Silva',
    tipo: 'email' as const,
    assunto: 'Envio de proposta comercial',
    descricao: 'Enviada proposta detalhada para reestruturação societária',
    data_hora: '2024-01-12T10:30:00Z',
    resultado: 'Proposta enviada, aguardando retorno',
    follow_up: true,
    follow_up_data: '2024-01-19T00:00:00Z',
    follow_up_descricao: 'Ligar para verificar recebimento',
    follow_up_concluido: false,
    oportunidade_id: '2',
    created_at: '2024-01-12T10:30:00Z',
    updated_at: '2024-01-12T10:30:00Z',
  },
];

// Droppable Column Component
function DroppableColumn({ children, id }: { children: React.ReactNode; id: string }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-h-[400px] transition-colors ${
        isOver ? 'bg-slate-50 rounded-lg' : ''
      }`}
    >
      {children}
    </div>
  );
}

// Sortable Card Component
function SortableCard({ oportunidade, onRegistrarInteracao }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: oportunidade.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    }).format(date);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white rounded-lg border border-slate-200 p-3 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
    >
      {/* Drag Handle + Título */}
      <div className="flex items-start gap-2 mb-3">
        <div className="mt-1">
          <GripVertical className="w-4 h-4 text-slate-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 mb-1 line-clamp-2">
            {oportunidade.titulo}
          </h3>
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <User className="w-3 h-3" />
            <span className="truncate">{oportunidade.pessoa_nome}</span>
          </div>
        </div>
      </div>

      {/* Valor */}
      {oportunidade.valor_estimado && (
        <div className="mb-3">
          <div className="text-[10px] font-medium text-[#89bcbe] mb-0.5">Valor Estimado</div>
          <div className="text-sm font-semibold text-slate-900">
            {formatCurrency(oportunidade.valor_estimado)}
          </div>
        </div>
      )}

      {/* Última Interação */}
      {oportunidade.ultima_interacao && (
        <div className="mb-3">
          <div className="text-[10px] font-medium text-[#89bcbe] mb-0.5">Última Interação</div>
          <div className="text-xs text-slate-900 line-clamp-2">{oportunidade.ultima_interacao.descricao}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{formatDate(oportunidade.ultima_interacao.data)}</div>
        </div>
      )}

      {/* Próxima Ação */}
      {oportunidade.proxima_acao && (
        <div className="mb-3">
          <div className="text-[10px] font-medium text-[#89bcbe] mb-0.5">Próxima Ação</div>
          <div className="text-xs text-slate-900 line-clamp-2">{oportunidade.proxima_acao}</div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Calendar className="w-3 h-3" />
          <span>{oportunidade.tempo_na_etapa_dias}d</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 text-xs bg-[#34495e] hover:bg-[#46627f] text-white pointer-events-auto"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRegistrarInteracao(oportunidade.id, oportunidade.pessoa_id, oportunidade.pessoa_nome);
          }}
        >
          <MessageSquare className="w-3 h-3 mr-1" />
          Interação
        </Button>
      </div>
    </div>
  );
}

export default function FunilPage() {
  const [activeTab, setActiveTab] = useState('funil');
  const [oportunidades, setOportunidades] = useState(initialOportunidades);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [interacaoModalOpen, setInteracaoModalOpen] = useState(false);
  const [interacaoContext, setInteracaoContext] = useState<{
    oportunidadeId?: string;
    pessoaId?: string;
    pessoaNome?: string;
  }>({});

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Encontrar oportunidade sendo arrastada
    const activeOportunidade = oportunidades.find((o) => o.id === activeId);
    if (!activeOportunidade) return;

    // Se soltar sobre uma coluna (etapa)
    const overEtapa = mockEtapas.find((e) => e.id === overId);
    if (overEtapa && activeOportunidade.etapa_id !== overEtapa.id) {
      setOportunidades((items) =>
        items.map((item) =>
          item.id === activeId ? { ...item, etapa_id: overEtapa.id } : item
        )
      );
      return;
    }

    // Se soltar sobre outro card
    const overOportunidade = oportunidades.find((o) => o.id === overId);
    if (overOportunidade && overOportunidade.etapa_id !== activeOportunidade.etapa_id) {
      setOportunidades((items) =>
        items.map((item) =>
          item.id === activeId ? { ...item, etapa_id: overOportunidade.etapa_id } : item
        )
      );
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const activeOportunidade = oportunidades.find((o) => o.id === activeId);

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="bg-white border border-slate-200 rounded-lg">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <TabsList className="bg-slate-100">
                <TabsTrigger value="funil" className="gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Funil de Vendas
                </TabsTrigger>
                <TabsTrigger value="interacoes" className="gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Todas as Interações
                </TabsTrigger>
              </TabsList>

              <div className="flex gap-2">
                {activeTab === 'funil' && (
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-[#34495e] to-[#46627f]"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Oportunidade
                  </Button>
                )}

                {activeTab === 'interacoes' && (
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-[#34495e] to-[#46627f]"
                    onClick={() => setInteracaoModalOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Registrar Interação
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Tab: Funil de Vendas */}
          <TabsContent value="funil" className="p-6 mt-0">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <div className="grid grid-cols-4 gap-4">
                {mockEtapas.map((etapa) => {
                  const oportunidadesEtapa = oportunidades.filter(
                    (opp) => opp.etapa_id === etapa.id
                  );
                  const valorEtapa = oportunidadesEtapa.reduce(
                    (acc, opp) => acc + (opp.valor_estimado || 0),
                    0
                  );

                  return (
                    <div key={etapa.id} className="flex flex-col h-full">
                      {/* Header da Coluna */}
                      <div
                        className="rounded-lg p-3 mb-3"
                        style={{ backgroundColor: etapa.cor }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-semibold text-white">
                            {etapa.nome}
                          </h3>
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/20">
                            <span className="text-xs font-semibold text-white">
                              {oportunidadesEtapa.length}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-white/90 flex items-center gap-1 font-medium">
                          <DollarSign className="w-3.5 h-3.5 text-white/80" />
                          {formatCurrency(valorEtapa)}
                        </div>
                      </div>

                      {/* Drop Zone */}
                      <DroppableColumn id={etapa.id}>
                        <SortableContext
                          items={oportunidadesEtapa.map((o) => o.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-2">
                            {oportunidadesEtapa.map((oportunidade) => (
                              <SortableCard
                                key={oportunidade.id}
                                oportunidade={oportunidade}
                                onRegistrarInteracao={(oportunidadeId: string, pessoaId: string, pessoaNome: string) => {
                                  setInteracaoContext({ oportunidadeId, pessoaId, pessoaNome });
                                  setInteracaoModalOpen(true);
                                }}
                              />
                            ))}
                          </div>
                        </SortableContext>

                        {oportunidadesEtapa.length === 0 && (
                          <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg p-4">
                            <p className="text-xs text-slate-400">Arraste cards aqui</p>
                          </div>
                        )}
                      </DroppableColumn>
                    </div>
                  );
                })}
              </div>

              <DragOverlay>
                {activeId && activeOportunidade ? (
                  <div className="bg-white rounded-lg border-2 border-[#34495e] p-3 shadow-lg rotate-3">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {activeOportunidade.titulo}
                    </h3>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </TabsContent>

          {/* Tab: Todas as Interações */}
          <TabsContent value="interacoes" className="p-6 mt-0">
            <div className="space-y-6">
              {/* Filtros Rápidos */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="bg-white">
                  Todas
                </Button>
                <Button variant="ghost" size="sm">
                  Com Follow-up
                </Button>
                <Button variant="ghost" size="sm">
                  Esta Semana
                </Button>
                <Button variant="ghost" size="sm">
                  Este Mês
                </Button>
              </div>

              {/* Timeline de Interações */}
              <div className="bg-white border border-slate-200 rounded-lg p-6">
                <InteracaoTimeline interacoes={mockInteracoes} />
              </div>

              {mockInteracoes.length === 0 && (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg p-12 text-center">
                  <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-sm font-semibold text-slate-600 mb-2">
                    Nenhuma interação registrada
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Comece registrando suas interações com clientes e prospectos
                  </p>
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-[#34495e] to-[#46627f]"
                    onClick={() => setInteracaoModalOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Registrar Primeira Interação
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Modal de Interação */}
      <InteracaoModal
        open={interacaoModalOpen}
        onOpenChange={setInteracaoModalOpen}
        pessoaId={interacaoContext.pessoaId}
        pessoaNome={interacaoContext.pessoaNome}
        oportunidadeId={interacaoContext.oportunidadeId}
      />
    </div>
  );
}
