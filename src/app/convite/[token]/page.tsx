'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { aceitarConvite } from '@/lib/supabase/escritorio-helpers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Eye, EyeOff } from 'lucide-react'

interface ConviteInfo {
  id: string
  email: string
  expira_em: string
  escritorio_id: string
  escritorio_nome: string
  cargo_nome: string
  cargo_cor: string
}

type FormMode = 'register' | 'login'

export default function ConvitePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  const supabase = createClient()

  // States
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [convite, setConvite] = useState<ConviteInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formMode, setFormMode] = useState<FormMode>('register')

  // Form fields
  const [nome, setNome] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    loadConvite()
  }, [token])

  async function loadConvite() {
    setLoading(true)
    setError(null)

    try {
      // Load invite with cargo details
      const { data: conviteData, error: conviteError } = await supabase
        .from('escritorios_convites')
        .select(`
          id,
          email,
          expira_em,
          aceito,
          escritorio_id,
          cargo:cargo_id (
            nome_display,
            cor
          )
        `)
        .eq('token', token)
        .single()

      if (conviteError || !conviteData) {
        setError('Convite não encontrado. Verifique se o link está correto.')
        return
      }

      if (conviteData.aceito) {
        setError('Este convite já foi utilizado.')
        return
      }

      if (new Date(conviteData.expira_em) < new Date()) {
        setError('Este convite expirou. Solicite um novo ao administrador.')
        return
      }

      // Get escritorio name
      let escritorioNome = 'Escritório'
      const { data: escritorioData } = await supabase
        .from('escritorios')
        .select('nome')
        .eq('id', conviteData.escritorio_id)
        .single()

      if (escritorioData?.nome) {
        escritorioNome = escritorioData.nome
      }

      const cargoData = conviteData.cargo as any
      setConvite({
        id: conviteData.id,
        email: conviteData.email,
        expira_em: conviteData.expira_em,
        escritorio_id: conviteData.escritorio_id,
        escritorio_nome: escritorioNome,
        cargo_nome: cargoData?.nome_display || 'Membro',
        cargo_cor: cargoData?.cor || '#64748b'
      })
    } catch (err) {
      console.error('Erro ao carregar convite:', err)
      setError('Erro ao carregar convite.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!convite) return

    setSubmitting(true)
    setError(null)

    try {
      // Try to create account
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: convite.email,
        password,
        options: {
          data: { nome_completo: nome }
        }
      })

      // Check if user already exists
      if (signUpError?.message?.toLowerCase().includes('already registered') ||
          signUpError?.message?.toLowerCase().includes('already exists')) {
        setError('Este email já possui uma conta. Faça login abaixo.')
        setFormMode('login')
        setSubmitting(false)
        return
      }

      if (signUpError) {
        throw signUpError
      }

      // Wait a moment for profile trigger to create profile
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Accept invite (links to office)
      await aceitarConvite(token)

      setSuccess(true)
      setTimeout(() => router.push('/dashboard'), 1500)
    } catch (err: any) {
      console.error('Erro no cadastro:', err)
      setError(err.message || 'Erro ao criar conta. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!convite) return

    setSubmitting(true)
    setError(null)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: convite.email,
        password,
      })

      if (signInError) throw signInError

      // Accept invite (links to office)
      await aceitarConvite(token)

      setSuccess(true)
      setTimeout(() => router.push('/dashboard'), 1500)
    } catch (err: any) {
      console.error('Erro no login:', err)
      setError(err.message || 'Erro ao fazer login. Verifique sua senha.')
    } finally {
      setSubmitting(false)
    }
  }

  function formatExpiryDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[#89bcbe] animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Carregando convite...</p>
        </div>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-[#34495e] mb-2">
            Bem-vindo ao {convite?.escritorio_nome}!
          </h1>
          <p className="text-slate-500 text-sm">Redirecionando...</p>
        </div>
      </div>
    )
  }

  // Error state (invalid/expired invite)
  if (error && !convite) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-[#34495e] mb-2">Convite inválido</h1>
          <p className="text-slate-500 text-sm mb-6">{error}</p>
          <Button
            variant="outline"
            onClick={() => router.push('/login')}
            className="border-slate-300"
          >
            Ir para o login
          </Button>
        </div>
      </div>
    )
  }

  // Main form
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="/zyra.logo.png"
            alt="Zyra Legal"
            className="h-12 w-auto mx-auto"
          />
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 text-center border-b border-slate-100">
            <p className="text-slate-500 text-sm mb-1">Você foi convidado para</p>
            <h1 className="text-xl font-semibold text-[#34495e] mb-3">
              {convite?.escritorio_nome}
            </h1>
            <span
              className="inline-block px-3 py-1 rounded-full text-sm font-medium text-white"
              style={{ backgroundColor: convite?.cargo_cor }}
            >
              {convite?.cargo_nome}
            </span>
          </div>

          {/* Form */}
          <div className="p-6">
            {formMode === 'register' ? (
              <form onSubmit={handleRegister} className="space-y-4">
                {/* Email (readonly) */}
                <div className="space-y-1.5">
                  <Label className="text-sm text-slate-600">Email</Label>
                  <Input
                    type="email"
                    value={convite?.email || ''}
                    disabled
                    className="h-11 bg-slate-50 text-slate-600"
                  />
                </div>

                {/* Nome */}
                <div className="space-y-1.5">
                  <Label className="text-sm text-slate-600">Nome completo</Label>
                  <Input
                    type="text"
                    placeholder="Seu nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                    disabled={submitting}
                    className="h-11"
                  />
                </div>

                {/* Senha */}
                <div className="space-y-1.5">
                  <Label className="text-sm text-slate-600">Criar senha</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      disabled={submitting}
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                    {error}
                  </p>
                )}

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 bg-[#34495e] hover:bg-[#2c3e50] text-white font-medium"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    'Criar conta e entrar'
                  )}
                </Button>

                {/* Switch to login */}
                <p className="text-center text-sm text-slate-500">
                  Já tem conta?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setFormMode('login')
                      setError(null)
                      setPassword('')
                    }}
                    className="text-[#89bcbe] hover:text-[#6ba9ab] font-medium"
                  >
                    Fazer login
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Email (readonly) */}
                <div className="space-y-1.5">
                  <Label className="text-sm text-slate-600">Email</Label>
                  <Input
                    type="email"
                    value={convite?.email || ''}
                    disabled
                    className="h-11 bg-slate-50 text-slate-600"
                  />
                </div>

                {/* Senha */}
                <div className="space-y-1.5">
                  <Label className="text-sm text-slate-600">Senha</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Sua senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={submitting}
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                    {error}
                  </p>
                )}

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 bg-[#34495e] hover:bg-[#2c3e50] text-white font-medium"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    'Entrar e aceitar convite'
                  )}
                </Button>

                {/* Switch to register */}
                <p className="text-center text-sm text-slate-500">
                  Não tem conta?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setFormMode('register')
                      setError(null)
                      setPassword('')
                    }}
                    className="text-[#89bcbe] hover:text-[#6ba9ab] font-medium"
                  >
                    Criar conta
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-4">
          Convite válido até {formatExpiryDate(convite?.expira_em || '')}
        </p>
      </div>
    </div>
  )
}
