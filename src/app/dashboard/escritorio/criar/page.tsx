'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { criarEscritorio } from '@/lib/supabase/escritorio-helpers';
import { toast } from 'sonner';
import Link from 'next/link';

export default function CriarEscritorioPage() {
  const [nome, setNome] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      toast.error('Por favor, informe o nome do escritório');
      return;
    }

    try {
      setLoading(true);

      const escritorio = await criarEscritorio({
        nome: nome.trim(),
        cnpj: cnpj.trim() || undefined,
      });

      if (escritorio) {
        toast.success('Escritório criado com sucesso!');
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Erro ao criar escritório:', error);
      toast.error('Erro ao criar escritório. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Dashboard
            </Button>
          </Link>

          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-[#34495e] to-[#1E3A8A] rounded-xl">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Criar Escritório</h1>
              <p className="text-slate-600 mt-1">
                Configure seu novo escritório e comece a gerenciar seus processos
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Informações do Escritório</CardTitle>
            <CardDescription>
              Preencha os dados básicos do seu escritório. Você poderá adicionar mais informações depois.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="nome">
                  Nome do Escritório <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Advocacia Silva & Santos"
                  required
                  disabled={loading}
                />
                <p className="text-sm text-slate-500">
                  Este será o nome exibido em todo o sistema
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ (opcional)</Label>
                <Input
                  id="cnpj"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  disabled={loading}
                />
                <p className="text-sm text-slate-500">
                  CNPJ do escritório para documentação fiscal
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-[#34495e] to-[#1E3A8A] hover:opacity-90"
                >
                  {loading ? 'Criando...' : 'Criar Escritório'}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={loading}
                >
                  Cancelar
                </Button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                <h4 className="font-semibold text-sm text-blue-900 mb-2">
                  📋 O que acontece quando você cria um escritório?
                </h4>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Você será definido como proprietário (owner)</li>
                  <li>O escritório será automaticamente ativado</li>
                  <li>Você poderá convidar outros usuários</li>
                  <li>Plano inicial: Free (máx. 5 usuários)</li>
                </ul>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
