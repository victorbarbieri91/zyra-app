'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Building2, Upload, X, Calculator, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { ConfiguracaoFiscal } from './ConfiguracaoFiscal';
import { ConfiguracaoFiscal as ConfiguracaoFiscalType, ALIQUOTAS_LUCRO_PRESUMIDO } from '@/types/escritorio';

const escritorioSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  cnpj: z
    .string()
    .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/, 'CNPJ inválido')
    .optional()
    .or(z.literal('')),
  telefone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  site: z.string().url('URL inválida').optional().or(z.literal('')),
});

type EscritorioFormData = z.infer<typeof escritorioSchema>;

interface ModalEditarEscritorioProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  escritorio: {
    id: string;
    nome: string;
    cnpj?: string;
    logo_url?: string;
    telefone?: string;
    email?: string;
    site?: string;
    config?: {
      fiscal?: ConfiguracaoFiscalType;
      [key: string]: any;
    };
  };
  onSuccess?: () => void;
  initialTab?: 'geral' | 'fiscal';
}

const defaultFiscalConfig: ConfiguracaoFiscalType = {
  regime_tributario: 'lucro_presumido',
  lucro_presumido: {
    impostos: ALIQUOTAS_LUCRO_PRESUMIDO,
    percentual_presuncao: 32,
  },
  simples_nacional: {
    anexo: 'IV',
    faixa_atual: 1,
    aliquota_efetiva: 4.5,
    rbt12: 0,
    inss_patronal_separado: true,
  },
  exibir_impostos_fatura: true,
};

