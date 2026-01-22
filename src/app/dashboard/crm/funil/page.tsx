'use client';

import { useState } from 'react';
import { Plus, MessageSquare, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InteracaoTimeline } from '@/components/crm/InteracaoTimeline';
import { InteracaoModal } from '@/components/crm/InteracaoModal';
import { KanbanBoard } from '@/components/crm/KanbanBoard';
import type { InteracaoJSONB } from '@/types/crm';

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

const mockInteracoes: InteracaoJSONB[] = [
  {
    id: '1',
    tipo: 'reuniao',
    data: '2024-01-15T14:00:00Z',
    descricao: 'Reunião inicial para entender os detalhes da reclamação trabalhista. Cliente interessado, solicitou proposta comercial.',
    user_id: '1',
    user_nome: 'Dr. João Silva',
  },
  {
    id: '2',
    tipo: 'email',
    data: '2024-01-12T10:30:00Z',
    descricao: 'Enviada proposta detalhada para reestruturação societária. Aguardando retorno.',
    user_id: '1',
    user_nome: 'Dr. João Silva',
  },
  {
    id: '3',
    tipo: 'proposta_enviada',
    data: '2024-01-10T09:00:00Z',
    descricao: 'Proposta comercial enviada com valores e condições de pagamento.',
    user_id: '1',
    user_nome: 'Dr. João Silva',
    etapa_anterior: 'lead',
    etapa_nova: 'proposta_enviada',
  },
];


export default function FunilPage() {
  const [activeTab, setActiveTab] = useState('funil');
  const [oportunidades, setOportunidades] = useState(initialOportunidades);
  const [interacaoModalOpen, setInteracaoModalOpen] = useState(false);
  const [interacaoContext, setInteracaoContext] = useState<{
    oportunidadeId?: string;
    pessoaId?: string;
    pessoaNome?: string;
  }>({});

  const handleOportunidadeMove = (oportunidadeId: string, novaEtapaId: string) => {
    setOportunidades((items) =>
      items.map((item) =>
        item.id === oportunidadeId ? { ...item, etapa_id: novaEtapaId } : item
      )
    );
  };

  const handleRegistrarInteracao = (oportunidadeId: string, pessoaId: string, pessoaNome: string) => {
    setInteracaoContext({ oportunidadeId, pessoaId, pessoaNome });
    setInteracaoModalOpen(true);
  };

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
            <KanbanBoard
              etapas={mockEtapas}
              oportunidades={oportunidades}
              onOportunidadeMove={handleOportunidadeMove}
              onRegistrarInteracao={handleRegistrarInteracao}
            />
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
