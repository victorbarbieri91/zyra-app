'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Edit,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  TrendingUp,
  FileText,
  DollarSign,
  MessageCircle,
  Users,
  MoreVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar } from '@/components/ui/avatar';
import { InteracaoTimeline } from '@/components/crm/InteracaoTimeline';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { InteracaoJSONB } from '@/types/crm';

// Mock data
const mockPessoa = {
  id: '1',
  tipo_pessoa: 'pf' as const,
  tipo_contato: 'cliente' as const,
  nome_completo: 'Maria Silva Santos',
  cpf_cnpj: '123.456.789-01',
  rg_ie: '12.345.678-9',
  data_nascimento: '1985-05-15',
  estado_civil: 'casado' as const,
  profissao: 'Engenheira',
  telefone_principal: '(11) 3456-7890',
  celular: '(11) 98765-4321',
  whatsapp: '(11) 98765-4321',
  email_principal: 'maria.silva@email.com',
  cep: '01310-100',
  logradouro: 'Av. Paulista',
  numero: '1578',
  bairro: 'Bela Vista',
  cidade: 'São Paulo',
  uf: 'SP',
  status: 'ativo' as const,
  origem: 'indicacao',
  responsavel_nome: 'Dr. João Advocacia',
  tags: ['vip', 'trabalhista'],
  observacoes: 'Cliente desde 2020. Sempre pontual nos pagamentos.',
  created_at: '2024-01-15T10:00:00Z',
};

const mockInteracoes: InteracaoJSONB[] = [
  {
    id: '1',
    tipo: 'reuniao',
    data: '2024-01-20T14:00:00Z',
    descricao: 'Discussão sobre ação trabalhista. Cliente apresentou documentação completa. Documentos recebidos.',
    user_id: '1',
    user_nome: 'Dr. João Silva',
  },
  {
    id: '2',
    tipo: 'email',
    data: '2024-01-18T10:30:00Z',
    descricao: 'Enviado email com atualização sobre movimentação processual. Cliente satisfeito.',
    user_id: '1',
    user_nome: 'Dr. João Silva',
  },
];