export function ModalEditarEscritorio({
  open,
  onOpenChange,
  escritorio,
  onSuccess,
  initialTab = 'geral',
}: ModalEditarEscritorioProps) {
  const [salvando, setSalvando] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(escritorio.logo_url);
  const [activeTab, setActiveTab] = useState('geral');
  const [configFiscal, setConfigFiscal] = useState<ConfiguracaoFiscalType>(
    escritorio.config?.fiscal || defaultFiscalConfig
  );
  const supabase = createClient();

  const form = useForm<EscritorioFormData>({
    resolver: zodResolver(escritorioSchema),
    defaultValues: {
      nome: escritorio.nome,
      cnpj: escritorio.cnpj || '',
      telefone: escritorio.telefone || '',
      email: escritorio.email || '',
      site: escritorio.site || '',
    },
  });

  // Reset state when modal opens with new escritorio
  useEffect(() => {
    if (open) {
      console.log('=== MODAL OPENED ===');
      console.log('escritorio.id:', escritorio.id);
      console.log('escritorio.nome:', escritorio.nome);
      console.log('escritorio.config:', escritorio.config);
      console.log('escritorio.config?.fiscal:', escritorio.config?.fiscal);

      setLogoUrl(escritorio.logo_url);
      setConfigFiscal(escritorio.config?.fiscal || defaultFiscalConfig);
      setActiveTab(initialTab);

      // Reset form values when escritorio changes
      form.reset({
        nome: escritorio.nome,
        cnpj: escritorio.cnpj || '',
        telefone: escritorio.telefone || '',
        email: escritorio.email || '',
        site: escritorio.site || '',
      });
    }
  }, [open, escritorio, initialTab, form]);

  const formatarCNPJ = (valor: string) => {
    const numeros = valor.replace(/\D/g, '');
    if (numeros.length <= 14) {
      return numeros
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return numeros.slice(0, 14);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tamanho (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Tamanho máximo: 2MB');
      return;
    }

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      toast.error('Apenas imagens são permitidas');
      return;
    }

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${escritorio.id}-${Date.now()}.${fileExt}`;
      const filePath = `escritorios/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('logos').getPublicUrl(filePath);

      setLogoUrl(publicUrl);
      toast.success('Logo enviado com sucesso');
    } catch (error) {
      console.error('Erro ao fazer upload do logo:', error);
      toast.error('Erro ao fazer upload do logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoverLogo = () => {
    setLogoUrl(undefined);
    toast.info('Logo removido. Salve para confirmar');
  };

  const onSubmit = async (data: EscritorioFormData) => {
    setSalvando(true);
    try {
      // Merge fiscal config with existing config
      const existingConfig = escritorio.config || {};
      const newConfig = {
        ...existingConfig,
        fiscal: configFiscal,
        telefone: data.telefone || null,
        email: data.email || null,
      };

      console.log('=== SUBMITTING FORM ===');
      console.log('escritorio.id:', escritorio.id);
      console.log('configFiscal:', JSON.stringify(configFiscal, null, 2));
      console.log('newConfig:', JSON.stringify(newConfig, null, 2));

      const { data: updateResult, error } = await supabase
        .from('escritorios')
        .update({
          nome: data.nome,
          cnpj: data.cnpj || null,
          logo_url: logoUrl || null,
          telefone: data.telefone || null,
          email: data.email || null,
          site: data.site || null,
          config: newConfig,
          updated_at: new Date().toISOString(),
        })
        .eq('id', escritorio.id)
        .select();

      console.log('updateResult:', updateResult);
      console.log('error:', error);

      if (error) throw error;

      // Verificar se o update realmente funcionou (RLS pode bloquear silenciosamente)
      if (!updateResult || updateResult.length === 0) {
        console.error('RLS bloqueou o update - nenhum registro retornado');
        toast.error('Você não tem permissão para editar este escritório. Apenas o sócio administrador ou administradores podem editar.');
        return;
      }

      console.log('Config salva com sucesso:', updateResult[0]?.config);

      toast.success('Escritório atualizado com sucesso');
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('Erro ao atualizar escritório:', error);
      toast.error(error.message || 'Erro ao atualizar escritório');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#34495e]">
            <Building2 className="w-5 h-5 text-[#89bcbe]" />
            Editar Escritório
          </DialogTitle>
          <DialogDescription className="text-[#6c757d]">
            Atualize as informações e configurações do escritório.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="geral" className="flex items-center gap-1.5 text-sm">
                  <FileText className="w-4 h-4" />
                  Dados Gerais
                </TabsTrigger>
                <TabsTrigger value="fiscal" className="flex items-center gap-1.5 text-sm">
                  <Calculator className="w-4 h-4" />
                  Configuração Fiscal
                </TabsTrigger>
              </TabsList>

              {/* Aba Dados Gerais */}
              <TabsContent value="geral" className="space-y-4">
                {/* Logo Upload */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#34495e]">Logo do Escritório</label>
                  <div className="flex items-center gap-4">
                    {logoUrl ? (
                      <div className="relative">
                        <img
                          src={logoUrl}
                          alt="Logo"
                          className="w-20 h-20 rounded-lg object-cover border-2 border-slate-200"
                        />
                        <button
                          type="button"
                          onClick={handleRemoverLogo}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-300">
                        <Building2 className="w-8 h-8 text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingLogo}
                        onClick={() => document.getElementById('logo-upload')?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {uploadingLogo ? 'Enviando...' : 'Escolher Imagem'}
                      </Button>
                      <p className="text-xs text-[#adb5bd] mt-1">PNG, JPG até 2MB</p>
                      <input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* Nome */}
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#34495e]">Nome do Escritório*</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Silva & Advogados Associados"
                          {...field}
                          className="border-slate-200 focus:ring-[#89bcbe]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* CNPJ */}
                <FormField
                  control={form.control}
                  name="cnpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#34495e]">CNPJ</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="00.000.000/0000-00"
                          {...field}
                          onChange={(e) => field.onChange(formatarCNPJ(e.target.value))}
                          className="border-slate-200 focus:ring-[#89bcbe]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Telefone */}
                <FormField
                  control={form.control}
                  name="telefone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#34495e]">Telefone</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(00) 0000-0000"
                          {...field}
                          className="border-slate-200 focus:ring-[#89bcbe]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#34495e]">Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="contato@escritorio.com.br"
                          type="email"
                          {...field}
                          className="border-slate-200 focus:ring-[#89bcbe]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Site */}
                <FormField
                  control={form.control}
                  name="site"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#34495e]">Site</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://www.escritorio.com.br"
                          {...field}
                          className="border-slate-200 focus:ring-[#89bcbe]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Aba Configuração Fiscal */}
              <TabsContent value="fiscal" className="space-y-4">
                <ConfiguracaoFiscal
                  value={configFiscal}
                  onChange={setConfigFiscal}
                />
              </TabsContent>
            </Tabs>

            {/* Botões */}
            <div className="flex gap-3 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
                disabled={salvando}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-[#89bcbe] to-[#6ba9ab] hover:from-[#6ba9ab] hover:to-[#89bcbe] text-white"
                disabled={salvando || uploadingLogo}
              >
                {salvando ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
