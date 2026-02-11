'use client';

import { useState, useEffect } from 'react';
import { X, Play, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useEscritorio } from '@/contexts/EscritorioContext';
import { useTimer } from '@/contexts/TimerContext';
import { createClient } from '@/lib/supabase/client';

interface ModalNovoTimerProps {
  onClose: () => void;
}

interface ProcessoOption {
  id: string;
  numero: string;
  numero_pasta?: string;
  autor?: string;
  reu?: string;
  cliente_nome?: string;
}

interface ConsultaOption {
  id: string;
  titulo: string;
  numero?: string;
  cliente_nome?: string;
}

export function ModalNovoTimer({ onClose }: ModalNovoTimerProps) {
  const { escritorioAtivo } = useEscritorio();
  const { iniciarTimer } = useTimer();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // Form state
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [vinculoTipo, setVinculoTipo] = useState<'processo' | 'consulta'>('processo');
  const [vinculoId, setVinculoId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Opções de vínculo
  const [processos, setProcessos] = useState<ProcessoOption[]>([]);
  const [consultas, setConsultas] = useState<ConsultaOption[]>([]);

  // Buscar processos/consultas
  useEffect(() => {
    const buscar = async () => {
      if (!escritorioAtivo?.id || searchTerm.length < 2) {
        setProcessos([]);
        setConsultas([]);
        return;
      }

      setSearchLoading(true);
      try {
        if (vinculoTipo === 'processo') {
          // Busca por numero_cnj, numero_pasta OU parte_contraria
          const { data: processosData } = await supabase
            .from('processos_processos')
            .select('id, numero_cnj, numero_pasta, autor, reu, parte_contraria, cliente_id')
            .eq('escritorio_id', escritorioAtivo.id)
            .or(`numero_cnj.ilike.%${searchTerm}%,numero_pasta.ilike.%${searchTerm}%,parte_contraria.ilike.%${searchTerm}%`)
            .limit(15);

          // Também buscar por nome do cliente
          const { data: clientesData } = await supabase
            .from('crm_pessoas')
            .select('id, nome_completo')
            .eq('escritorio_id', escritorioAtivo.id)
            .ilike('nome_completo', `%${searchTerm}%`)
            .limit(10);

          const clienteMap = new Map((clientesData || []).map((c: any) => [c.id, c.nome_completo]));

          // Buscar processos desses clientes
          let processosCliente: any[] = [];
          if (clienteMap.size > 0) {
            const { data: pcData } = await supabase
              .from('processos_processos')
              .select('id, numero_cnj, numero_pasta, autor, reu, parte_contraria, cliente_id')
              .eq('escritorio_id', escritorioAtivo.id)
              .in('cliente_id', Array.from(clienteMap.keys()))
              .limit(10);
            processosCliente = pcData || [];
          }

          // Combinar e remover duplicados
          const todosProcessos = [...(processosData || []), ...processosCliente];
          const processosUnicos = Array.from(
            new Map(todosProcessos.map((p: any) => [p.id, p])).values()
          ).slice(0, 10);

          // Buscar nomes dos clientes restantes
          const clienteIdsParaBuscar = processosUnicos
            .filter((p: any) => p.cliente_id && !clienteMap.has(p.cliente_id))
            .map((p: any) => p.cliente_id);

          if (clienteIdsParaBuscar.length > 0) {
            const { data: clientesExtra } = await supabase
              .from('crm_pessoas')
              .select('id, nome_completo')
              .in('id', clienteIdsParaBuscar);
            (clientesExtra || []).forEach((c: any) => clienteMap.set(c.id, c.nome_completo));
          }

          setProcessos(
            processosUnicos.map((p: any) => ({
              id: p.id,
              numero: p.numero_cnj,
              numero_pasta: p.numero_pasta,
              autor: p.autor,
              reu: p.reu,
              cliente_nome: clienteMap.get(p.cliente_id) || p.parte_contraria,
            }))
          );
        } else {
          // Busca por titulo ou numero
          const { data: consultasData } = await supabase
            .from('consultivo_consultas')
            .select('id, titulo, numero, cliente_id')
            .eq('escritorio_id', escritorioAtivo.id)
            .or(`titulo.ilike.%${searchTerm}%,numero.ilike.%${searchTerm}%`)
            .limit(15);

          // Também buscar por nome do cliente
          const { data: clientesConsultas } = await supabase
            .from('crm_pessoas')
            .select('id, nome_completo')
            .eq('escritorio_id', escritorioAtivo.id)
            .ilike('nome_completo', `%${searchTerm}%`)
            .limit(10);

          const clienteMapConsultas = new Map((clientesConsultas || []).map((c: any) => [c.id, c.nome_completo]));

          // Buscar consultas desses clientes
          let consultasDoCliente: any[] = [];
          if (clienteMapConsultas.size > 0) {
            const { data: ccData } = await supabase
              .from('consultivo_consultas')
              .select('id, titulo, numero, cliente_id')
              .eq('escritorio_id', escritorioAtivo.id)
              .in('cliente_id', Array.from(clienteMapConsultas.keys()))
              .limit(10);
            consultasDoCliente = ccData || [];
          }

          // Combinar e remover duplicados
          const todasConsultas = [...(consultasData || []), ...consultasDoCliente];
          const consultasUnicas = Array.from(
            new Map(todasConsultas.map((c: any) => [c.id, c])).values()
          ).slice(0, 10);

          // Buscar nomes dos clientes restantes
          const clienteIdsBuscar = consultasUnicas
            .filter((c: any) => c.cliente_id && !clienteMapConsultas.has(c.cliente_id))
            .map((c: any) => c.cliente_id);

          if (clienteIdsBuscar.length > 0) {
            const { data: clientesExtra } = await supabase
              .from('crm_pessoas')
              .select('id, nome_completo')
              .in('id', clienteIdsBuscar);
            (clientesExtra || []).forEach((c: any) => clienteMapConsultas.set(c.id, c.nome_completo));
          }

          setConsultas(
            consultasUnicas.map((c: any) => ({
              id: c.id,
              titulo: c.titulo,
              numero: c.numero,
              cliente_nome: clienteMapConsultas.get(c.cliente_id),
            }))
          );
        }
      } catch (err) {
        console.error('Erro ao buscar:', err);
      } finally {
        setSearchLoading(false);
      }
    };

    const debounce = setTimeout(buscar, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm, vinculoTipo, escritorioAtivo?.id, supabase]);

  const handleSubmit = async () => {
    if (!vinculoId) {
      toast.error('Selecione um processo ou consulta');
      return;
    }

    if (!titulo.trim()) {
      toast.error('Informe o título do timer');
      return;
    }

    setLoading(true);
    try {
      await iniciarTimer({
        titulo: titulo.trim(),
        descricao: descricao.trim() || undefined,
        processo_id: vinculoTipo === 'processo' ? vinculoId : undefined,
        consulta_id: vinculoTipo === 'consulta' ? vinculoId : undefined,
      });
      toast.success('Timer iniciado!');
      onClose();
    } catch (err: any) {
      const errorMessage = err?.message || 'Erro ao iniciar timer';
      toast.error(errorMessage);
      console.error('Erro ao iniciar timer:', err);
    } finally {
      setLoading(false);
    }
  };

  const opcoes = vinculoTipo === 'processo' ? processos : consultas;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h3 className="text-base font-semibold text-[#34495e]">Novo Timer</h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-4 space-y-4">
          {/* Título */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Título *
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Análise de contrato, Petição inicial..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#34495e]"
            />
          </div>

          {/* Tipo de vínculo */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Vincular a *
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setVinculoTipo('processo');
                  setVinculoId('');
                  setSearchTerm('');
                }}
                className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                  vinculoTipo === 'processo'
                    ? 'border-[#34495e] bg-[#34495e] text-white'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Processo
              </button>
              <button
                type="button"
                onClick={() => {
                  setVinculoTipo('consulta');
                  setVinculoId('');
                  setSearchTerm('');
                }}
                className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                  vinculoTipo === 'consulta'
                    ? 'border-[#34495e] bg-[#34495e] text-white'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Consulta
              </button>
            </div>
          </div>

          {/* Busca de vínculo */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Buscar {vinculoTipo}
            </label>

            {/* Selecionado — chip */}
            {vinculoId ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-[#f0f9f9] border border-[#aacfd0] rounded-lg">
                <span className="flex-1 text-xs text-[#34495e] truncate">{searchTerm}</span>
                <button
                  type="button"
                  onClick={() => {
                    setVinculoId('');
                    setSearchTerm('');
                  }}
                  className="p-0.5 rounded hover:bg-slate-200 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={vinculoTipo === 'processo' ? 'Buscar por nº processo, pasta, parte ou cliente...' : 'Buscar por título, número ou cliente...'}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#34495e]"
                  />
                </div>

                {/* Lista de opções */}
                {searchTerm.length >= 2 && (
                  <div className="mt-1.5 max-h-40 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                    {searchLoading ? (
                      <div className="p-2.5 text-center text-xs text-slate-500">Buscando...</div>
                    ) : opcoes.length === 0 ? (
                      <div className="p-2.5 text-center text-xs text-slate-500">Nenhum resultado</div>
                    ) : (
                      opcoes.map((opcao) => {
                        const isProcesso = vinculoTipo === 'processo';
                        const proc = opcao as ProcessoOption;
                        const cons = opcao as ConsultaOption;

                        return (
                          <button
                            key={opcao.id}
                            type="button"
                            onClick={() => {
                              setVinculoId(opcao.id);
                              // Montar texto do chip
                              if (isProcesso) {
                                setSearchTerm(proc.numero_pasta ? `${proc.numero_pasta} — ${proc.numero}` : proc.numero);
                              } else {
                                setSearchTerm(cons.numero ? `${cons.numero} — ${cons.titulo}` : cons.titulo);
                              }
                              // Auto-preencher título se vazio
                              if (!titulo) {
                                setTitulo(isProcesso ? proc.numero : cons.titulo);
                              }
                            }}
                            className="w-full px-3 py-1.5 text-left hover:bg-slate-50 transition-colors"
                          >
                            {isProcesso ? (
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-medium text-[#34495e]">
                                    {proc.numero_pasta || proc.numero}
                                  </span>
                                  {proc.numero_pasta && (
                                    <span className="text-[10px] text-slate-400 truncate">{proc.numero}</span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  {proc.autor && proc.reu
                                    ? `${proc.autor} x ${proc.reu}`
                                    : proc.cliente_nome || ''}
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-medium text-[#34495e] truncate">
                                  {cons.numero ? `${cons.numero} — ` : ''}{cons.titulo}
                                </span>
                                {cons.cliente_nome && (
                                  <span className="text-[10px] text-slate-400 truncate">{cons.cliente_nome}</span>
                                )}
                              </div>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Descrição (opcional)
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#34495e] resize-none"
              placeholder="Detalhes da atividade..."
            />
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 bg-slate-50 border-t border-slate-200 rounded-b-xl">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !vinculoId || !titulo.trim()}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Iniciar Timer
          </button>
        </div>
      </div>
    </div>
  );
}
