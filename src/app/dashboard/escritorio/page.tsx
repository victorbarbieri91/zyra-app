'use client';

import { useState, useEffect } from 'react';
import { useEscritorio } from '@/contexts/EscritorioContext';
import { useEscritorioCargos } from '@/hooks/useEscritorioCargos';
import { useEscritorioMembros } from '@/hooks/useEscritorioMembros';
import { MembroCompleto } from '@/types/escritorio';
import { toast } from 'sonner';
import { getEscritoriosDoGrupo, EscritorioComRole, trocarEscritorio } from '@/lib/supabase/escritorio-helpers';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Componentes do novo layout
import { EscritorioHeader } from '@/components/escritorio/EscritorioHeader';
import { EquipeCard } from '@/components/escritorio/EquipeCard';
import { ConvitesCard } from '@/components/escritorio/ConvitesCard';
import { CargosPermissoesCard } from '@/components/escritorio/CargosPermissoesCard';
import { ValoresCargosCard } from '@/components/escritorio/ValoresCargosCard';
import { PlanoLimitesCard } from '@/components/escritorio/PlanoLimitesCard';

// Modais
import { ModalConvidarMembro } from '@/components/escritorio/ModalConvidarMembro';
import { ModalEditarMembro } from '@/components/escritorio/ModalEditarMembro';
import { ModalEditarEscritorio } from '@/components/escritorio/ModalEditarEscritorio';
import { ModalCargosPermissoes } from '@/components/escritorio/ModalCargosPermissoes';
import { ModalCriarEscritorio } from '@/components/escritorio/ModalCriarEscritorio';

