'use client';

import { useState } from 'react';
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
import type { PessoaResumo } from '@/types/crm';

// Mock data temporário - simular volume maior
const mockPessoas: PessoaResumo[] = Array.from({ length: 50 }, (_, i) => ({
  id: `${i + 1}`,
  escritorio_id: '1',
  tipo_pessoa: i % 3 === 0 ? ('pj' as const) : ('pf' as const),
  tipo_contato: ['cliente', 'prospecto', 'parte_contraria', 'correspondente', 'testemunha', 'perito'][
    i % 6
  ] as any,
  nome_completo:
    i % 3 === 0
      ? `Empresa ${String.fromCharCode(65 + (i % 26))} Ltda`
      : `${['João', 'Maria', 'Pedro', 'Ana', 'Carlos', 'Juliana'][i % 6]} ${
          ['Silva', 'Santos', 'Costa', 'Souza', 'Oliveira', 'Ferreira'][Math.floor(i / 6) % 6]
        }`,
  cpf_cnpj:
    i % 3 === 0
      ? `${String(12345678 + i).padStart(8, '0')}000190`
      : `${String(12345678901 + i).padStart(11, '0')}`,
  celular: `(11) 9${String(8000 + i).padStart(4, '0')}-${String(1000 + i).padStart(4, '0')}`,
  email_principal: `pessoa${i}@email.com`,
  cidade: ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Porto Alegre'][i % 5],
  uf: ['SP', 'RJ', 'MG', 'PR', 'RS'][i % 5],
  status: ['ativo', 'prospecto', 'inativo'][Math.floor(Math.random() * 3)] as any,
  created_at: new Date(2024, 0, i + 1).toISOString(),
  updated_at: new Date(2024, 0, i + 1).toISOString(),
  responsavel_nome: 'Dr. João Silva',
  total_processos: Math.floor(Math.random() * 10),
  processos_ativos: Math.floor(Math.random() * 5),
  total_honorarios: Math.random() * 100000,
  honorarios_pendentes: Math.random() * 30000,
  honorarios_pagos: Math.random() * 70000,
  dias_sem_contato: Math.floor(Math.random() * 60),
  total_interacoes: Math.floor(Math.random() * 30),
  follow_ups_pendentes: Math.floor(Math.random() * 3),
  oportunidades_ativas: Math.floor(Math.random() * 2),
  total_relacionamentos: Math.floor(Math.random() * 5),
}));

export default function PessoasPage() {
  const router = useRouter();
  const [busca, setBusca] = useState('');
  const [tipoContato, setTipoContato] = useState<string>('todos');
  const [status, setStatus] = useState<string>('todos');
  const [pessoaSelecionada, setPessoaSelecionada] = useState<PessoaResumo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const pessoasFiltradas = mockPessoas.filter((pessoa) => {
    const matchBusca =
      pessoa.nome_completo.toLowerCase().includes(busca.toLowerCase()) ||
      pessoa.email_principal?.toLowerCase().includes(busca.toLowerCase()) ||
      pessoa.cpf_cnpj?.includes(busca.replace(/\D/g, ''));
    const matchTipo = tipoContato === 'todos' || pessoa.tipo_contato === tipoContato;
    const matchStatus = status === 'todos' || pessoa.status === status;

    return matchBusca && matchTipo && matchStatus;
  });

  const totalPages = Math.ceil(pessoasFiltradas.length / itemsPerPage);
  const paginatedPessoas = pessoasFiltradas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
      parte_contraria: 'bg-red-50 text-red-700 border-red-200',
      correspondente: 'bg-blue-50 text-blue-700 border-blue-200',
      testemunha: 'bg-purple-50 text-purple-700 border-purple-200',
      perito: 'bg-teal-50 text-teal-700 border-teal-200',
    };
    return colors[tipo] || 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const getTipoContatoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      cliente: 'Cliente',
      prospecto: 'Prospecto',
      parte_contraria: 'Parte Contrária',
      correspondente: 'Correspondente',
      testemunha: 'Testemunha',
      perito: 'Perito',
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
                <SelectItem value="parte_contraria">Parte Contrária</SelectItem>
                <SelectItem value="correspondente">Correspondente</SelectItem>
                <SelectItem value="testemunha">Testemunha</SelectItem>
                <SelectItem value="perito">Perito</SelectItem>
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
              onClick={() => router.push('/dashboard/crm/pessoas/novo')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Pessoa
            </Button>
          </div>

          {/* Contador de resultados */}
          <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
            <span>
              {pessoasFiltradas.length} pessoa(s) encontrada(s)
              {pessoasFiltradas.length !== mockPessoas.length &&
                ` de ${mockPessoas.length} no total`}
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
          {pessoasFiltradas.length === 0 ? (
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
                        {pessoaSelecionada.dias_sem_contato !== undefined && (
                          <div
                            className={`text-[10px] ${
                              pessoaSelecionada.dias_sem_contato > 30
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
    </div>
  );
}
