'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { createClient } from '@/lib/supabase/client';

const formSchema = z.object({
  fullName: z.string().min(3, { message: 'O nome deve ter pelo menos 3 caracteres.' }),
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  oabNumber: z.string().regex(/^\d+$/, { message: 'Apenas números são permitidos.' }),
  oabUf: z.string().length(2, { message: 'UF deve ter 2 caracteres.' }).transform(value => value.toUpperCase()),
  phone: z.string().min(10, { message: 'Telefone inválido.' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
  confirmPassword: z.string(),
  terms: z.boolean().refine(val => val === true, { message: 'Você deve aceitar os termos de uso.' }),
}).refine(data => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem.',
  path: ['confirmPassword'],
});

type RegisterFormValues = z.infer<typeof formSchema>;

export default function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      email: '',
      oabNumber: '',
      oabUf: '',
      phone: '',
      password: '',
      confirmPassword: '',
      terms: false,
    },
  });

  async function onSubmit(values: RegisterFormValues) {
    setError(null);
    setSuccess(null);
    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          nome_completo: values.fullName,
          oab_numero: values.oabNumber,
          oab_uf: values.oabUf,
          telefone: values.phone,
        },
      },
    });

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess('Cadastro realizado com sucesso! Verifique seu email para confirmar a conta.');
    form.reset();
    // Optionally, redirect or switch to login view
    // router.push('/login');
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-text-primary">Criar Conta</h2>
        <p className="text-text-secondary">Preencha os campos para se cadastrar.</p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
          <p>{success}</p>
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Nome Completo</Label>
          <Input id="fullName" {...form.register('fullName')} />
          {form.formState.errors.fullName && <p className="text-sm text-red-500">{form.formState.errors.fullName.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" placeholder="seu@email.com" {...form.register('email')} />
          {form.formState.errors.email && <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>}
        </div>

        <div className="flex space-x-4">
            <div className="w-2/3 space-y-2">
                <Label htmlFor="oabNumber">Número OAB</Label>
                <Input id="oabNumber" {...form.register('oabNumber')} />
                {form.formState.errors.oabNumber && <p className="text-sm text-red-500">{form.formState.errors.oabNumber.message}</p>}
            </div>
            <div className="w-1/3 space-y-2">
                <Label htmlFor="oabUf">UF</Label>
                <Input id="oabUf" maxLength={2} {...form.register('oabUf')} />
                {form.formState.errors.oabUf && <p className="text-sm text-red-500">{form.formState.errors.oabUf.message}</p>}
            </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Telefone</Label>
          <Input id="phone" {...form.register('phone')} />
          {form.formState.errors.phone && <p className="text-sm text-red-500">{form.formState.errors.phone.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" type="password" {...form.register('password')} />
          {form.formState.errors.password && <p className="text-sm text-red-500">{form.formState.errors.password.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmar Senha</Label>
          <Input id="confirmPassword" type="password" {...form.register('confirmPassword')} />
          {form.formState.errors.confirmPassword && <p className="text-sm text-red-500">{form.formState.errors.confirmPassword.message}</p>}
        </div>
      </div>

      <div className="flex items-start space-x-2">
        <Checkbox id="terms" {...form.register('terms')} />
        <div className="grid gap-1.5 leading-none">
          <label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Eu aceito os <a href="#" className="text-primary-main hover:underline">termos de uso</a>.
          </label>
          {form.formState.errors.terms && <p className="text-sm text-red-500">{form.formState.errors.terms.message}</p>}
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Cadastrando...' : 'Cadastrar'}
      </Button>
    </form>
  );
}
