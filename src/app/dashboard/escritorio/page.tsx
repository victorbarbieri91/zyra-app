'use client';

import { useState } from 'react';
import { useEscritorio } from '@/contexts/EscritorioContext';
import { useEscritorioCargos } from '@/hooks/useEscritorioCargos';
import { useEscritorioMembros } from '@/hooks/useEscritorioMembros';
import { MembroCompleto } from '@/types/escritorio';
import { toast } from 'sonner';

// Componentes do novo layout
import { EscritorioHeader } from '@/components/escritorio/EscritorioHeader';
import { EquipeCard } from '@/components/escritorio/EquipeCard';
import { ConvitesCard } from '@/components/escritorio/ConvitesCard';
import { CargosPermissoesCard } from '@/components/escritorio/CargosPermissoesCard';
import { PlanoLimitesCard } from '@/components/escritorio/PlanoLimitesCard';

// Modais
import { ModalConvidarMembro } from '@/components/escritorio/ModalConvidarMembro';
import { ModalEditarMembro } from '@/components/escritorio/ModalEditarMembro';
import { ModalEditarEscritorio } from '@/components/escritorio/ModalEditarEscritorio';
import { ModalCargosPermissoes } from '@/components/escritorio/ModalCargosPermissoes';

export default function EscritorioPage() {
  const { escritorioAtivo, carregando: carregandoEscritorio, recarregar: recarregarEscritorio } = useEscritorio();

  // Hooks para dados
  const {
    cargos,
    cargosComPermissoes,
    carregando: carregandoCargos,
    recarregar: recarregarCargos,
    createCargo,
    updateCargo,
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

  const handleSuccessModal = () => {
    recarregarMembros();
    recarregarCargos();
    recarregarEscritorio();
  };

  // Loading state
  const carregando = carregandoEscritorio || carregandoCargos || carregandoMembros;

  if (carregando && !escritorioAtivo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#89bcbe] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#6c757d]">Carregando escritorio...</p>
        </div>
      </div>
    );
  }

  if (!escritorioAtivo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/50 p-6 flex items-center justify-center">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/50 p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <div className="mb-2">
          <h1 className="text-2xl font-semibold text-[#34495e]">Gestao do Escritorio</h1>
          <p className="text-sm text-[#6c757d] mt-0.5">
            Gerencie membros, cargos e permissoes do escritorio
          </p>
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
      </div>
    </div>
  );
}
