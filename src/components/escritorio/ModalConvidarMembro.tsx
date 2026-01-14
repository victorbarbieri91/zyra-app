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
import { UserPlus, Copy, Check } from 'lucide-react';
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
  cargos: Cargo[];
  onSuccess?: () => void;
}

export function ModalConvidarMembro({
  open,
  onOpenChange,
  escritorioId,
  cargos,
  onSuccess,
}: ModalConvidarMembroProps) {
  const [enviando, setEnviando] = useState(false);
  const [linkConvite, setLinkConvite] = useState<string | null>(null);
  const [linkCopiado, setLinkCopiado] = useState(false);

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
        toast.success('Convite enviado com sucesso');
        const link = `${window.location.origin}/convite/${conviteData.token}`;
        setLinkConvite(link);
      }
    } catch (error) {
      console.error('Erro ao enviar convite:', error);
      toast.error('Erro ao enviar convite');
    } finally {
      setEnviando(false);
    }
  };

  const handleClose = () => {
    form.reset({
      email: '',
      cargo_id: cargoPadrao,
    });
    setLinkConvite(null);
    setLinkCopiado(false);
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
              ? 'Convite enviado! Compartilhe o link abaixo com o novo membro.'
              : 'Envie um convite por email para adicionar um novo membro ao escritorio.'}
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
            {/* Link do Convite */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs text-[#adb5bd] mb-2">Link do Convite</p>
              <p className="text-sm text-[#34495e] break-all font-mono">{linkConvite}</p>
            </div>

            {/* Botoes */}
            <div className="flex gap-3">
              <Button
                onClick={handleCopiarLink}
                className="flex-1 bg-gradient-to-r from-[#89bcbe] to-[#6ba9ab] hover:from-[#6ba9ab] hover:to-[#89bcbe] text-white"
              >
                {linkCopiado ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar Link
                  </>
                )}
              </Button>
              <Button onClick={handleClose} variant="outline" className="flex-1">
                Fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
