'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Eye, EyeOff } from 'lucide-react'

type AuthMode = 'login' | 'register'

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [nome, setNome] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
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

      // Check if there's a pending invite to process
      const pendingInviteToken = sessionStorage.getItem('pendingInviteToken')
      if (pendingInviteToken) {
        sessionStorage.removeItem('pendingInviteToken')
        router.push(`/convite/${pendingInviteToken}`)
        router.refresh()
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError('As senhas não coincidem')
      setLoading(false)
      return
    }

    if (!acceptTerms) {
      setError('Você deve aceitar os termos de uso')
      setLoading(false)
      return
    }

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nome_completo: nome,
          },
        },
      })

      if (signUpError) throw signUpError

      // Check if there's a pending invite to process
      const pendingInviteToken = sessionStorage.getItem('pendingInviteToken')
      if (pendingInviteToken) {
        sessionStorage.removeItem('pendingInviteToken')
        router.push(`/convite/${pendingInviteToken}`)
        router.refresh()
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  const getPasswordStrength = (pwd: string) => {
    if (pwd.length === 0) return { strength: 0, label: '', color: '' }
    if (pwd.length < 6) return { strength: 1, label: 'Fraca', color: 'text-red-500' }
    if (pwd.length < 10) return { strength: 2, label: 'Média', color: 'text-amber-500' }
    if (pwd.length >= 10 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd))
      return { strength: 3, label: 'Forte', color: 'text-emerald-500' }
    return { strength: 2, label: 'Média', color: 'text-amber-500' }
  }

  const passwordStrength = mode === 'register' ? getPasswordStrength(password) : null

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setNome('')
    setAcceptTerms(false)
    setError('')
    setShowPassword(false)
  }

  const switchMode = (newMode: AuthMode) => {
    resetForm()
    setMode(newMode)
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-white via-slate-50/30 to-[#f0f9f9]/40">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large gradient orbs */}
        <div className="absolute top-20 -left-20 w-96 h-96 bg-gradient-to-br from-[#89bcbe]/20 to-[#aacfd0]/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute -top-32 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-[#34495e]/10 to-[#46627f]/5 rounded-full blur-3xl animate-float-delayed"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-[#89bcbe]/15 to-transparent rounded-full blur-3xl animate-pulse-slow"></div>

        {/* Geometric shapes */}
        <div className="absolute top-1/4 right-1/3 w-32 h-32 border-2 border-[#89bcbe]/15 rounded-full animate-spin-slow"></div>
        <div className="absolute bottom-1/3 left-1/4 w-24 h-24 border-2 border-[#34495e]/5 rotate-45 animate-pulse-slow"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
        {/* Logo - Always visible, centered top */}
        <div className="mb-6 lg:mb-8 animate-fade-in">
          <img
            src="/zyra.logo.png"
            alt="Zyra Legal"
            className="h-16 sm:h-20 lg:h-24 w-auto object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-300"
          />
        </div>

        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Visual Elements & Benefits */}
          <div className="hidden lg:flex flex-col space-y-7 animate-slide-in-left">
            {/* Main Headline - Com destaque */}
            <div className="space-y-3">
              <h1 className="text-5xl xl:text-6xl font-bold leading-tight">
                <span className="block text-[#34495e]">Gestão jurídica</span>
                <span className="block mt-1 bg-gradient-to-r from-[#89bcbe] via-[#6ba9ab] to-[#89bcbe] bg-clip-text text-transparent animate-gradient-x drop-shadow-[0_2px_8px_rgba(137,188,190,0.3)]" style={{
                  filter: 'drop-shadow(0 4px 12px rgba(137, 188, 190, 0.25))'
                }}>
                  impulsionada por IA
                </span>
              </h1>
            </div>

            {/* Feature Icons - Módulos Principais */}
            <div className="space-y-4">
              {/* Feature 1 - Gestão de Processos */}
              <div className="flex items-start space-x-3 group">
                <div className="flex-shrink-0 w-11 h-11 bg-gradient-to-br from-[#89bcbe] to-[#aacfd0] rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-[#34495e] mb-0.5">Processos & Consultivo</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">Controle total do contencioso e consultoria jurídica integrados</p>
                </div>
              </div>

              {/* Feature 2 - Financeiro */}
              <div className="flex items-start space-x-3 group">
                <div className="flex-shrink-0 w-11 h-11 bg-gradient-to-br from-[#34495e] to-[#46627f] rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-[#34495e] mb-0.5">Gestão Financeira Completa</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">Honorários, timesheet e fluxo de caixa em tempo real</p>
                </div>
              </div>

              {/* Feature 3 - IA & Agentes */}
              <div className="flex items-start space-x-3 group">
                <div className="flex-shrink-0 w-11 h-11 bg-gradient-to-br from-[#6ba9ab] to-[#89bcbe] rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-[#34495e] mb-0.5">Agentes de IA Autônomos</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">Análise contínua e recomendações inteligentes de gestão</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Auth Card */}
          <div className="w-full max-w-md mx-auto lg:max-w-none animate-slide-in-right">
            <div className="relative group">
              {/* Subtle glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-[#89bcbe]/20 via-[#34495e]/20 to-[#89bcbe]/20 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition duration-300"></div>

              {/* Main Card */}
              <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200/50 overflow-hidden">
                {/* Toggle Tabs */}
                <div className="relative flex border-b border-slate-200">
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className={`flex-1 relative py-4 px-6 text-base font-semibold transition-all duration-200 ${
                      mode === 'login'
                        ? 'text-[#34495e]'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Entrar
                    {mode === 'login' && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#89bcbe] to-transparent rounded-full" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode('register')}
                    className={`flex-1 relative py-4 px-6 text-base font-semibold transition-all duration-200 ${
                      mode === 'register'
                        ? 'text-[#34495e]'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Cadastrar
                    {mode === 'register' && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#89bcbe] to-transparent rounded-full" />
                    )}
                  </button>
                </div>

                <div className="p-8">
                  {/* Header */}
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-[#34495e] mb-2">
                      {mode === 'login' ? 'Bem-vindo de volta!' : 'Criar sua conta'}
                    </h2>
                    <p className="text-slate-600 text-sm">
                      {mode === 'login'
                        ? 'Entre para acessar sua dashboard'
                        : 'Comece gratuitamente, sem cartão de crédito'}
                    </p>
                  </div>

                  {/* Login Form */}
                  {mode === 'login' && (
                    <form onSubmit={handleLogin} className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="login-email" className="text-sm font-medium text-slate-700">
                          E-mail
                        </Label>
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="seu@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          disabled={loading}
                          className="h-12 border-slate-300 focus:border-[#89bcbe] focus:ring-[#89bcbe]/20 transition-all"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="login-password" className="text-sm font-medium text-slate-700">
                            Senha
                          </Label>
                          <a href="#" className="text-xs font-medium text-[#89bcbe] hover:text-[#6ba9ab] transition-colors">
                            Esqueceu?
                          </a>
                        </div>
                        <div className="relative">
                          <Input
                            id="login-password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loading}
                            className="h-12 border-slate-300 focus:border-[#89bcbe] focus:ring-[#89bcbe]/20 transition-all pr-12"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                        </div>
                      </div>

                      {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start space-x-2">
                          <span className="text-red-500">⚠️</span>
                          <span>{error}</span>
                        </div>
                      )}

                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 bg-gradient-to-r from-[#34495e] to-[#46627f] hover:from-[#2c3e50] hover:to-[#34495e] text-white font-semibold shadow-lg shadow-[#34495e]/20 hover:shadow-xl hover:shadow-[#34495e]/30 transition-all duration-300"
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
                  )}

                  {/* Register Form - Simplified */}
                  {mode === 'register' && (
                    <form onSubmit={handleRegister} className="space-y-4">
                      {/* Nome completo */}
                      <div className="space-y-2">
                        <Label htmlFor="register-nome" className="text-sm font-medium text-slate-700">
                          Nome completo
                        </Label>
                        <Input
                          id="register-nome"
                          type="text"
                          placeholder="João da Silva"
                          value={nome}
                          onChange={(e) => setNome(e.target.value)}
                          required
                          disabled={loading}
                          className="h-11 border-slate-300 focus:border-[#89bcbe] focus:ring-[#89bcbe]/20"
                        />
                      </div>

                      {/* Email */}
                      <div className="space-y-2">
                        <Label htmlFor="register-email" className="text-sm font-medium text-slate-700">
                          E-mail
                        </Label>
                        <Input
                          id="register-email"
                          type="email"
                          placeholder="seu@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          disabled={loading}
                          className="h-11 border-slate-300 focus:border-[#89bcbe] focus:ring-[#89bcbe]/20"
                        />
                      </div>

                      {/* Senha e Confirmar em 2 colunas */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="register-password" className="text-sm font-medium text-slate-700">
                            Senha
                          </Label>
                          <div className="relative">
                            <Input
                              id="register-password"
                              type={showPassword ? 'text' : 'password'}
                              placeholder="••••••"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              required
                              disabled={loading}
                              className="h-11 border-slate-300 focus:border-[#89bcbe] focus:ring-[#89bcbe]/20 pr-10"
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

                        <div className="space-y-2">
                          <Label htmlFor="register-confirm" className="text-sm font-medium text-slate-700">
                            Confirmar
                          </Label>
                          <Input
                            id="register-confirm"
                            type="password"
                            placeholder="••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            disabled={loading}
                            className="h-11 border-slate-300 focus:border-[#89bcbe] focus:ring-[#89bcbe]/20"
                          />
                        </div>
                      </div>

                      {/* Password strength indicator */}
                      {passwordStrength && passwordStrength.strength > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex gap-1.5">
                            {[1, 2, 3].map((level) => (
                              <div
                                key={level}
                                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                                  level <= passwordStrength.strength
                                    ? level === 1
                                      ? 'bg-red-500'
                                      : level === 2
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500'
                                    : 'bg-slate-200'
                                }`}
                              />
                            ))}
                          </div>
                          <p className={`text-xs font-medium ${passwordStrength.color}`}>
                            Senha {passwordStrength.label}
                          </p>
                        </div>
                      )}

                      {/* Terms */}
                      <div className="flex items-start space-x-2 pt-1">
                        <Checkbox
                          id="terms"
                          checked={acceptTerms}
                          onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                          disabled={loading}
                          className="mt-1 border-slate-300 data-[state=checked]:bg-[#89bcbe] data-[state=checked]:border-[#89bcbe]"
                        />
                        <Label htmlFor="terms" className="text-xs text-slate-600 leading-relaxed cursor-pointer">
                          Aceito os{' '}
                          <a href="#" className="text-[#89bcbe] hover:text-[#6ba9ab] font-medium underline">
                            termos de uso
                          </a>{' '}
                          e{' '}
                          <a href="#" className="text-[#89bcbe] hover:text-[#6ba9ab] font-medium underline">
                            política de privacidade
                          </a>
                        </Label>
                      </div>

                      {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start space-x-2">
                          <span className="text-red-500">⚠️</span>
                          <span>{error}</span>
                        </div>
                      )}

                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-11 bg-gradient-to-r from-[#89bcbe] to-[#6ba9ab] hover:from-[#6ba9ab] hover:to-[#89bcbe] text-white font-semibold shadow-lg shadow-[#89bcbe]/30 hover:shadow-xl hover:shadow-[#89bcbe]/40 transition-all duration-300"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Criando conta...
                          </>
                        ) : (
                          'Criar conta grátis'
                        )}
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-slate-500 mt-6">
              © 2025 Zyra Legal. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(30px, -30px) rotate(5deg); }
          66% { transform: translate(-20px, 20px) rotate(-5deg); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(-40px, 30px) rotate(-8deg); }
          66% { transform: translate(30px, -20px) rotate(8deg); }
        }
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.5; }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-in-left {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slide-in-right {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-float {
          animation: float 20s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 25s ease-in-out infinite;
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 4s ease infinite;
        }
        .animate-spin-slow {
          animation: spin-slow 30s linear infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        .animate-slide-in-left {
          animation: slide-in-left 0.6s ease-out;
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.6s ease-out;
        }
      `}</style>
    </div>
  )
}