export default function EscritorioPage() {
  const { escritorioAtivo, carregando: carregandoEscritorio, recarregar: recarregarEscritorio } = useEscritorio();

  // Estado para escritórios do grupo
  const [escritoriosGrupo, setEscritoriosGrupo] = useState<EscritorioComRole[]>([]);

  // Carregar escritórios do grupo
  useEffect(() => {
    async function loadEscritoriosGrupo() {
      if (!escritorioAtivo?.id) return;
      try {
        const escritorios = await getEscritoriosDoGrupo();
        setEscritoriosGrupo(escritorios);
      } catch (error) {
        console.error('Erro ao carregar escritórios do grupo:', error);
      }
    }
    loadEscritoriosGrupo();
  }, [escritorioAtivo?.id]);

  // Hooks para dados
  const {
    cargos,
    cargosComPermissoes,
    carregando: carregandoCargos,
    recarregar: recarregarCargos,
    createCargo,
    updateCargo,
    updateCargoValorHora,
    deleteCargo,
    reorderCargos,
  } = useEscritorioCargos(escritorioAtivo?.id);

  const {
    membros,
    convites,
    carregando: carregandoMembros,
    reenviarConvite,
    cancelarConvite,
    recarregar: recarregarMembros,
  } = useEscritorioMembros(escritorioAtivo?.id);

  // Estados dos modais
  const [modalConvidar, setModalConvidar] = useState(false);
  const [modalEditarEscritorio, setModalEditarEscritorio] = useState(false);
  const [modalCargosPermissoes, setModalCargosPermissoes] = useState(false);
  const [modalCriarEscritorio, setModalCriarEscritorio] = useState(false);
  const [membroSelecionado, setMembroSelecionado] = useState<MembroCompleto | null>(null);

  // Estados de views expandidas
  const [showEquipeExpanded, setShowEquipeExpanded] = useState(false);
  const [showConvitesExpanded, setShowConvitesExpanded] = useState(false);

  // Handlers
  const handleReenviarConvite = async (conviteId: string) => {
    const sucesso = await reenviarConvite(conviteId);
    if (sucesso) {
      toast.success('Convite reenviado com sucesso');
    }
  };

  const handleCancelarConvite = async (conviteId: string) => {
    const sucesso = await cancelarConvite(conviteId);
    if (sucesso) {
      toast.success('Convite cancelado');
    }
  };

  const handleUpgrade = () => {
    toast.info('Funcionalidade de upgrade em desenvolvimento');
  };

  const handleTrocarEscritorio = async (escritorioId: string) => {
    try {
      await trocarEscritorio(escritorioId);
      toast.success('Escritório alterado com sucesso');
      window.location.reload();
    } catch (error) {
      console.error('Erro ao trocar escritório:', error);
      toast.error('Erro ao trocar de escritório');
    }
  };

  const handleSuccessModal = async () => {
    recarregarMembros();
    recarregarCargos();
    recarregarEscritorio();
    // Recarregar escritórios do grupo
    try {
      const escritorios = await getEscritoriosDoGrupo();
      setEscritoriosGrupo(escritorios);
    } catch (error) {
      console.error('Erro ao recarregar escritórios do grupo:', error);
    }
  };

  // Loading state
  const carregando = carregandoEscritorio || carregandoCargos || carregandoMembros;

  if (carregando && !escritorioAtivo) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#89bcbe] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#6c757d]">Carregando escritorio...</p>
        </div>
      </div>
    );
  }

  if (!escritorioAtivo) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-[#6c757d] mb-4">Nenhum escritorio ativo</p>
          <p className="text-sm text-[#adb5bd]">
            Selecione um escritorio no menu superior
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="text-2xl font-semibold text-[#34495e]">Gestão do Escritório</h1>
            <p className="text-sm text-[#6c757d] mt-0.5">
              Gerencie membros, cargos e permissões do escritório
            </p>
          </div>
          <Button
            onClick={() => setModalCriarEscritorio(true)}
            size="sm"
            className="bg-[#34495e] hover:bg-[#46627f] text-white"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Novo Escritório
          </Button>
        </div>

        {/* Header do Escritorio - Destacado */}
        <EscritorioHeader
          escritorio={escritorioAtivo}
          onEdit={() => setModalEditarEscritorio(true)}
        />

        {/* Grid de Cards 2x2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card Equipe */}
          <EquipeCard
            membros={membros}
            onConvidar={() => setModalConvidar(true)}
            onVerTodos={() => setShowEquipeExpanded(true)}
            onEditarMembro={(membro) => setMembroSelecionado(membro)}
          />

          {/* Card Convites */}
          <ConvitesCard
            convites={convites}
            onNovo={() => setModalConvidar(true)}
            onReenviar={handleReenviarConvite}
            onCancelar={handleCancelarConvite}
            onVerTodos={() => setShowConvitesExpanded(true)}
          />

          {/* Card Cargos e Permissoes */}
          <CargosPermissoesCard
            cargos={cargos}
            onConfigurar={() => setModalCargosPermissoes(true)}
          />

          {/* Card Valores por Cargo - Timesheet */}
          <ValoresCargosCard
            cargos={cargos}
            onUpdateValorHora={updateCargoValorHora}
            carregando={carregandoCargos}
          />

          {/* Card Plano e Limites */}
          <PlanoLimitesCard
            plano={
              escritorioAtivo.plano === 'free' || escritorioAtivo.plano === 'basic'
                ? 'starter'
                : escritorioAtivo.plano || 'starter'
            }
            membrosAtivos={membros.length}
            maxMembros={escritorioAtivo.max_usuarios || 5}
            storageUsado={2.5}
            maxStorage={10}
            onUpgrade={handleUpgrade}
          />

          {/* Card Escritórios do Grupo */}
          {escritoriosGrupo.length > 1 && (
            <Card className="border-slate-200">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm font-semibold text-[#34495e]">
                  Escritórios do Grupo
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2 pb-4">
                <div className="space-y-2">
                  {escritoriosGrupo.map((esc) => {
                    const isAtivo = esc.id === escritorioAtivo.id;
                    return (
                      <div
                        key={esc.id}
                        className={`
                          flex items-center justify-between p-2.5 rounded-lg border transition-colors
                          ${isAtivo
                            ? 'bg-slate-50 border-slate-300'
                            : 'bg-white border-slate-200 hover:border-slate-300 cursor-pointer'
                          }
                        `}
                        onClick={() => !isAtivo && handleTrocarEscritorio(esc.id)}
                      >
                        <div>
                          <p className="text-sm font-medium text-[#34495e]">
                            {esc.nome}
                          </p>
                          {esc.cnpj && (
                            <p className="text-xs text-slate-500">
                              {esc.cnpj}
                            </p>
                          )}
                        </div>
                        {isAtivo && (
                          <span className="text-xs text-slate-500">Ativo</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Modais */}
        <ModalConvidarMembro
          open={modalConvidar}
          onOpenChange={setModalConvidar}
          escritorioId={escritorioAtivo.id}
          cargos={cargos}
          onSuccess={handleSuccessModal}
        />

        <ModalEditarMembro
          open={!!membroSelecionado}
          onOpenChange={(open) => !open && setMembroSelecionado(null)}
          membro={membroSelecionado}
          cargos={cargos}
          escritorioId={escritorioAtivo.id}
          onSuccess={handleSuccessModal}
        />

        <ModalEditarEscritorio
          open={modalEditarEscritorio}
          onOpenChange={setModalEditarEscritorio}
          escritorio={escritorioAtivo}
          onSuccess={handleSuccessModal}
        />

        <ModalCargosPermissoes
          open={modalCargosPermissoes}
          onOpenChange={setModalCargosPermissoes}
          cargosComPermissoes={cargosComPermissoes}
          escritorioId={escritorioAtivo.id}
          onSuccess={handleSuccessModal}
          createCargo={createCargo}
          updateCargo={updateCargo}
          deleteCargo={deleteCargo}
          reorderCargos={reorderCargos}
        />

        <ModalCriarEscritorio
          open={modalCriarEscritorio}
          onOpenChange={setModalCriarEscritorio}
          onSuccess={handleSuccessModal}
        />
    </div>
  );
}
