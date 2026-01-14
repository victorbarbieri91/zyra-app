'use client';

import { useState, useEffect } from 'react';
import { X, Play, Loader2, Search } from 'lucide-react';
import { useEscritorio } from '@/contexts/EscritorioContext';
import { useTimer } from '@/contexts/TimerContext';
import { createClient } from '@/lib/supabase/client';

interface ModalNovoTimerProps {
  onClose: () => void;
}

interface ProcessoOption {
  id: string;
  numero: string;
  cliente_nome?: string;
}

interface ConsultaOption {
  id: string;
  titulo: string;
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
  const [faturavel, setFaturavel] = useState(true);
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
          const { data } = await supabase
            .from('processos_processos')
            .select('id, numero_cnj, crm_pessoas(nome_completo)')
            .eq('escritorio_id', escritorioAtivo.id)
            .ilike('numero_cnj', `%${searchTerm}%`)
            .limit(10);

          setProcessos(
            (data || []).map((p: any) => ({
              id: p.id,
              numero: p.numero_cnj,
              cliente_nome: p.crm_pessoas?.nome_completo,
            }))
          );
        } else {
          const { data } = await supabase
            .from('consultivo_consultas')
            .select('id, assunto, numero_interno, crm_pessoas(nome_completo)')
            .eq('escritorio_id', escritorioAtivo.id)
            .ilike('assunto', `%${searchTerm}%`)
            .limit(10);

          setConsultas(
            (data || []).map((c: any) => ({
              id: c.id,
              titulo: c.numero_interno ? `${c.numero_interno} - ${c.assunto}` : c.assunto,
              cliente_nome: c.crm_pessoas?.nome_completo,
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
      alert('Selecione um processo ou consulta');
      return;
    }

    if (!titulo.trim()) {
      alert('Informe o título do timer');
      return;
    }

    setLoading(true);
    try {
      await iniciarTimer({
        titulo: titulo.trim(),
        descricao: descricao.trim() || undefined,
        processo_id: vinculoTipo === 'processo' ? vinculoId : undefined,
        consulta_id: vinculoTipo === 'consulta' ? vinculoId : undefined,
        faturavel,
      });
      onClose();
    } catch (err) {
      console.error('Erro ao iniciar timer:', err);
      alert('Erro ao iniciar timer');
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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Digite o número do ${vinculoTipo}...`}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#34495e]"
              />
            </div>

            {/* Lista de opções */}
            {searchTerm.length >= 2 && (
              <div className="mt-2 max-h-32 overflow-y-auto border border-slate-200 rounded-lg">
                {searchLoading ? (
                  <div className="p-3 text-center text-sm text-slate-500">Buscando...</div>
                ) : opcoes.length === 0 ? (
                  <div className="p-3 text-center text-sm text-slate-500">Nenhum resultado</div>
                ) : (
                  opcoes.map((opcao) => (
                    <button
                      key={opcao.id}
                      type="button"
                      onClick={() => {
                        setVinculoId(opcao.id);
                        setSearchTerm(vinculoTipo === 'processo' ? (opcao as ProcessoOption).numero : (opcao as ConsultaOption).titulo);
                        // Auto-preencher título se vazio
                        if (!titulo) {
                          setTitulo(vinculoTipo === 'processo' ? (opcao as ProcessoOption).numero : (opcao as ConsultaOption).titulo);
                        }
                      }}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 transition-colors ${
                        vinculoId === opcao.id ? 'bg-slate-100' : ''
                      }`}
                    >
                      <span className="font-medium">
                        {vinculoTipo === 'processo'
                          ? (opcao as ProcessoOption).numero
                          : (opcao as ConsultaOption).titulo}
                      </span>
                      {opcao.cliente_nome && (
                        <span className="text-slate-400 ml-2">({opcao.cliente_nome})</span>
                      )}
                    </button>
                  ))
                )}
              </div>
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

          {/* Faturável */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={faturavel}
              onChange={(e) => setFaturavel(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-[#34495e] focus:ring-[#34495e]"
            />
            <span className="text-sm text-slate-600">Hora faturável</span>
          </label>
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
