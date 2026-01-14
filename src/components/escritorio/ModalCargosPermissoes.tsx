'use client';

import { useState, useEffect } from 'react';
import { X, Shield, Check, Eye, Plus, Edit3, Trash2, Download, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  CargoComPermissoes,
  ModuloPermissao,
  MODULO_LABELS,
  PERMISSAO_LABELS,
  Cargo,
} from '@/types/escritorio';

interface ModalCargosPermissoesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cargosComPermissoes: CargoComPermissoes[];
  escritorioId: string;
  onSuccess: () => void;
  // Funções do hook
  createCargo: (cargo: { nome: string; nome_display: string; cor?: string }) => Promise<Cargo | null>;
  updateCargo: (cargoId: string, dados: { nome_display?: string; cor?: string }) => Promise<boolean>;
  deleteCargo: (cargoId: string) => Promise<boolean>;
  reorderCargos: (cargos: { id: string; nivel: number }[]) => Promise<boolean>;
}

type PermissaoKey = 'pode_visualizar' | 'pode_criar' | 'pode_editar' | 'pode_excluir' | 'pode_exportar';

const PERMISSAO_ICONS: Record<PermissaoKey, typeof Eye> = {
  pode_visualizar: Eye,
  pode_criar: Plus,
  pode_editar: Edit3,
  pode_excluir: Trash2,
  pode_exportar: Download,
};

const MODULOS: ModuloPermissao[] = ['financeiro', 'relatorios', 'configuracoes'];
const PERMISSOES: PermissaoKey[] = ['pode_visualizar', 'pode_criar', 'pode_editar', 'pode_excluir', 'pode_exportar'];

const CORES_DISPONIVEIS = [
  '#34495e', '#46627f', '#89bcbe', '#6ba9ab', '#1E3A8A',
  '#059669', '#D97706', '#DC2626', '#7C3AED', '#EC4899',
];

type TabType = 'cargos' | 'permissoes';

