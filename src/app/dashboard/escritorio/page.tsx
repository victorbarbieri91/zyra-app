'use client';

import { useState, useEffect } from 'react';
import { useEscritorio } from '@/contexts/EscritorioContext';
import { useEscritorioCargos } from '@/hooks/useEscritorioCargos';
import { useEscritorioMembros } from '@/hooks/useEscritorioMembros';
import { MembroCompleto, ConfiguracaoFiscal, REGIME_TRIBUTARIO_LABELS } from '@/types/escritorio';
import { toast } from 'sonner';
import {
  getEscritoriosDoGrupo,
  EscritorioComRole,
  trocarEscritorio,
} from '@/lib/supabase/escritorio-helpers';
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Building2,
  Settings2,
  Mail,
  UserPlus,
  Pencil,
  Calculator,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Modais
import { ModalConvidarMembro } from '@/components/escritorio/ModalConvidarMembro';
import { ModalEditarMembro } from '@/components/escritorio/ModalEditarMembro';
import { ModalEditarEscritorio } from '@/components/escritorio/ModalEditarEscritorio';
import { ModalCargosPermissoes } from '@/components/escritorio/ModalCargosPermissoes';
import { ModalCriarEscritorio } from '@/components/escritorio/ModalCriarEscritorio';
import { ModalConvitesPendentes } from '@/components/escritorio/ModalConvitesPendentes';

