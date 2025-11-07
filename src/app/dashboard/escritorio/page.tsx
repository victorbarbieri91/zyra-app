'use client';

import { useEffect, useState } from 'react';
import { useEscritorio } from '@/contexts/EscritorioContext';
import { getMembrosEscritorio } from '@/lib/supabase/escritorio-helpers';
import { createClient } from '@/lib/supabase/client';

// Importar componentes
import { EscritorioOverview } from '@/components/escritorio/EscritorioOverview';
import { EscritorioStats } from '@/components/escritorio/EscritorioStats';
import { MembrosList } from '@/components/escritorio/MembrosList';
import { ConvitesList } from '@/components/escritorio/ConvitesList';
import { PerformanceMembroTabs } from '@/components/escritorio/PerformanceMembroTabs';
import { AtividadesEscritorio } from '@/components/escritorio/AtividadesEscritorio';
import { PlanoLimitesCard } from '@/components/escritorio/PlanoLimitesCard';
import { ConfiguracoesRapidas } from '@/components/escritorio/ConfiguracoesRapidas';
import InsightCard from '@/components/dashboard/InsightCard';

// Importar modais
import { ModalConvidarMembro } from '@/components/escritorio/ModalConvidarMembro';
import { ModalEditarMembro } from '@/components/escritorio/ModalEditarMembro';
import { ModalEditarEscritorio } from '@/components/escritorio/ModalEditarEscritorio';

