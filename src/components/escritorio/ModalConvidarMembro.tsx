'use client';

import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserPlus, Copy, Check, Mail, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Cargo } from '@/types/escritorio';

const conviteSchema = z.object({
  email: z.string().email('Email invalido'),
  cargo_id: z.string().min(1, 'Selecione um cargo'),
});

type ConviteFormData = z.infer<typeof conviteSchema>;

interface ModalConvidarMembroProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  escritorioId: string;
  escritorioNome?: string;
  cargos: Cargo[];
  onSuccess?: () => void;
}

export function ModalConvidarMembro({
  open,
  onOpenChange,
  escritorioId,
  escritorioNome,
  cargos,
  onSuccess,
}: ModalConvidarMembroProps) {
  const [enviando, setEnviando] = useState(false);
  const [linkConvite, setLinkConvite] = useState<string | null>(null);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const [conviteEmail, setConviteEmail] = useState<string>('');
  // Dados para reenvio de email
  const [emailPayload, setEmailPayload] = useState<Record<string, string> | null>(null);

  const supabase = createClient();

  // Filtrar cargos disponiveis (excluir dono)
  const cargosDisponiveis = cargos
    .filter((c) => c.nome !== 'dono')
    .sort((a, b) => a.nivel - b.nivel);

  // Cargo padrao: pleno
  const cargoPadrao = cargosDisponiveis.find((c) => c.nome === 'pleno')?.id || '';

  const form = useForm<ConviteFormData>({
    resolver: zodResolver(conviteSchema),
    defaultValues: {
      email: '',
      cargo_id: cargoPadrao,
    },
  });

  const handleCopiarLink = async () => {
    if (!linkConvite) return;

    try {
      await navigator.clipboard.writeText(linkConvite);
      setLinkCopiado(true);
      toast.success('Link copiado para a area de transferencia');
      setTimeout(() => setLinkCopiado(false), 2000);
    } catch (error) {
      toast.error('Erro ao copiar link');
    }
  };

  const onSubmit = async (data: ConviteFormData) => {
    setEnviando(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuario nao autenticado');

      // Verificar se já existe convite pendente para este email
      const { data: conviteExistente } = await supabase
        .from('escritorios_convites')
        .select('id')
        .eq('escritorio_id', escritorioId)
        .eq('email', data.email)
        .eq('aceito', false)
        .gt('expira_em', new Date().toISOString())
        .maybeSingle();

      if (conviteExistente) {
        toast.warning('Já existe um convite pendente para este email.');
        setEnviando(false);
        return;
      }

      // Verificar se já é membro do escritório (via email no profile)
      const { data: membroExistente } = await supabase
        .from('escritorios_usuarios')
        .select('id, profile:profiles!usuarios_escritorios_user_id_fkey(email)')
        .eq('escritorio_id', escritorioId)
        .eq('ativo', true);

      if (membroExistente?.some((m: any) => m.profile?.email === data.email)) {
        toast.warning('Este email já pertence a um membro ativo do escritório.');
        setEnviando(false);
        return;
      }

      // Buscar cargo selecionado para pegar o role antigo (compatibilidade)
      const cargoSelecionado = cargos.find((c) => c.id === data.cargo_id);
      const roleLegacy = cargoSelecionado?.nome === 'socio' ? 'admin' :
                         cargoSelecionado?.nome === 'gerente' ? 'admin' :
                         cargoSelecionado?.nome === 'senior' ? 'advogado' :
                         cargoSelecionado?.nome === 'pleno' ? 'advogado' :
                         cargoSelecionado?.nome === 'junior' ? 'assistente' :
                         'assistente';

      const { data: conviteData, error } = await supabase
        .from('escritorios_convites')
        .insert({
          escritorio_id: escritorioId,
          email: data.email,
          cargo_id: data.cargo_id,
          role: roleLegacy,
          convidado_por: userData.user.id,
        })
        .select('token, expira_em')
        .single();

      if (error) throw error;

      if (conviteData?.token) {
        const link = `${window.location.origin}/convite/${conviteData.token}`;
        setLinkConvite(link);
        setConviteEmail(data.email);

        // Buscar nome do convidante para o email
        const { data: profileData } = await supabase
          .from('profiles')
          .select('nome_completo')
          .eq('id', userData.user.id)
          .single();

        const payload = {
          token: conviteData.token,
          email: data.email,
          escritorio_nome: escritorioNome || 'Escritório',
          cargo_nome: cargoSelecionado?.nome_display || 'Membro',
          convidado_por_nome: profileData?.nome_completo || 'Um administrador',
          expira_em: conviteData.expira_em,
        };
        setEmailPayload(payload);

        // Tentar enviar email automaticamente
        setEmailStatus('sending');
        try {
          const emailResponse = await supabase.functions.invoke('enviar-convite-email', {
            body: payload,
          });

          if (emailResponse.error) {
            console.warn('Email não enviado:', emailResponse.error);
            setEmailStatus('failed');
          } else {
            setEmailStatus('sent');
            toast.success(`Convite enviado por email para ${data.email}`);
          }
        } catch (emailErr) {
          console.warn('Falha ao enviar email de convite:', emailErr);
          setEmailStatus('failed');
        }
      }
    } catch (error) {
      console.error('Erro ao enviar convite:', error);
      toast.error('Erro ao enviar convite');
    } finally {
      setEnviando(false);
    }
  };

  const handleEnviarEmail = async () => {
    if (!emailPayload) return;
    setEmailStatus('sending');
    try {
      const emailResponse = await supabase.functions.invoke('enviar-convite-email', {
        body: emailPayload,
      });

      if (emailResponse.error) {
        console.warn('Email não enviado:', emailResponse.error);
        setEmailStatus('failed');
        toast.error('Falha ao enviar email. Tente novamente ou compartilhe o link.');
      } else {
        setEmailStatus('sent');
        toast.success(`Email enviado para ${conviteEmail}`);
      }
    } catch (err) {
      console.warn('Falha ao enviar email:', err);
      setEmailStatus('failed');
      toast.error('Falha ao enviar email. Tente novamente ou compartilhe o link.');
    }
  };

  const handleClose = () => {
    form.reset({
      email: '',
      cargo_id: cargoPadrao,
    });
    setLinkConvite(null);
    setLinkCopiado(false);
    setEmailStatus('idle');
    setConviteEmail('');
    setEmailPayload(null);
    onOpenChange(false);
    if (linkConvite && onSuccess) onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#34495e]">
            <UserPlus className="w-5 h-5 text-[#89bcbe]" />
            Convidar Novo Membro
          </DialogTitle>
          <DialogDescription className="text-[#6c757d]">
            {linkConvite
              ? 'Convite criado com sucesso! Envie por email ou compartilhe o link.'
              : 'Envie um convite por email para adicionar um novo membro ao escritório.'}
          </DialogDescription>
        </DialogHeader>

        {!linkConvite ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#34495e]">Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="exemplo@email.com"
                        type="email"
                        {...field}
                        className="border-slate-200 focus:ring-[#89bcbe]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Cargo */}
              <FormField
                control={form.control}
                name="cargo_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#34495e]">Cargo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-slate-200 focus:ring-[#89bcbe]">
                          <SelectValue placeholder="Selecione um cargo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cargosDisponiveis.map((cargo) => (
                          <SelectItem key={cargo.id} value={cargo.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: cargo.cor || '#64748b' }}
                              />
                              {cargo.nome_display}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Botoes */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                  disabled={enviando}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-[#89bcbe] to-[#6ba9ab] hover:from-[#6ba9ab] hover:to-[#89bcbe] text-white"
                  disabled={enviando}
                >
                  {enviando ? 'Enviando...' : 'Enviar Convite'}
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <div className="space-y-4">
            {/* Status do Email */}
            <div className={`p-3 rounded-lg border flex items-center gap-3 ${
              emailStatus === 'sent'
                ? 'bg-emerald-50 border-emerald-200'
                : emailStatus === 'failed'
                ? 'bg-amber-50 border-amber-200'
                : emailStatus === 'sending'
                ? 'bg-blue-50 border-blue-200'
                : 'bg-slate-50 border-slate-200'
            }`}>
              {emailStatus === 'sent' && (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-emerald-700">Email enviado</p>
                    <p className="text-xs text-emerald-600">Convite enviado para {conviteEmail}</p>
                  </div>
                </>
              )}
              {emailStatus === 'failed' && (
                <>
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-700">Email não enviado</p>
                    <p className="text-xs text-amber-600">Envie manualmente ou compartilhe o link</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleEnviarEmail}
                    className="h-8 px-3 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <Send className="w-3.5 h-3.5 mr-1" />
                    Tentar novamente
                  </Button>
                </>
              )}
              {emailStatus === 'sending' && (
                <>
                  <div className="w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-700">Enviando email...</p>
                    <p className="text-xs text-blue-600">Aguarde um momento</p>
                  </div>
                </>
              )}
              {emailStatus === 'idle' && (
                <>
                  <Mail className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-600">Enviar por email</p>
                    <p className="text-xs text-slate-500">{conviteEmail}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleEnviarEmail}
                    className="h-8 px-3 text-xs bg-gradient-to-r from-[#89bcbe] to-[#6ba9ab] hover:from-[#6ba9ab] hover:to-[#89bcbe] text-white"
                  >
                    <Send className="w-3.5 h-3.5 mr-1" />
                    Enviar
                  </Button>
                </>
              )}
            </div>

            {/* Link do Convite */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs text-[#adb5bd] mb-2">Link do Convite</p>
              <div className="flex items-center gap-2">
                <p className="text-sm text-[#34495e] break-all font-mono flex-1">{linkConvite}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopiarLink}
                  className="h-8 w-8 p-0 flex-shrink-0 text-slate-500 hover:text-[#89bcbe]"
                >
                  {linkCopiado ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Botão Fechar */}
            <Button onClick={handleClose} variant="outline" className="w-full">
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
