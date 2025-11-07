'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, User, Building2, Phone, Mail, MapPin, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export default function NovaPessoaPage() {
  const router = useRouter();
  const [tipoPessoa, setTipoPessoa] = useState<'pf' | 'pj'>('pf');
  const [tags, setTags] = useState<string[]>([]);
  const [novaTag, setNovaTag] = useState('');

  const handleAddTag = () => {
    if (novaTag.trim() && !tags.includes(novaTag.trim())) {
      setTags([...tags, novaTag.trim()]);
      setNovaTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implementar salvamento no Supabase
    console.log('Salvar pessoa...');
    router.push('/dashboard/crm/pessoas');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
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
        <div>
          <h1 className="text-2xl font-semibold text-[#34495e]">Nova Pessoa</h1>
          <p className="text-sm text-slate-600 mt-1">
            Cadastre um novo cliente, lead ou contato
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card: Tipo de Pessoa */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-base font-semibold text-[#34495e] mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-[#89bcbe]" />
            Tipo de Pessoa
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setTipoPessoa('pf')}
              className={`
                p-6 rounded-lg border-2 transition-all
                ${
                  tipoPessoa === 'pf'
                    ? 'border-[#89bcbe] bg-[#f0f9f9]'
                    : 'border-slate-200 hover:border-slate-300'
                }
              `}
            >
              <User className="w-8 h-8 mx-auto mb-2 text-[#46627f]" />
              <div className="text-sm font-semibold text-[#34495e]">Pessoa Física</div>
              <div className="text-xs text-slate-500 mt-1">Cliente individual</div>
            </button>

            <button
              type="button"
              onClick={() => setTipoPessoa('pj')}
              className={`
                p-6 rounded-lg border-2 transition-all
                ${
                  tipoPessoa === 'pj'
                    ? 'border-[#89bcbe] bg-[#f0f9f9]'
                    : 'border-slate-200 hover:border-slate-300'
                }
              `}
            >
              <Building2 className="w-8 h-8 mx-auto mb-2 text-[#46627f]" />
              <div className="text-sm font-semibold text-[#34495e]">Pessoa Jurídica</div>
              <div className="text-xs text-slate-500 mt-1">Empresa</div>
            </button>
          </div>
        </div>

        {/* Card: Dados Principais */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-base font-semibold text-[#34495e] mb-4 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#89bcbe]" />
            Dados Principais
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="nome_completo">
                {tipoPessoa === 'pf' ? 'Nome Completo' : 'Razão Social'} *
              </Label>
              <Input
                id="nome_completo"
                name="nome_completo"
                required
                placeholder={
                  tipoPessoa === 'pf' ? 'Maria Silva Santos' : 'Empresa ABC Ltda'
                }
              />
            </div>

            {tipoPessoa === 'pj' && (
              <div className="col-span-2">
                <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
                <Input
                  id="nome_fantasia"
                  name="nome_fantasia"
                  placeholder="ABC Tecnologia"
                />
              </div>
            )}

            <div>
              <Label htmlFor="cpf_cnpj">{tipoPessoa === 'pf' ? 'CPF' : 'CNPJ'}</Label>
              <Input
                id="cpf_cnpj"
                name="cpf_cnpj"
                placeholder={tipoPessoa === 'pf' ? '000.000.000-00' : '00.000.000/0000-00'}
              />
            </div>

            <div>
              <Label htmlFor="rg_ie">
                {tipoPessoa === 'pf' ? 'RG' : 'Inscrição Estadual'}
              </Label>
              <Input id="rg_ie" name="rg_ie" />
            </div>

            {tipoPessoa === 'pf' && (
              <>
                <div>
                  <Label htmlFor="data_nascimento">Data de Nascimento</Label>
                  <Input id="data_nascimento" name="data_nascimento" type="date" />
                </div>

                <div>
                  <Label htmlFor="estado_civil">Estado Civil</Label>
                  <Select name="estado_civil">
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                      <SelectItem value="casado">Casado(a)</SelectItem>
                      <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                      <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                      <SelectItem value="uniao_estavel">União Estável</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="profissao">Profissão</Label>
                  <Input id="profissao" name="profissao" placeholder="Engenheiro" />
                </div>

                <div>
                  <Label htmlFor="nacionalidade">Nacionalidade</Label>
                  <Input
                    id="nacionalidade"
                    name="nacionalidade"
                    defaultValue="Brasileira"
                  />
                </div>
              </>
            )}

            <div>
              <Label htmlFor="tipo_contato">Tipo de Contato *</Label>
              <Select name="tipo_contato" defaultValue="cliente">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cliente">Cliente</SelectItem>
                  <SelectItem value="parte_contraria">Parte Contrária</SelectItem>
                  <SelectItem value="correspondente">Correspondente</SelectItem>
                  <SelectItem value="testemunha">Testemunha</SelectItem>
                  <SelectItem value="perito">Perito</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status *</Label>
              <Select name="status" defaultValue="prospecto">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prospecto">Prospecto</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Card: Contatos */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-base font-semibold text-[#34495e] mb-4 flex items-center gap-2">
            <Phone className="w-4 h-4 text-[#89bcbe]" />
            Contatos
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="telefone_principal">Telefone Principal</Label>
              <Input
                id="telefone_principal"
                name="telefone_principal"
                placeholder="(00) 0000-0000"
              />
            </div>

            <div>
              <Label htmlFor="celular">Celular</Label>
              <Input id="celular" name="celular" placeholder="(00) 90000-0000" />
            </div>

            <div>
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input id="whatsapp" name="whatsapp" placeholder="(00) 90000-0000" />
            </div>

            <div>
              <Label htmlFor="telefone_secundario">Telefone Secundário</Label>
              <Input
                id="telefone_secundario"
                name="telefone_secundario"
                placeholder="(00) 0000-0000"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="email_principal">E-mail Principal</Label>
              <Input
                id="email_principal"
                name="email_principal"
                type="email"
                placeholder="contato@email.com"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="email_secundario">E-mail Secundário</Label>
              <Input
                id="email_secundario"
                name="email_secundario"
                type="email"
                placeholder="outro@email.com"
              />
            </div>
          </div>
        </div>

        {/* Card: Endereço */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-base font-semibold text-[#34495e] mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#89bcbe]" />
            Endereço
          </h2>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label htmlFor="cep">CEP</Label>
              <Input id="cep" name="cep" placeholder="00000-000" />
            </div>

            <div className="col-span-3">
              <Label htmlFor="logradouro">Logradouro</Label>
              <Input id="logradouro" name="logradouro" placeholder="Rua, Avenida..." />
            </div>

            <div>
              <Label htmlFor="numero">Número</Label>
              <Input id="numero" name="numero" placeholder="123" />
            </div>

            <div className="col-span-3">
              <Label htmlFor="complemento">Complemento</Label>
              <Input id="complemento" name="complemento" placeholder="Apto, Sala..." />
            </div>

            <div className="col-span-2">
              <Label htmlFor="bairro">Bairro</Label>
              <Input id="bairro" name="bairro" />
            </div>

            <div>
              <Label htmlFor="cidade">Cidade</Label>
              <Input id="cidade" name="cidade" />
            </div>

            <div>
              <Label htmlFor="uf">UF</Label>
              <Select name="uf">
                <SelectTrigger>
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SP">SP</SelectItem>
                  <SelectItem value="RJ">RJ</SelectItem>
                  <SelectItem value="MG">MG</SelectItem>
                  <SelectItem value="RS">RS</SelectItem>
                  <SelectItem value="BA">BA</SelectItem>
                  {/* Adicionar outros estados */}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Card: Dados CRM */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-base font-semibold text-[#34495e] mb-4">Dados CRM</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="origem">Como Conheceu</Label>
              <Select name="origem">
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="indicacao">Indicação</SelectItem>
                  <SelectItem value="google">Google</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="site">Site</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="responsavel_id">Advogado Responsável</Label>
              <Select name="responsavel_id">
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Dr. João Silva</SelectItem>
                  <SelectItem value="2">Dra. Maria Santos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label htmlFor="tags">Tags</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={novaTag}
                  onChange={(e) => setNovaTag(e.target.value)}
                  placeholder="Digite uma tag e pressione Enter"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={handleAddTag}>
                  Adicionar
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer hover:bg-slate-200"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="col-span-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                name="observacoes"
                rows={4}
                placeholder="Informações adicionais sobre a pessoa..."
              />
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex justify-end gap-3 pb-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="bg-gradient-to-r from-[#34495e] to-[#46627f]"
          >
            <Save className="w-4 h-4 mr-2" />
            Salvar Pessoa
          </Button>
        </div>
      </form>
    </div>
  );
}
