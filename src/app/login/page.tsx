'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError

      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-[#f0f9f9] to-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">

        {/* Coluna Esquerda - Branding */}
        <div className="hidden lg:flex flex-col justify-center space-y-8">
          <div className="space-y-6">
            <div className="inline-flex items-center bg-white/80 backdrop-blur-sm px-8 py-4 rounded-2xl shadow-lg border border-[#89bcbe]/20">
              <img
                src="/zyra.logo.png"
                alt="Zyra Legal"
                className="h-16 w-auto object-contain"
              />
            </div>

            <div className="space-y-4 px-2">
              <h2 className="text-4xl font-semibold text-[#34495e] leading-tight">
                Gestão jurídica completa,
                <span className="text-[#89bcbe]"> impulsionada por IA</span>
              </h2>
              <p className="text-lg text-[#6c757d] leading-relaxed font-normal">
                Automatize processos, acompanhe publicações, gerencie clientes e otimize seu escritório com inteligência artificial.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-[#89bcbe]/20">
                <div className="text-3xl font-semibold text-[#34495e] mb-1">100+</div>
                <div className="text-sm text-[#6c757d]">Processos gerenciados</div>
              </div>
              <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-[#89bcbe]/20">
                <div className="text-3xl font-semibold text-[#34495e] mb-1">24/7</div>
                <div className="text-sm text-[#6c757d]">Monitoramento IA</div>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna Direita - Form de Login */}
        <div className="w-full max-w-md mx-auto">
          <Card className="border-[#89bcbe]/20 shadow-2xl shadow-[#34495e]/10">
            <CardHeader className="space-y-3 pb-6">
              <div className="lg:hidden flex justify-center mb-4">
                <img
                  src="/zyra.logo.png"
                  alt="Zyra Legal"
                  className="h-12 w-auto object-contain"
                />
              </div>
              <CardTitle className="text-3xl font-semibold text-[#34495e]">Bem-vindo de volta</CardTitle>
              <CardDescription className="text-base text-[#6c757d]">
                Entre com suas credenciais para acessar o sistema
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-[#46627f]">
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12 border-slate-200 focus-visible:ring-[#34495e]"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium text-[#46627f]">
                      Senha
                    </Label>
                    <a href="#" className="text-sm font-medium text-[#89bcbe] hover:text-[#6ba9ab] transition-colors">
                      Esqueceu?
                    </a>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12 border-slate-200 focus-visible:ring-[#34495e]"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-[#34495e] to-[#46627f] hover:from-[#2c3e50] hover:to-[#34495e] text-white font-semibold shadow-lg transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    'Entrar no sistema'
                  )}
                </Button>
              </form>

              <div className="pt-6 border-t border-slate-200">
                <p className="text-center text-sm text-[#6c757d]">
                  Não tem uma conta?{' '}
                  <a href="/cadastro" className="font-medium text-[#89bcbe] hover:text-[#6ba9ab] transition-colors">
                    Criar conta
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-[#adb5bd] mt-6">
            © 2025 Zyra Legal. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  )
}