export default function EscritorioPage() {
  const { escritorioAtivo, carregando } = useEscritorio();
  const [membros, setMembros] = useState<any[]>([]);
  const [convites, setConvites] = useState<any[]>([]);
  const [atividades, setAtividades] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalMembros: 0,
    processosAtivos: 0,
    clientesAtivos: 0,
    receitaMes: 0,
  });
  const [performanceMembros, setPerformanceMembros] = useState<any[]>([]);

  // Estados dos modais
  const [modalConvidar, setModalConvidar] = useState(false);
  const [modalEditarEscritorio, setModalEditarEscritorio] = useState(false);
  const [membroSelecionado, setMembroSelecionado] = useState<any>(null);

  const supabase = createClient();

  useEffect(() => {
    if (escritorioAtivo) {
      carregarDados();
    }
  }, [escritorioAtivo]);

  const carregarDados = async () => {
    if (!escritorioAtivo) return;

    try {
      // Carregar membros
      const membrosData = await getMembrosEscritorio(escritorioAtivo.id);
      setMembros(membrosData);

      // Carregar convites
      const { data: convitesData } = await supabase
        .from('escritorios_convites')
        .select('*')
        .eq('escritorio_id', escritorioAtivo.id)
        .order('criado_em', { ascending: false });
      setConvites(convitesData || []);

      // Carregar atividades (mock por enquanto)
      setAtividades([
        {
          id: '1',
          tipo: 'membro_adicionado',
          titulo: 'Novo membro adicionado',
          descricao: 'João Silva foi adicionado como Advogado',
          data: new Date().toISOString(),
          usuario: 'Admin',
        },
        {
          id: '2',
          tipo: 'config_alterada',
          titulo: 'Configuração alterada',
          descricao: 'Notificações de novos membros ativadas',
          data: new Date(Date.now() - 86400000).toISOString(),
          usuario: 'Admin',
        },
      ]);

      // Carregar stats (queries reais no Supabase)
      const { data: processosData } = await supabase
        .from('processos')
        .select('id', { count: 'exact' })
        .eq('escritorio_id', escritorioAtivo.id)
        .eq('status', 'ativo');

      const { data: clientesData } = await supabase
        .from('clientes')
        .select('id', { count: 'exact' })
        .eq('escritorio_id', escritorioAtivo.id)
        .eq('ativo', true);

      // Receita do mês (honorários do mês atual)
      const primeiroDiaMes = new Date();
      primeiroDiaMes.setDate(1);
      primeiroDiaMes.setHours(0, 0, 0, 0);

      const { data: honorariosData } = await supabase
        .from('financeiro_honorarios')
        .select('valor')
        .eq('escritorio_id', escritorioAtivo.id)
        .eq('status', 'pago')
        .gte('data_pagamento', primeiroDiaMes.toISOString());

      const receitaMes =
        honorariosData?.reduce((sum, h) => sum + (h.valor || 0), 0) || 0;

      setStats({
        totalMembros: membrosData.length,
        processosAtivos: processosData?.length || 0,
        clientesAtivos: clientesData?.length || 0,
        receitaMes,
      });

      // Performance dos membros (mock com dados realistas)
      const performance = membrosData.map((membro, index) => ({
        id: membro.usuario_id,
        nome: membro.nome,
        avatar_url: membro.avatar_url,
        horasTrabalhadas: 120 - index * 15,
        metaHoras: 160,
        processosAtivos: 12 - index * 2,
        receitaGerada: 25000 - index * 3500,
      }));
      setPerformanceMembros(performance);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const handleReenviarConvite = async (conviteId: string) => {
    // TODO: implementar lógica de reenviar convite
    console.log('Reenviar convite:', conviteId);
  };

  const handleCancelarConvite = async (conviteId: string) => {
    // TODO: implementar lógica de cancelar convite
    console.log('Cancelar convite:', conviteId);
  };

  const handleSalvarConfiguracoes = async (config: any) => {
    // TODO: implementar lógica de salvar configurações
    console.log('Salvar configurações:', config);
  };

  const handleUpgrade = () => {
    // TODO: implementar navegação para página de planos
    console.log('Fazer upgrade');
  };

  if (carregando) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#89bcbe] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#6c757d]">Carregando escritório...</p>
        </div>
      </div>
    );
  }

  if (!escritorioAtivo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/50 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#6c757d] mb-4">Nenhum escritório ativo</p>
          <p className="text-sm text-[#adb5bd]">
            Selecione um escritório no menu superior
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/50 p-6">
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#34495e]">Gestão do Escritório</h1>
          <p className="text-sm text-[#6c757d] mt-0.5">
            Gerencie membros, configurações e informações do escritório
          </p>
        </div>

        {/* Layout 3 Colunas */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* COLUNA ESQUERDA (35%) */}
          <div className="xl:col-span-3 space-y-6">
            <EscritorioOverview
              escritorio={escritorioAtivo}
              onEdit={() => setModalEditarEscritorio(true)}
            />

            <MembrosList
              membros={membros}
              onConvidar={() => setModalConvidar(true)}
              onEditarMembro={(membro) => setMembroSelecionado(membro)}
            />

            <ConvitesList
              convites={convites}
              onReenviar={handleReenviarConvite}
              onCancelar={handleCancelarConvite}
              onNovo={() => setModalConvidar(true)}
            />
          </div>

          {/* COLUNA CENTRAL (40%) */}
          <div className="xl:col-span-5 space-y-6">
            <EscritorioStats stats={stats} />

            <PerformanceMembroTabs membros={performanceMembros} />

            <AtividadesEscritorio atividades={atividades} />
          </div>

          {/* COLUNA DIREITA (25%) */}
          <div className="xl:col-span-4 space-y-6">
            <PlanoLimitesCard
              plano={(escritorioAtivo.plano === 'free' || escritorioAtivo.plano === 'basic' ? 'starter' : escritorioAtivo.plano) || 'starter'}
              membrosAtivos={membros.length}
              maxMembros={escritorioAtivo.max_usuarios || 5}
              storageUsado={2.5}
              maxStorage={10}
              onUpgrade={handleUpgrade}
            />

            <ConfiguracoesRapidas
              escritorioId={escritorioAtivo.id}
              onSave={handleSalvarConfiguracoes}
            />

            <InsightCard
              type="sugestao"
              title="Aumente sua produtividade"
              description="Configure notificações automáticas para prazos processuais e nunca mais perca um deadline."
              action={{
                label: 'Configurar agora',
                onClick: () => console.log('Configurar notificações'),
              }}
            />
          </div>
        </div>

        {/* Modais */}
        <ModalConvidarMembro
          open={modalConvidar}
          onOpenChange={setModalConvidar}
          escritorioId={escritorioAtivo.id}
          onSuccess={carregarDados}
        />

        <ModalEditarMembro
          open={!!membroSelecionado}
          onOpenChange={(open) => !open && setMembroSelecionado(null)}
          membro={membroSelecionado}
          escritorioId={escritorioAtivo.id}
          onSuccess={carregarDados}
        />

        <ModalEditarEscritorio
          open={modalEditarEscritorio}
          onOpenChange={setModalEditarEscritorio}
          escritorio={escritorioAtivo}
          onSuccess={carregarDados}
        />
      </div>
    </div>
  );
}