export function ModalCargosPermissoes({
  open,
  onOpenChange,
  cargosComPermissoes,
  escritorioId,
  onSuccess,
  createCargo,
  updateCargo,
  deleteCargo,
  reorderCargos,
}: ModalCargosPermissoesProps) {
  const [tab, setTab] = useState<TabType>('cargos');
  const [permissoesState, setPermissoesState] = useState<
    Record<string, Record<ModuloPermissao, Record<PermissaoKey, boolean>>>
  >({});
  const [salvando, setSalvando] = useState(false);
  const [alteracoes, setAlteracoes] = useState<Set<string>>(new Set());

  // Estado para edição de cargo
  const [editandoCargo, setEditandoCargo] = useState<string | null>(null);
  const [novoNome, setNovoNome] = useState('');
  const [novaCor, setNovaCor] = useState('#64748b');

  // Estado para novo cargo
  const [adicionandoCargo, setAdicionandoCargo] = useState(false);
  const [novoCargoNome, setNovoCargoNome] = useState('');
  const [novoCargoCor, setNovoCargoCor] = useState('#64748b');

  const supabase = createClient();

  // Inicializar estado com os dados atuais
  useEffect(() => {
    const novoEstado: typeof permissoesState = {};

    cargosComPermissoes.forEach((cargo) => {
      novoEstado[cargo.id] = {} as Record<ModuloPermissao, Record<PermissaoKey, boolean>>;

      MODULOS.forEach((modulo) => {
        const permissao = cargo.permissoes.find((p) => p.modulo === modulo);
        novoEstado[cargo.id][modulo] = {
          pode_visualizar: permissao?.pode_visualizar ?? false,
          pode_criar: permissao?.pode_criar ?? false,
          pode_editar: permissao?.pode_editar ?? false,
          pode_excluir: permissao?.pode_excluir ?? false,
          pode_exportar: permissao?.pode_exportar ?? false,
        };
      });
    });

    setPermissoesState(novoEstado);
    setAlteracoes(new Set());
  }, [cargosComPermissoes]);

  const handleTogglePermissao = (
    cargoId: string,
    modulo: ModuloPermissao,
    permissao: PermissaoKey
  ) => {
    // Não permitir editar permissões do cargo principal (nível 1)
    const cargo = cargosComPermissoes.find((c) => c.id === cargoId);
    if (cargo?.nivel === 1) {
      toast.error('Não é possível alterar permissões do cargo principal');
      return;
    }

    setPermissoesState((prev) => {
      const novoEstado = { ...prev };
      novoEstado[cargoId] = { ...novoEstado[cargoId] };
      novoEstado[cargoId][modulo] = { ...novoEstado[cargoId][modulo] };
      novoEstado[cargoId][modulo][permissao] = !novoEstado[cargoId][modulo][permissao];
      return novoEstado;
    });

    setAlteracoes((prev) => new Set(prev).add(`${cargoId}::${modulo}`));
  };

  const handleSalvarPermissoes = async () => {
    if (alteracoes.size === 0) {
      return;
    }

    setSalvando(true);

    try {
      const promises: Promise<any>[] = [];

      alteracoes.forEach((key) => {
        const [cargoId, modulo] = key.split('::') as [string, ModuloPermissao];
        const permissoes = permissoesState[cargoId][modulo];

        promises.push(
          supabase
            .from('escritorios_cargos_permissoes')
            .update({
              pode_visualizar: permissoes.pode_visualizar,
              pode_criar: permissoes.pode_criar,
              pode_editar: permissoes.pode_editar,
              pode_excluir: permissoes.pode_excluir,
              pode_exportar: permissoes.pode_exportar,
              updated_at: new Date().toISOString(),
            })
            .eq('cargo_id', cargoId)
            .eq('modulo', modulo)
        );
      });

      await Promise.all(promises);
      toast.success('Permissões atualizadas!');
      setAlteracoes(new Set());
      onSuccess();
    } catch (error) {
      console.error('Erro ao salvar permissões:', error);
      toast.error('Erro ao salvar permissões');
    } finally {
      setSalvando(false);
    }
  };

  const handleAdicionarCargo = async () => {
    if (!novoCargoNome.trim()) {
      toast.error('Digite um nome para o cargo');
      return;
    }

    setSalvando(true);
    const resultado = await createCargo({
      nome: novoCargoNome,
      nome_display: novoCargoNome,
      cor: novoCargoCor,
    });

    if (resultado) {
      toast.success('Cargo adicionado!');
      setNovoCargoNome('');
      setNovoCargoCor('#64748b');
      setAdicionandoCargo(false);
      onSuccess();
    } else {
      toast.error('Erro ao adicionar cargo');
    }
    setSalvando(false);
  };

  const handleEditarCargo = (cargo: CargoComPermissoes) => {
    setEditandoCargo(cargo.id);
    setNovoNome(cargo.nome_display);
    setNovaCor(cargo.cor || '#64748b');
  };

  const handleSalvarEdicao = async (cargoId: string) => {
    if (!novoNome.trim()) {
      toast.error('Digite um nome para o cargo');
      return;
    }

    setSalvando(true);
    const sucesso = await updateCargo(cargoId, {
      nome_display: novoNome,
      cor: novaCor,
    });

    if (sucesso) {
      toast.success('Cargo atualizado!');
      setEditandoCargo(null);
      onSuccess();
    } else {
      toast.error('Erro ao atualizar cargo');
    }
    setSalvando(false);
  };

  const handleExcluirCargo = async (cargoId: string) => {
    const cargo = cargosComPermissoes.find((c) => c.id === cargoId);
    if (cargo?.nivel === 1) {
      toast.error('Não é possível excluir o cargo principal');
      return;
    }

    if (!confirm('Tem certeza que deseja excluir este cargo?')) return;

    setSalvando(true);
    const sucesso = await deleteCargo(cargoId);

    if (sucesso) {
      toast.success('Cargo excluído!');
      onSuccess();
    } else {
      toast.error('Erro ao excluir cargo. Verifique se não há membros vinculados.');
    }
    setSalvando(false);
  };

  const handleMoverCargo = async (cargoId: string, direcao: 'up' | 'down') => {
    const cargosOrdenados = [...cargosComPermissoes].sort((a, b) => a.nivel - b.nivel);
    const index = cargosOrdenados.findIndex((c) => c.id === cargoId);

    if (index === -1) return;
    if (direcao === 'up' && index <= 1) return; // Não pode mover acima do nível 1 ou se já for segundo
    if (direcao === 'down' && index === cargosOrdenados.length - 1) return;

    // Não permitir mover o cargo de nível 1
    if (cargosOrdenados[index].nivel === 1) {
      toast.error('Não é possível mover o cargo principal');
      return;
    }

    const novoIndex = direcao === 'up' ? index - 1 : index + 1;

    // Se o cargo destino é nível 1, não permitir
    if (cargosOrdenados[novoIndex].nivel === 1) {
      return;
    }

    // Trocar posições
    const temp = cargosOrdenados[index];
    cargosOrdenados[index] = cargosOrdenados[novoIndex];
    cargosOrdenados[novoIndex] = temp;

    // Recalcular níveis
    const novosNiveis = cargosOrdenados.map((c, i) => ({
      id: c.id,
      nivel: i + 1,
    }));

    setSalvando(true);
    const sucesso = await reorderCargos(novosNiveis);

    if (sucesso) {
      onSuccess();
    } else {
      toast.error('Erro ao reordenar');
    }
    setSalvando(false);
  };

  // Ordenar cargos por nível
  const cargosOrdenados = [...cargosComPermissoes].sort((a, b) => a.nivel - b.nivel);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-[#34495e]">
            <Shield className="w-5 h-5 text-[#46627f]" />
            Gerenciar Cargos e Permissões
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-200 mb-4">
          <button
            onClick={() => setTab('cargos')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'cargos'
                ? 'border-[#46627f] text-[#34495e]'
                : 'border-transparent text-[#6c757d] hover:text-[#34495e]'
            }`}
          >
            Cargos
          </button>
          <button
            onClick={() => setTab('permissoes')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'permissoes'
                ? 'border-[#46627f] text-[#34495e]'
                : 'border-transparent text-[#6c757d] hover:text-[#34495e]'
            }`}
          >
            Permissões
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {tab === 'cargos' ? (
            /* Tab Cargos */
            <div className="space-y-3">
              <p className="text-xs text-[#6c757d] mb-4">
                Organize os cargos do seu escritório. O primeiro cargo é sempre o administrador principal.
              </p>

              {/* Lista de cargos */}
              <div className="space-y-2">
                {cargosOrdenados.map((cargo, index) => {
                  const isPrincipal = cargo.nivel === 1;
                  const isEditando = editandoCargo === cargo.id;

                  return (
                    <div
                      key={cargo.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        isPrincipal ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200'
                      }`}
                    >
                      {/* Ordem/Setas */}
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => handleMoverCargo(cargo.id, 'up')}
                          disabled={isPrincipal || index <= 1 || salvando}
                          className="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleMoverCargo(cargo.id, 'down')}
                          disabled={isPrincipal || index === cargosOrdenados.length - 1 || salvando}
                          className="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Cor */}
                      {isEditando ? (
                        <div className="flex gap-1">
                          {CORES_DISPONIVEIS.map((cor) => (
                            <button
                              key={cor}
                              onClick={() => setNovaCor(cor)}
                              className={`w-5 h-5 rounded-full border-2 ${
                                novaCor === cor ? 'border-slate-800' : 'border-transparent'
                              }`}
                              style={{ backgroundColor: cor }}
                            />
                          ))}
                        </div>
                      ) : (
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: cargo.cor || '#64748b' }}
                        />
                      )}

                      {/* Nome */}
                      <div className="flex-1">
                        {isEditando ? (
                          <Input
                            value={novoNome}
                            onChange={(e) => setNovoNome(e.target.value)}
                            className="h-8 text-sm"
                            placeholder="Nome do cargo"
                          />
                        ) : (
                          <div>
                            <span className="text-sm font-medium text-[#34495e]">
                              {cargo.nome_display}
                            </span>
                            {isPrincipal && (
                              <span className="ml-2 text-xs text-[#6c757d]">(principal)</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Ações */}
                      <div className="flex gap-1">
                        {isEditando ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSalvarEdicao(cargo.id)}
                              disabled={salvando}
                              className="h-8 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditandoCargo(null)}
                              disabled={salvando}
                              className="h-8 px-2 text-slate-500 hover:text-slate-600"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditarCargo(cargo)}
                              disabled={salvando}
                              className="h-8 px-2 text-slate-500 hover:text-slate-600"
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            {!isPrincipal && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleExcluirCargo(cargo.id)}
                                disabled={salvando}
                                className="h-8 px-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Adicionar novo cargo */}
              {adicionandoCargo ? (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-slate-300 bg-slate-50">
                  <div className="flex gap-1">
                    {CORES_DISPONIVEIS.map((cor) => (
                      <button
                        key={cor}
                        onClick={() => setNovoCargoCor(cor)}
                        className={`w-5 h-5 rounded-full border-2 ${
                          novoCargoCor === cor ? 'border-slate-800' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: cor }}
                      />
                    ))}
                  </div>
                  <Input
                    value={novoCargoNome}
                    onChange={(e) => setNovoCargoNome(e.target.value)}
                    className="flex-1 h-8 text-sm"
                    placeholder="Nome do novo cargo"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleAdicionarCargo}
                    disabled={salvando || !novoCargoNome.trim()}
                    className="h-8 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAdicionandoCargo(false);
                      setNovoCargoNome('');
                    }}
                    disabled={salvando}
                    className="h-8 px-2 text-slate-500 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setAdicionandoCargo(true)}
                  disabled={salvando}
                  className="w-full border-dashed"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Cargo
                </Button>
              )}
            </div>
          ) : (
            /* Tab Permissões */
            <div>
              {/* Tabela de permissões */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left px-4 py-3 text-sm font-semibold text-[#34495e] border-b border-slate-200 sticky left-0 bg-slate-50 z-10">
                        Cargo
                      </th>
                      {MODULOS.map((modulo) => (
                        <th
                          key={modulo}
                          colSpan={5}
                          className="text-center px-2 py-3 text-sm font-semibold text-[#34495e] border-b border-l border-slate-200"
                        >
                          {MODULO_LABELS[modulo]}
                        </th>
                      ))}
                    </tr>
                    <tr className="bg-slate-50/50">
                      <th className="border-b border-slate-200 sticky left-0 bg-slate-50/50 z-10" />
                      {MODULOS.map((modulo) =>
                        PERMISSOES.map((perm) => {
                          const Icon = PERMISSAO_ICONS[perm];
                          return (
                            <th
                              key={`${modulo}-${perm}`}
                              className="px-1 py-2 text-center border-b border-slate-200"
                              title={PERMISSAO_LABELS[perm]}
                            >
                              <Icon className="w-3.5 h-3.5 mx-auto text-[#6c757d]" />
                            </th>
                          );
                        })
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {cargosOrdenados.map((cargo, index) => {
                      const isPrincipal = cargo.nivel === 1;

                      return (
                        <tr
                          key={cargo.id}
                          className={`${
                            index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                          } ${isPrincipal ? 'opacity-60' : ''}`}
                        >
                          <td className="px-4 py-3 border-b border-slate-100 sticky left-0 bg-inherit z-10">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: cargo.cor || '#64748b' }}
                              />
                              <span className="text-sm font-medium text-[#34495e]">
                                {cargo.nome_display}
                              </span>
                              {isPrincipal && (
                                <span className="text-xs text-[#6c757d]">(todas)</span>
                              )}
                            </div>
                          </td>
                          {MODULOS.map((modulo) =>
                            PERMISSOES.map((perm) => (
                              <td
                                key={`${cargo.id}-${modulo}-${perm}`}
                                className="px-1 py-2 text-center border-b border-slate-100"
                              >
                                <Checkbox
                                  checked={isPrincipal || (permissoesState[cargo.id]?.[modulo]?.[perm] ?? false)}
                                  onCheckedChange={() =>
                                    handleTogglePermissao(cargo.id, modulo, perm)
                                  }
                                  disabled={isPrincipal}
                                  className={`
                                    ${isPrincipal || permissoesState[cargo.id]?.[modulo]?.[perm]
                                      ? 'bg-[#46627f] border-[#46627f]'
                                      : 'border-slate-300'
                                    }
                                    ${isPrincipal ? 'cursor-not-allowed' : 'cursor-pointer'}
                                  `}
                                />
                              </td>
                            ))
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Legenda */}
              <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                <p className="text-xs font-medium text-[#34495e] mb-2">Legenda:</p>
                <div className="flex flex-wrap gap-4">
                  {PERMISSOES.map((perm) => {
                    const Icon = PERMISSAO_ICONS[perm];
                    return (
                      <div key={perm} className="flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5 text-[#6c757d]" />
                        <span className="text-xs text-[#6c757d]">
                          {PERMISSAO_LABELS[perm]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex justify-between items-center pt-4 border-t border-slate-200">
          <p className="text-xs text-[#6c757d]">
            {tab === 'permissoes' && alteracoes.size > 0
              ? `${alteracoes.size} alteração(ões) pendente(s)`
              : ''}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={salvando}
            >
              Fechar
            </Button>
            {tab === 'permissoes' && alteracoes.size > 0 && (
              <Button
                onClick={handleSalvarPermissoes}
                disabled={salvando}
                className="bg-[#46627f] hover:bg-[#34495e]"
              >
                {salvando ? 'Salvando...' : 'Salvar Permissões'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