export default function EscritorioPage() {
  const {
    escritorioAtivo,
    carregando: carregandoEscritorio,
    recarregar: recarregarEscritorio,
  } = useEscritorio();

  // Estado para escritórios do grupo
  const [escritoriosGrupo, setEscritoriosGrupo] = useState<EscritorioComRole[]>(
    []
  );

  // Seções expansíveis (abertas por padrão)
  const [equipeExpandida, setEquipeExpandida] = useState(true);
  const [configExpandida, setConfigExpandida] = useState(true);

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
  const [modalEditarTab, setModalEditarTab] = useState<'geral' | 'fiscal'>('geral');
  const [modalCargosPermissoes, setModalCargosPermissoes] = useState(false);
  const [modalCriarEscritorio, setModalCriarEscritorio] = useState(false);
  const [modalConvites, setModalConvites] = useState(false);
  const [membroSelecionado, setMembroSelecionado] =
    useState<MembroCompleto | null>(null);

  // Estado para edição de valores por hora
  const [valoresHora, setValoresHora] = useState<Record<string, string>>({});

  // Handlers
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
    // Aguardar recarga do escritório para garantir dados atualizados
    await recarregarEscritorio();
    recarregarMembros();
    recarregarCargos();
    try {
      const escritorios = await getEscritoriosDoGrupo();
      setEscritoriosGrupo(escritorios);
    } catch (error) {
      console.error('Erro ao recarregar escritórios do grupo:', error);
    }
  };

  // Formata número → "350,00" ou "1.500,00"
  const formatNumero = (value: number): string => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Valor exibido no input (estado local durante edição, ou formatado do cargo)
  const getValorHoraDisplay = (cargo: { id: string; valor_hora_padrao: number | null }): string => {
    if (cargo.id in valoresHora) return valoresHora[cargo.id];
    return formatNumero(cargo.valor_hora_padrao || 0);
  };

  // Change: permite dígitos e vírgula (digitação livre)
  const handleValorHoraChange = (cargoId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/[^\d,]/g, '');
    // Garantir no máximo uma vírgula e 2 casas decimais
    const parts = cleaned.split(',');
    let result = parts[0];
    if (parts.length > 1) {
      result += ',' + parts[1].slice(0, 2);
    }
    setValoresHora((prev) => ({ ...prev, [cargoId]: result }));
  };

  // Focus: seleciona tudo pra poder digitar por cima
  const handleValorHoraFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setTimeout(() => e.target.select(), 0);
  };

  // Blur: formata e salva no banco
  const handleValorHoraBlur = async (cargoId: string) => {
    const raw = valoresHora[cargoId];
    if (raw === undefined) return;
    // "1500" ou "350,50" → número
    const valor = parseFloat(raw.replace(/\./g, '').replace(',', '.')) || 0;
    const sucesso = await updateCargoValorHora(cargoId, valor);
    if (sucesso) {
      toast.success('Valor por hora atualizado');
    } else {
      toast.error('Erro ao atualizar valor');
    }
    // Limpa estado local pra voltar a usar valor formatado do cargo
    setValoresHora((prev) => {
      const next = { ...prev };
      delete next[cargoId];
      return next;
    });
  };

  // Convites pendentes (não expirados e não aceitos)
  const convitesPendentes = convites.filter(
    (c) => !c.aceito && new Date(c.expira_em) > new Date()
  );

  // Loading state
  const carregando =
    carregandoEscritorio || carregandoCargos || carregandoMembros;

  if (carregando && !escritorioAtivo) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-slate-300 border-t-[#89bcbe] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!escritorioAtivo) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-slate-500 mb-2">Nenhum escritório ativo</p>
          <p className="text-xs text-slate-400">
            Selecione um escritório no menu superior
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header da Página */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#34495e]">Escritório</h1>
        <Button
          onClick={() => setModalCriarEscritorio(true)}
          size="sm"
          variant="outline"
          className="text-[#34495e] border-slate-200 hover:bg-slate-50"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Novo Escritório
        </Button>
      </div>

      {/* Card do Escritório Ativo */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {escritorioAtivo.logo_url ? (
                <img
                  src={escritorioAtivo.logo_url}
                  alt={escritorioAtivo.nome}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#89bcbe] to-[#6ba9ab] flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
              )}
              <div>
                <h2 className="text-base font-medium text-[#34495e]">
                  {escritorioAtivo.nome}
                </h2>
                {escritorioAtivo.cnpj && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {escritorioAtivo.cnpj}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setModalEditarEscritorio(true)}
              className="text-slate-500 hover:text-[#34495e]"
            >
              <Pencil className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Escritórios do Grupo - Só mostra se tiver mais de 1 */}
      {escritoriosGrupo.length > 1 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide px-1">
            Escritórios do Grupo
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {escritoriosGrupo.map((esc) => {
              const isAtivo = esc.id === escritorioAtivo.id;
              return (
                <div
                  key={esc.id}
                  onClick={() => !isAtivo && handleTrocarEscritorio(esc.id)}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg border transition-all
                    ${
                      isAtivo
                        ? 'bg-slate-50 border-[#89bcbe] ring-1 ring-[#89bcbe]/20'
                        : 'bg-white border-slate-200 hover:border-slate-300 cursor-pointer hover:shadow-sm'
                    }
                  `}
                >
                  <div
                    className={`w-8 h-8 rounded-md flex items-center justify-center ${isAtivo ? 'bg-[#89bcbe]' : 'bg-slate-100'}`}
                  >
                    <Building2
                      className={`w-4 h-4 ${isAtivo ? 'text-white' : 'text-slate-400'}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium truncate ${isAtivo ? 'text-[#34495e]' : 'text-slate-600'}`}
                    >
                      {esc.nome}
                    </p>
                    {esc.cnpj && (
                      <p className="text-[10px] text-slate-400 truncate">
                        {esc.cnpj}
                      </p>
                    )}
                  </div>
                  {isAtivo && (
                    <span className="text-[10px] text-[#89bcbe] font-medium">
                      Ativo
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Seção Equipe - Expansível */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <button
            onClick={() => setEquipeExpandida(!equipeExpandida)}
            className="flex items-center gap-2 group"
          >
            {equipeExpandida ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide group-hover:text-slate-600 transition-colors">
              Equipe
            </span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500">
              {membros.length}
            </Badge>
          </button>
          <div className="flex items-center gap-2">
            {convitesPendentes.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setModalConvites(true)}
                className="h-7 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
              >
                <Mail className="w-3.5 h-3.5 mr-1" />
                {convitesPendentes.length} pendente
                {convitesPendentes.length > 1 ? 's' : ''}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setModalConvidar(true)}
              className="h-7 px-2 text-xs text-[#34495e] hover:bg-slate-100"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1" />
              Convidar
            </Button>
          </div>
        </div>

        {equipeExpandida && (
          <Card className="border-slate-200">
            <CardContent className="p-3">
              <div className="space-y-1">
                {membros.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">
                    Nenhum membro cadastrado
                  </p>
                ) : (
                  membros.map((membro) => (
                    <div
                      key={membro.id}
                      onClick={() => setMembroSelecionado(membro)}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={membro.avatar_url} />
                        <AvatarFallback className="bg-slate-100 text-slate-600 text-xs">
                          {membro.nome
                            ?.split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#34495e] truncate">
                          {membro.nome || membro.email}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {membro.email}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600"
                      >
                        {membro.cargo?.nome_display || (membro.is_owner ? 'Sócio Administrador' : 'Membro')}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Seção Configurações - Expansível */}
      <div className="space-y-2">
        <button
          onClick={() => setConfigExpandida(!configExpandida)}
          className="flex items-center gap-2 px-1 w-full text-left group"
        >
          {configExpandida ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide group-hover:text-slate-600 transition-colors">
            Configurações
          </span>
          <Settings2 className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {configExpandida && (
          <Card className="border-slate-200">
            <CardContent className="p-4 space-y-4">
              {/* Cargos e Permissões */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#34495e]">
                    Cargos e Permissões
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {cargos.length} cargo{cargos.length !== 1 ? 's' : ''}{' '}
                    configurado{cargos.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setModalCargosPermissoes(true)}
                  className="text-xs h-8"
                >
                  Configurar
                </Button>
              </div>

              <div className="border-t border-slate-100" />

              {/* Valores por Hora */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-[#34495e]">
                      Valores por Hora
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Clique para editar o valor por hora de cada cargo
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {cargos.map((cargo) => (
                    <div
                      key={cargo.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-all"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: cargo.cor || '#64748b' }}
                        />
                        <span className="text-sm text-slate-700 truncate">
                          {cargo.nome_display}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-400">R$</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={getValorHoraDisplay(cargo)}
                          onChange={(e) => handleValorHoraChange(cargo.id, e)}
                          onFocus={handleValorHoraFocus}
                          onBlur={() => handleValorHoraBlur(cargo.id)}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                          className={`w-24 h-7 px-2 text-xs text-right font-medium rounded-md border bg-white transition-colors cursor-text
                            focus:outline-none focus:ring-1 focus:ring-[#89bcbe] focus:border-[#89bcbe]
                            ${cargo.valor_hora_padrao ? 'text-[#34495e] border-slate-200' : 'text-slate-400 border-slate-200'}`}
                        />
                        <span className="text-[10px] text-slate-400">/h</span>
                      </div>
                    </div>
                  ))}
                </div>
                {cargos.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-3">
                    Nenhum cargo configurado. Configure cargos em "Cargos e Permissões".
                  </p>
                )}
              </div>

              <div className="border-t border-slate-100" />

              {/* Configuração Fiscal */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-emerald-100 flex items-center justify-center">
                      <Calculator className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#34495e]">
                        Configuração Fiscal
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Regime tributário e impostos na fatura
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setModalEditarTab('fiscal');
                      setModalEditarEscritorio(true);
                    }}
                    className="text-xs h-8"
                  >
                    Configurar
                  </Button>
                </div>

                {/* Resumo da Configuração Fiscal */}
                {(() => {
                  const configFiscal = escritorioAtivo?.config?.fiscal as ConfiguracaoFiscal | undefined;
                  const regimeLabel = configFiscal
                    ? REGIME_TRIBUTARIO_LABELS[configFiscal.regime_tributario]
                    : 'Não configurado';

                  return (
                    <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Regime Tributário</span>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] px-1.5 py-0.5 ${
                            configFiscal?.regime_tributario === 'lucro_presumido'
                              ? 'bg-blue-100 text-blue-700'
                              : configFiscal?.regime_tributario === 'simples_nacional'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {regimeLabel}
                        </Badge>
                      </div>

                      {configFiscal?.regime_tributario === 'lucro_presumido' && configFiscal.lucro_presumido && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">Retenções Ativas</span>
                          <span className="text-xs font-medium text-[#34495e]">
                            {Object.values(configFiscal.lucro_presumido.impostos || {})
                              .filter((imp: any) => imp?.ativo && imp?.retido_na_fonte)
                              .reduce((sum: number, imp: any) => sum + (imp?.aliquota || 0), 0)
                              .toFixed(2)}% total
                          </span>
                        </div>
                      )}

                      {configFiscal?.regime_tributario === 'simples_nacional' && configFiscal.simples_nacional && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500">Anexo / Faixa</span>
                            <span className="text-xs font-medium text-[#34495e]">
                              Anexo {configFiscal.simples_nacional.anexo} - Faixa {configFiscal.simples_nacional.faixa_atual}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500">Alíquota Efetiva</span>
                            <span className="text-xs font-medium text-[#34495e]">
                              {configFiscal.simples_nacional.aliquota_efetiva?.toFixed(2)}%
                            </span>
                          </div>
                        </>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Exibir na Fatura</span>
                        <span className={`text-xs font-medium ${configFiscal?.exibir_impostos_fatura ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {configFiscal?.exibir_impostos_fatura ? 'Sim' : 'Não'}
                        </span>
                      </div>
                    </div>
                  );
                })()}
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
        onOpenChange={(open) => {
          setModalEditarEscritorio(open);
          if (!open) setModalEditarTab('geral'); // Reset tab when closing
        }}
        escritorio={escritorioAtivo}
        onSuccess={handleSuccessModal}
        initialTab={modalEditarTab}
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

      <ModalConvitesPendentes
        open={modalConvites}
        onOpenChange={setModalConvites}
        convites={convitesPendentes}
        onReenviar={async (id) => {
          const sucesso = await reenviarConvite(id);
          if (sucesso) toast.success('Convite reenviado');
        }}
        onCancelar={async (id) => {
          const sucesso = await cancelarConvite(id);
          if (sucesso) {
            toast.success('Convite cancelado');
            recarregarMembros();
          }
        }}
      />
    </div>
  );
}
