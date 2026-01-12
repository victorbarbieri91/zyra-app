'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Download,
  Users,
  X,
  Building2,
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  FileText,
  DollarSign,
  Clock,
  User,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PessoaWizardModal } from '@/components/crm/PessoaWizardModal';
import { createClient } from '@/lib/supabase/client';
import type { PessoaResumo } from '@/types/crm';

export default function PessoasPage() {
  const router = useRouter();
  const [pessoas, setPessoas] = useState<PessoaResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [busca, setBusca] = useState('');
  const [tipoContato, setTipoContato] = useState<string>('todos');
  const [status, setStatus] = useState<string>('todos');
  const [pessoaSelecionada, setPessoaSelecionada] = useState<PessoaResumo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [wizardModalOpen, setWizardModalOpen] = useState(false);
  const itemsPerPage = 15;

  // Buscar pessoas do banco de dados
  const fetchPessoas = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      let query = supabase
        .from('crm_pessoas')
        .select('*', { count: 'exact' })
        .order('nome_completo', { ascending: true });

      // Aplicar filtros
      if (tipoContato !== 'todos') {
        query = query.eq('tipo_contato', tipoContato);
      }
      if (status !== 'todos') {
        query = query.eq('status', status);
      }
      if (busca.trim()) {
        const searchTerm = busca.trim();
        query = query.or(`nome_completo.ilike.%${searchTerm}%,email_principal.ilike.%${searchTerm}%,cpf_cnpj.ilike.%${searchTerm}%`);
      }

      // Paginação
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      // Mapear para o tipo PessoaResumo
      const pessoasMapeadas: PessoaResumo[] = (data || []).map(p => ({
        id: p.id,
        escritorio_id: p.escritorio_id,
        tipo_pessoa: p.tipo_pessoa,
        tipo_contato: p.tipo_contato,
        nome_completo: p.nome_completo,
        cpf_cnpj: p.cpf_cnpj,
        celular: p.celular,
        email_principal: p.email_principal,
        cidade: p.cidade,
        uf: p.uf,
        status: p.status,
        created_at: p.created_at,
        updated_at: p.updated_at,
        responsavel_nome: null,
        total_processos: 0,
        processos_ativos: 0,
        total_honorarios: 0,
        honorarios_pendentes: 0,
        honorarios_pagos: 0,
        dias_sem_contato: null,
        total_interacoes: 0,
        follow_ups_pendentes: 0,
        oportunidades_ativas: 0,
        total_relacionamentos: 0,
      }));

      setPessoas(pessoasMapeadas);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Erro ao buscar pessoas:', error);
    } finally {
      setLoading(false);
    }
  }, [busca, tipoContato, status, currentPage]);

  // Buscar dados quando os filtros mudarem
  useEffect(() => {
    fetchPessoas();
  }, [fetchPessoas]);

  // Resetar página quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [busca, tipoContato, status]);

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const paginatedPessoas = pessoas;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatCpfCnpj = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length === 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (numbers.length === 14) {
      return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return value;
  };

  const getTipoContatoColor = (tipo: string) => {
    const colors: Record<string, string> = {
      cliente: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      prospecto: 'bg-amber-50 text-amber-700 border-amber-200',
      parceiro: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      parte_contraria: 'bg-red-50 text-red-700 border-red-200',
      correspondente: 'bg-blue-50 text-blue-700 border-blue-200',
      testemunha: 'bg-purple-50 text-purple-700 border-purple-200',
      perito: 'bg-teal-50 text-teal-700 border-teal-200',
      juiz: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      promotor: 'bg-violet-50 text-violet-700 border-violet-200',
      outros: 'bg-slate-50 text-slate-700 border-slate-200',
    };
    return colors[tipo] || 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const getTipoContatoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      cliente: 'Cliente',
      prospecto: 'Prospecto',
      parceiro: 'Parceiro',
      parte_contraria: 'Parte Contrária',
      correspondente: 'Correspondente',
      testemunha: 'Testemunha',
      perito: 'Perito',
      juiz: 'Juiz',
      promotor: 'Promotor',
      outros: 'Outros',
    };
    return labels[tipo] || tipo;
  };

  // Verifica se deve mostrar stats de cliente (apenas para cliente e prospecto)
  const isClienteOuProspecto = (tipo: string) => {
    return tipo === 'cliente' || tipo === 'prospecto';
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] gap-4">
      {/* Lista Principal */}
      <div className="flex-1 flex flex-col space-y-4 min-w-0">
        {/* Filtros e Ações */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex-shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            {/* Busca */}
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Buscar por nome, CPF/CNPJ, email..."
                  value={busca}
                  onChange={(e) => {
                    setBusca(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filtro Tipo */}
            <Select
              value={tipoContato}
              onValueChange={(value) => {
                setTipoContato(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="cliente">Cliente</SelectItem>
                <SelectItem value="prospecto">Prospecto</SelectItem>
                <SelectItem value="parceiro">Parceiro</SelectItem>
                <SelectItem value="parte_contraria">Parte Contrária</SelectItem>
                <SelectItem value="correspondente">Correspondente</SelectItem>
                <SelectItem value="testemunha">Testemunha</SelectItem>
                <SelectItem value="perito">Perito</SelectItem>
                <SelectItem value="juiz">Juiz</SelectItem>
                <SelectItem value="promotor">Promotor</SelectItem>
                <SelectItem value="outros">Outros</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtro Status */}
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="prospecto">Prospecto</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>

            {/* Botões de Ação */}
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>

            <Button
              size="sm"
              className="bg-gradient-to-r from-[#34495e] to-[#46627f] hover:opacity-90"
              onClick={() => setWizardModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Pessoa
            </Button>
          </div>

          {/* Contador de resultados */}
          <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
            <span>
              {totalCount} pessoa(s) encontrada(s)
            </span>
            {totalPages > 1 && (
              <span>
                Página {currentPage} de {totalPages}
              </span>
            )}
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white border border-slate-200 rounded-lg flex-1 flex flex-col overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : pessoas.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-12">
              <div className="text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-semibold text-slate-600 mb-2">
                  Nenhuma pessoa encontrada
                </h3>
                <p className="text-sm text-slate-500 mb-6">
                  {busca || tipoContato !== 'todos' || status !== 'todos'
                    ? 'Tente ajustar os filtros ou busca'
                    : 'Comece cadastrando sua primeira pessoa'}
                </p>
                {busca === '' && tipoContato === 'todos' && status === 'todos' && (
                  <Button
                    className="bg-gradient-to-r from-[#34495e] to-[#46627f]"
                    onClick={() => router.push('/dashboard/crm/pessoas/novo')}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Cadastrar Primeira Pessoa
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead className="w-[40px] text-xs">Tipo</TableHead>
                      <TableHead className="w-[250px] text-xs">Nome</TableHead>
                      <TableHead className="w-[150px] text-xs">CPF/CNPJ</TableHead>
                      <TableHead className="w-[130px] text-xs">Telefone</TableHead>
                      <TableHead className="w-[220px] text-xs">Email</TableHead>
                      <TableHead className="w-[150px] text-xs">Cidade/UF</TableHead>
                      <TableHead className="w-[130px] text-xs">Categoria</TableHead>
                      <TableHead className="w-[80px] text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPessoas.map((pessoa) => (
                      <TableRow
                        key={pessoa.id}
                        onClick={() => setPessoaSelecionada(pessoa)}
                        className={`cursor-pointer text-xs ${
                          pessoaSelecionada?.id === pessoa.id ? 'bg-blue-50' : ''
                        }`}
                      >
                        <TableCell className="py-2">
                          <div className="flex items-center justify-center">
                            {pessoa.tipo_pessoa === 'pj' ? (
                              <Building2 className="w-3.5 h-3.5 text-slate-600" />
                            ) : (
                              <User className="w-3.5 h-3.5 text-slate-600" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium py-2 text-xs">{pessoa.nome_completo}</TableCell>
                        <TableCell className="font-mono text-[11px] text-slate-600 py-2">
                          {pessoa.cpf_cnpj ? formatCpfCnpj(pessoa.cpf_cnpj) : '-'}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 py-2">
                          {pessoa.celular || '-'}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 truncate max-w-[220px] py-2">
                          {pessoa.email_principal || '-'}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 py-2">
                          {pessoa.cidade && pessoa.uf ? `${pessoa.cidade}/${pessoa.uf}` : '-'}
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${getTipoContatoColor(pessoa.tipo_contato)}`}
                          >
                            {getTipoContatoLabel(pessoa.tipo_contato)}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge
                            variant={pessoa.status === 'ativo' ? 'default' : 'secondary'}
                            className="text-[10px]"
                          >
                            {pessoa.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-slate-200 flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-slate-600">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Painel Lateral de Detalhes */}
      {pessoaSelecionada && (
        <div className="w-96 bg-white border border-slate-200 rounded-lg flex flex-col overflow-hidden flex-shrink-0">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#34495e]">Detalhes da Pessoa</h2>
            <Button variant="ghost" size="sm" onClick={() => setPessoaSelecionada(null)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {/* Nome e Tipo */}
              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-1">
                  {pessoaSelecionada.nome_completo}
                </h3>
                <p className="text-xs text-slate-600 mb-2">
                  {pessoaSelecionada.tipo_pessoa === 'pj' ? 'Pessoa Jurídica' : 'Pessoa Física'}
                </p>
                <div className="flex flex-wrap gap-1">
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${getTipoContatoColor(
                      pessoaSelecionada.tipo_contato
                    )}`}
                  >
                    {getTipoContatoLabel(pessoaSelecionada.tipo_contato)}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] bg-slate-100">
                    {pessoaSelecionada.status}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Dados Cadastrais */}
              <div>
                <h4 className="text-xs font-semibold text-slate-900 mb-2">Dados Cadastrais</h4>
                <div className="space-y-2 text-xs text-slate-600">
                  {pessoaSelecionada.cpf_cnpj && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">
                        {pessoaSelecionada.tipo_pessoa === 'pj' ? 'CNPJ:' : 'CPF:'}
                      </span>
                      <span className="font-mono">
                        {formatCpfCnpj(pessoaSelecionada.cpf_cnpj)}
                      </span>
                    </div>
                  )}
                  {pessoaSelecionada.email_principal && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{pessoaSelecionada.email_principal}</span>
                    </div>
                  )}
                  {pessoaSelecionada.celular && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{pessoaSelecionada.celular}</span>
                    </div>
                  )}
                  {pessoaSelecionada.cidade && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>
                        {pessoaSelecionada.cidade}/{pessoaSelecionada.uf}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Estatísticas - APENAS para Cliente e Prospecto */}
              {isClienteOuProspecto(pessoaSelecionada.tipo_contato) && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900 mb-3">
                      Dados Comerciais
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
                          <FileText className="w-3.5 h-3.5" />
                          <span>Processos</span>
                        </div>
                        <div className="text-lg font-bold text-slate-900">
                          {pessoaSelecionada.total_processos}
                        </div>
                        <div className="text-[10px] text-slate-600">
                          {pessoaSelecionada.processos_ativos} ativos
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Interações</span>
                        </div>
                        <div className="text-lg font-bold text-slate-900">
                          {pessoaSelecionada.total_interacoes}
                        </div>
                        {pessoaSelecionada.dias_sem_contato != null && (
                          <div
                            className={`text-[10px] ${
                              (pessoaSelecionada.dias_sem_contato ?? 0) > 30
                                ? 'text-amber-600'
                                : 'text-slate-600'
                            }`}
                          >
                            {pessoaSelecionada.dias_sem_contato}d sem contato
                          </div>
                        )}
                      </div>

                      <div className="bg-gradient-to-r from-[#f0f9f9] to-[#e8f5f5] rounded-lg p-3">
                        <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>Honorários</span>
                        </div>
                        <div className="text-sm font-bold text-slate-900">
                          {formatCurrency(pessoaSelecionada.total_honorarios)}
                        </div>
                        <div className="text-[10px] text-emerald-600">
                          {formatCurrency(pessoaSelecionada.honorarios_pagos)} pagos
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Follow-ups</span>
                        </div>
                        <div className="text-lg font-bold text-slate-900">
                          {pessoaSelecionada.follow_ups_pendentes}
                        </div>
                        <div className="text-[10px] text-slate-600">pendentes</div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Informação para não-clientes */}
              {!isClienteOuProspecto(pessoaSelecionada.tipo_contato) && (
                <>
                  <Separator />
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <p className="text-xs text-slate-600 text-center">
                      Esta pessoa está cadastrada como{' '}
                      <strong>{getTipoContatoLabel(pessoaSelecionada.tipo_contato)}</strong>.
                      <br />
                      Dados comerciais disponíveis apenas para Clientes e Prospectos.
                    </p>
                  </div>
                </>
              )}

              {/* Responsável */}
              <Separator />
              <div>
                <h4 className="text-xs font-semibold text-slate-900 mb-2">Responsável</h4>
                <div className="text-xs text-slate-600">
                  {pessoaSelecionada.responsavel_nome || 'Não atribuído'}
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Footer com Ações */}
          <div className="p-4 border-t border-slate-200 space-y-2">
            <Button
              className="w-full bg-gradient-to-r from-[#34495e] to-[#46627f]"
              onClick={() => router.push(`/dashboard/crm/pessoas/${pessoaSelecionada.id}`)}
            >
              Ver Perfil Completo
            </Button>
            {isClienteOuProspecto(pessoaSelecionada.tipo_contato) && (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm">
                  <MessageSquare className="w-3.5 h-3.5 mr-1" />
                  Interação
                </Button>
                <Button variant="outline" size="sm">
                  <FileText className="w-3.5 h-3.5 mr-1" />
                  Processos
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Wizard para Nova Pessoa */}
      <PessoaWizardModal
        open={wizardModalOpen}
        onOpenChange={setWizardModalOpen}
        onSave={async (data) => {
          console.log('Salvando pessoa:', data)
          // TODO: Integrar com Supabase
          alert('Pessoa salva com sucesso!')
        }}
      />
    </div>
  );
}