export default function PerfilPessoaPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('resumo');

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>

          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <div className="bg-gradient-to-br from-[#34495e] to-[#89bcbe] w-full h-full flex items-center justify-center text-white text-2xl font-semibold">
                {mockPessoa.nome_completo.charAt(0).toUpperCase()}
              </div>
            </Avatar>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-semibold text-[#34495e]">
                  {mockPessoa.nome_completo}
                </h1>
                <Badge
                  variant="outline"
                  className="bg-emerald-100 text-emerald-700 border-emerald-200"
                >
                  Cliente
                </Badge>
                <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
                  Ativo
                </Badge>
              </div>
              <p className="text-sm text-slate-600">
                {mockPessoa.profissao} • Responsável: {mockPessoa.responsavel_nome}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/crm/pessoas/${params.id}/editar`)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <MessageCircle className="w-4 h-4 mr-2" />
                Registrar Interação
              </DropdownMenuItem>
              <DropdownMenuItem>
                <TrendingUp className="w-4 h-4 mr-2" />
                Criar Oportunidade
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Briefcase className="w-4 h-4 mr-2" />
                Vincular Processo
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">
                Arquivar Cliente
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Informações Rápidas */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-600 mb-1">Processos</div>
          <div className="text-2xl font-bold text-[#34495e]">3</div>
          <div className="text-xs text-slate-500 mt-1">2 ativos</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-600 mb-1">Interações</div>
          <div className="text-2xl font-bold text-[#34495e]">12</div>
          <div className="text-xs text-slate-500 mt-1">Última há 5 dias</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-600 mb-1">Honorários</div>
          <div className="text-2xl font-bold text-emerald-600">R$ 15k</div>
          <div className="text-xs text-slate-500 mt-1">R$ 5k pendentes</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-600 mb-1">Follow-ups</div>
          <div className="text-2xl font-bold text-amber-600">1</div>
          <div className="text-xs text-slate-500 mt-1">Pendente</div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white border border-slate-200 p-1">
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="processos">Processos</TabsTrigger>
          <TabsTrigger value="interacoes">Interações</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
        </TabsList>

        {/* Tab: Resumo */}
        <TabsContent value="resumo" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Dados Pessoais */}
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <h3 className="text-base font-semibold text-[#34495e] mb-4">Dados Pessoais</h3>

              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-[#89bcbe] mt-0.5" />
                  <div className="flex-1">
                    <div className="text-xs text-slate-500 mb-0.5">Celular</div>
                    <div className="text-slate-700">{mockPessoa.celular}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-[#89bcbe] mt-0.5" />
                  <div className="flex-1">
                    <div className="text-xs text-slate-500 mb-0.5">E-mail</div>
                    <div className="text-slate-700">{mockPessoa.email_principal}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#89bcbe] mt-0.5" />
                  <div className="flex-1">
                    <div className="text-xs text-slate-500 mb-0.5">Endereço</div>
                    <div className="text-slate-700">
                      {mockPessoa.logradouro}, {mockPessoa.numero}
                      <br />
                      {mockPessoa.bairro} - {mockPessoa.cidade}/{mockPessoa.uf}
                      <br />
                      CEP: {mockPessoa.cep}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-[#89bcbe] mt-0.5" />
                  <div className="flex-1">
                    <div className="text-xs text-slate-500 mb-0.5">Data de Nascimento</div>
                    <div className="text-slate-700">
                      {new Date(mockPessoa.data_nascimento).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Briefcase className="w-4 h-4 text-[#89bcbe] mt-0.5" />
                  <div className="flex-1">
                    <div className="text-xs text-slate-500 mb-0.5">Profissão</div>
                    <div className="text-slate-700">{mockPessoa.profissao}</div>
                  </div>
                </div>
              </div>

              {mockPessoa.tags && mockPessoa.tags.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="text-xs text-slate-500 mb-2">Tags</div>
                  <div className="flex flex-wrap gap-2">
                    {mockPessoa.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Observações e Histórico */}
            <div className="space-y-6">
              {mockPessoa.observacoes && (
                <div className="bg-white border border-slate-200 rounded-lg p-6">
                  <h3 className="text-base font-semibold text-[#34495e] mb-4">Observações</h3>
                  <p className="text-sm text-slate-600">{mockPessoa.observacoes}</p>
                </div>
              )}

              <div className="bg-white border border-slate-200 rounded-lg p-6">
                <h3 className="text-base font-semibold text-[#34495e] mb-4">
                  Informações de Origem
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="text-xs text-slate-500 mb-0.5">Como Conheceu</div>
                    <div className="text-slate-700">
                      {mockPessoa.origem === 'indicacao' ? 'Indicação' : mockPessoa.origem}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-0.5">Cliente Desde</div>
                    <div className="text-slate-700">
                      {new Date(mockPessoa.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab: Processos */}
        <TabsContent value="processos">
          <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
            <Briefcase className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-600 mb-2">Nenhum processo vinculado</h3>
            <p className="text-sm text-slate-500 mb-6">
              Vincule processos a este cliente para acompanhamento
            </p>
            <Button className="bg-gradient-to-r from-[#34495e] to-[#46627f]">
              Vincular Processo
            </Button>
          </div>
        </TabsContent>

        {/* Tab: Interações */}
        <TabsContent value="interacoes">
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-semibold text-[#34495e]">
                Timeline de Interações
              </h3>
              <Button
                size="sm"
                className="bg-gradient-to-r from-[#34495e] to-[#46627f]"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Nova Interação
              </Button>
            </div>

            <InteracaoTimeline interacoes={mockInteracoes} />
          </div>
        </TabsContent>

        {/* Tab: Financeiro */}
        <TabsContent value="financeiro">
          <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
            <DollarSign className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-600 mb-2">
              Dados financeiros não disponíveis
            </h3>
            <p className="text-sm text-slate-500">
              Integração com módulo financeiro em desenvolvimento
            </p>
          </div>
        </TabsContent>

        {/* Tab: Documentos */}
        <TabsContent value="documentos">
          <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-600 mb-2">Nenhum documento anexado</h3>
            <p className="text-sm text-slate-500 mb-6">
              Faça upload de documentos relacionados a este cliente
            </p>
            <Button className="bg-gradient-to-r from-[#34495e] to-[#46627f]">
              Upload de Documento
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
