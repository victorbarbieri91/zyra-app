'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Users,
  X,
  Building2,
  Phone,
  Mail,
  MapPin,
  User,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { BulkActionsToolbarCRM, BulkActionCRM } from '@/components/crm/BulkActionsToolbarCRM';
import { BulkEditModalCRM } from '@/components/crm/BulkEditModalCRM';
import { createClient } from '@/lib/supabase/client';
import type { PessoaResumo } from '@/types/crm';

type EditFieldCRM = 'status' | 'categoria';

export default function PessoasPage() {
  const router = useRouter();
  const [pessoas, setPessoas] = useState<PessoaResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [busca, setBusca] = useState('');
  const [tipoCadastro, setTipoCadastro] = useState<string>('todos');
  const [status, setStatus] = useState<string>('todos');
  const [pessoaSelecionada, setPessoaSelecionada] = useState<PessoaResumo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [wizardModalOpen, setWizardModalOpen] = useState(false);
  const itemsPerPage = 15;

  // Estados para selecao em massa
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkEditField, setBulkEditField] = useState<EditFieldCRM | null>(null);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);

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
      if (tipoCadastro !== 'todos') {
        query = query.eq('tipo_cadastro', tipoCadastro);
      }
      if (status !== 'todos') {
        query = query.eq('status', status);
      }
      if (busca.trim()) {
        const searchTerm = busca.trim();
        query = query.or(`nome_completo.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,cpf_cnpj.ilike.%${searchTerm}%`);
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
        tipo_cadastro: p.tipo_cadastro,
        nome_completo: p.nome_completo,
        cpf_cnpj: p.cpf_cnpj,
        telefone: p.telefone,
        email: p.email,
        cidade: p.cidade,
        uf: p.uf,
        status: p.status,
        created_at: p.created_at,
        updated_at: p.updated_at,
      }));

      setPessoas(pessoasMapeadas);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Erro ao buscar pessoas:', error);
    } finally {
      setLoading(false);
    }
  }, [busca, tipoCadastro, status, currentPage]);

  // Buscar dados quando os filtros mudarem
  useEffect(() => {
    fetchPessoas();
  }, [fetchPessoas]);

  // Resetar página quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [busca, tipoCadastro, status]);

  // Limpar selecao quando mudar de pagina ou filtros
  useEffect(() => {
    setSelectedIds(new Set());
  }, [currentPage, busca, tipoCadastro, status]);

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const paginatedPessoas = pessoas;

  const formatCpfCnpj = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length === 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (numbers.length === 14) {
      return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return value;
  };

  const getTipoCadastroColor = (tipo: string) => {
    const colors: Record<string, string> = {
      cliente: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      prospecto: 'bg-amber-50 text-amber-700 border-amber-200',
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

  const getTipoCadastroLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      cliente: 'Cliente',
      prospecto: 'Prospecto',
      parte_contraria: 'Parte Contraria',
      correspondente: 'Correspondente',
      testemunha: 'Testemunha',
      perito: 'Perito',
      juiz: 'Juiz',
      promotor: 'Promotor',
      outros: 'Outros',
    };
    return labels[tipo] || tipo;
  };

  // Handlers de selecao
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === pessoas.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pessoas.map(p => p.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkAction = (action: BulkActionCRM) => {
    if (action === 'alterar_status') {
      setBulkEditField('status');
      setShowBulkEditModal(true);
    } else if (action === 'alterar_categoria') {
      setBulkEditField('categoria');
      setShowBulkEditModal(true);
    }
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] gap-4">
      {/* Lista Principal */}
      <div className="flex-1 flex flex-col space-y-4 min-w-0">
        {/* Filtros e Acoes */}
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
              value={tipoCadastro}
              onValueChange={(value) => {
                setTipoCadastro(value);
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
                <SelectItem value="parte_contraria">Parte Contraria</SelectItem>
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
                <SelectItem value="inativo">Inativo</SelectItem>
                <SelectItem value="arquivado">Arquivado</SelectItem>
              </SelectContent>
            </Select>

            {/* Botao de Acao */}
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
                Pagina {currentPage} de {totalPages}
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
                  {busca || tipoCadastro !== 'todos' || status !== 'todos'
                    ? 'Tente ajustar os filtros ou busca'
                    : 'Comece cadastrando sua primeira pessoa'}
                </p>
                {busca === '' && tipoCadastro === 'todos' && status === 'todos' && (
                  <Button
                    className="bg-gradient-to-r from-[#34495e] to-[#46627f]"
                    onClick={() => setWizardModalOpen(true)}
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
                      <TableHead className="w-[40px] text-center">
                        <Checkbox
                          checked={pessoas.length > 0 && selectedIds.size === pessoas.length}
                          onCheckedChange={toggleSelectAll}
                          className="border-slate-300 data-[state=checked]:bg-[#34495e] data-[state=checked]:border-[#34495e]"
                        />
                      </TableHead>
                      <TableHead className="w-[40px] text-xs">Tipo</TableHead>
                      <TableHead className="w-[220px] text-xs">Nome</TableHead>
                      <TableHead className="w-[130px] text-xs">CPF/CNPJ</TableHead>
                      <TableHead className="w-[120px] text-xs">Telefone</TableHead>
                      <TableHead className="w-[180px] text-xs">Email</TableHead>
                      <TableHead className="w-[120px] text-xs">Cidade/UF</TableHead>
                      <TableHead className="w-[110px] text-xs">Categoria</TableHead>
                      <TableHead className="w-[70px] text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPessoas.map((pessoa) => (
                      <TableRow
                        key={pessoa.id}
                        onClick={() => setPessoaSelecionada(pessoa)}
                        className={`cursor-pointer text-xs ${
                          pessoaSelecionada?.id === pessoa.id ? 'bg-blue-50' : ''
                        } ${selectedIds.has(pessoa.id) ? 'bg-blue-50' : ''}`}
                      >
                        <TableCell className="py-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(pessoa.id)}
                            onCheckedChange={() => toggleSelection(pessoa.id)}
                            className="border-slate-300 data-[state=checked]:bg-[#34495e] data-[state=checked]:border-[#34495e]"
                          />
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center justify-center">
                            {pessoa.tipo_pessoa === 'pj' ? (
                              <Building2 className="w-3.5 h-3.5 text-slate-600" />
                            ) : (
                              <User className="w-3.5 h-3.5 text-slate-600" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium py-2 text-xs truncate max-w-[220px]">
                          {pessoa.nome_completo}
                        </TableCell>
                        <TableCell className="font-mono text-[11px] text-slate-600 py-2">
                          {pessoa.cpf_cnpj ? formatCpfCnpj(pessoa.cpf_cnpj) : '-'}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 py-2">
                          {pessoa.telefone || '-'}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 truncate max-w-[180px] py-2">
                          {pessoa.email || '-'}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 py-2">
                          {pessoa.cidade && pessoa.uf ? `${pessoa.cidade}/${pessoa.uf}` : '-'}
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${getTipoCadastroColor(pessoa.tipo_cadastro)}`}
                          >
                            {getTipoCadastroLabel(pessoa.tipo_cadastro)}
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

              {/* Paginacao */}
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
                    Pagina {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Proxima
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
                  {pessoaSelecionada.tipo_pessoa === 'pj' ? 'Pessoa Juridica' : 'Pessoa Fisica'}
                </p>
                <div className="flex flex-wrap gap-1">
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${getTipoCadastroColor(
                      pessoaSelecionada.tipo_cadastro
                    )}`}
                  >
                    {getTipoCadastroLabel(pessoaSelecionada.tipo_cadastro)}
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
                  {pessoaSelecionada.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{pessoaSelecionada.email}</span>
                    </div>
                  )}
                  {pessoaSelecionada.telefone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{pessoaSelecionada.telefone}</span>
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

              {/* Observacoes */}
              {pessoaSelecionada.observacoes && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900 mb-2">Observacoes</h4>
                    <p className="text-xs text-slate-600 whitespace-pre-wrap">
                      {pessoaSelecionada.observacoes}
                    </p>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>

          {/* Footer com Acoes */}
          <div className="p-4 border-t border-slate-200">
            <Button
              className="w-full bg-gradient-to-r from-[#34495e] to-[#46627f]"
              onClick={() => router.push(`/dashboard/crm/pessoas/${pessoaSelecionada.id}`)}
            >
              Ver Perfil Completo
            </Button>
          </div>
        </div>
      )}

      {/* Modal Wizard para Nova Pessoa */}
      <PessoaWizardModal
        open={wizardModalOpen}
        onOpenChange={setWizardModalOpen}
        onSave={async (data) => {
          try {
            const supabase = createClient();

            const insertData = {
              tipo_pessoa: data.tipo_pessoa,
              tipo_cadastro: data.tipo_cadastro,
              status: data.status || 'ativo',
              nome_completo: data.nome_completo,
              nome_fantasia: data.nome_fantasia || null,
              cpf_cnpj: data.cpf_cnpj || null,
              telefone: data.telefone || null,
              email: data.email || null,
              cep: data.cep || null,
              logradouro: data.logradouro || null,
              numero: data.numero || null,
              complemento: data.complemento || null,
              bairro: data.bairro || null,
              cidade: data.cidade || null,
              uf: data.uf || null,
              origem: data.origem || null,
              observacoes: data.observacoes || null,
            };

            const { error } = await supabase
              .from('crm_pessoas')
              .insert(insertData);

            if (error) throw error;

            fetchPessoas();
          } catch (error) {
            console.error('Erro ao salvar pessoa:', error);
            alert('Erro ao salvar pessoa. Tente novamente.');
          }
        }}
      />

      {/* Toolbar de Acoes em Massa */}
      <BulkActionsToolbarCRM
        selectedCount={selectedIds.size}
        onClearSelection={clearSelection}
        onAction={handleBulkAction}
      />

      {/* Modal de Edicao em Massa */}
      {showBulkEditModal && bulkEditField && (
        <BulkEditModalCRM
          open={showBulkEditModal}
          onClose={() => {
            setShowBulkEditModal(false);
            setBulkEditField(null);
          }}
          field={bulkEditField}
          selectedIds={Array.from(selectedIds)}
          onSuccess={() => {
            fetchPessoas();
            clearSelection();
          }}
        />
      )}
    </div>
  );
}
