'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Eye, EyeOff, Brain, Shield, Zap, X, Mail, ArrowLeft } from 'lucide-react'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { AuthVisualSide } from '@/components/auth'

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
  // Forgot password states
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSuccess, setForgotSuccess] = useState(false)
  const [forgotError, setForgotError] = useState('')
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
      setError('As senhas nao coincidem')
      setLoading(false)
      return
    }

    if (!acceptTerms) {
      setError('Voce deve aceitar os termos de uso')
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotLoading(true)
    setForgotError('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error

      setForgotSuccess(true)
    } catch (err: any) {
      setForgotError(err.message || 'Erro ao enviar email de recuperacao')
    } finally {
      setForgotLoading(false)
    }
  }

  const closeForgotPassword = () => {
    setShowForgotPassword(false)
    setForgotEmail('')
    setForgotError('')
    setForgotSuccess(false)
  }

  const getPasswordStrength = (pwd: string) => {
    if (pwd.length === 0) return { strength: 0, label: '', color: '' }
    if (pwd.length < 6) return { strength: 1, label: 'Fraca', color: 'text-red-500' }
    if (pwd.length < 10) return { strength: 2, label: 'Media', color: 'text-amber-500' }
    if (pwd.length >= 10 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd))
      return { strength: 3, label: 'Forte', color: 'text-emerald-500' }
    return { strength: 2, label: 'Media', color: 'text-amber-500' }
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

  // Animation variants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" }
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full lg:w-1/2 flex flex-col min-h-screen bg-white"
      >
        {/* Mobile Header Visual */}
        <div className="lg:hidden relative h-48 overflow-hidden bg-gradient-to-br from-[#2c3e50] via-[#34495e] to-[#46627f]">
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 8, repeat: Infinity }}
          >
            <div className="w-40 h-40 rounded-full bg-[#89bcbe]/20 blur-3xl" />
          </motion.div>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <img
              src="/zyra.logo.png"
              alt="Zyra Legal"
              className="h-16 w-auto object-contain brightness-0 invert"
            />
          </div>
          {/* Mobile Feature Badges */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full">
              <Brain className="w-3 h-3 text-[#89bcbe]" />
              <span className="text-white/90 text-xs">IA</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full">
              <Shield className="w-3 h-3 text-[#89bcbe]" />
              <span className="text-white/90 text-xs">Seguro</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full">
              <Zap className="w-3 h-3 text-[#89bcbe]" />
              <span className="text-white/90 text-xs">Rapido</span>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 xl:px-24 py-8 lg:py-12">
          <div className="w-full max-w-md mx-auto">
            {/* Logo - Desktop only */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="hidden lg:block mb-8"
            >
              <img
                src="/zyra.logo.png"
                alt="Zyra Legal"
                className="h-16 w-auto object-contain block -ml-2"
              />
            </motion.div>

            {/* Header */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="mb-8"
            >
              <motion.h1
                variants={itemVariants}
                className="text-2xl font-semibold text-[#34495e] mb-1"
              >
                {mode === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}
              </motion.h1>
              <motion.p
                variants={itemVariants}
                className="text-[#46627f] text-sm"
              >
                {mode === 'login'
                  ? 'Entre para acessar o sistema'
                  : 'Comece sua jornada com IA juridica'}
              </motion.p>
            </motion.div>

            {/* Forms */}
            <AnimatePresence mode="wait">
              {mode === 'login' ? (
                <motion.form
                  key="login"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={handleLogin}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm font-medium text-[#34495e]">
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
                      className="h-12 bg-slate-50/50 border-slate-200 focus:border-[#89bcbe] focus:ring-[#89bcbe]/20 rounded-xl transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password" className="text-sm font-medium text-[#34495e]">
                        Senha
                      </Label>
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-xs font-medium text-[#89bcbe] hover:text-[#6ba9ab] transition-colors"
                      >
                        Esqueceu?
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Digite sua senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                        className="h-12 bg-slate-50/50 border-slate-200 focus:border-[#89bcbe] focus:ring-[#89bcbe]/20 rounded-xl transition-all pr-12"
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
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm"
                    >
                      {error}
                    </motion.div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-gradient-to-r from-[#34495e] to-[#46627f] hover:from-[#2c3e50] hover:to-[#3a5068] text-white font-semibold rounded-xl shadow-lg shadow-[#34495e]/20 hover:shadow-xl hover:shadow-[#34495e]/30 transition-all duration-300"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      'Entrar'
                    )}
                  </Button>

                  <p className="text-center text-sm text-slate-600 pt-4">
                    Ainda nao tem conta?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('register')}
                      className="text-[#89bcbe] hover:text-[#6ba9ab] font-semibold transition-colors"
                    >
                      Cadastre-se
                    </button>
                  </p>
                </motion.form>
              ) : (
                <motion.form
                  key="register"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={handleRegister}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="register-nome" className="text-sm font-medium text-[#34495e]">
                      Nome completo
                    </Label>
                    <Input
                      id="register-nome"
                      type="text"
                      placeholder="Joao da Silva"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      required
                      disabled={loading}
                      className="h-11 bg-slate-50/50 border-slate-200 focus:border-[#89bcbe] focus:ring-[#89bcbe]/20 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email" className="text-sm font-medium text-[#34495e]">
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
                      className="h-11 bg-slate-50/50 border-slate-200 focus:border-[#89bcbe] focus:ring-[#89bcbe]/20 rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="register-password" className="text-sm font-medium text-[#34495e]">
                        Senha
                      </Label>
                      <div className="relative">
                        <Input
                          id="register-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Min 6 caracteres"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          disabled={loading}
                          className="h-11 bg-slate-50/50 border-slate-200 focus:border-[#89bcbe] focus:ring-[#89bcbe]/20 rounded-xl pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-confirm" className="text-sm font-medium text-[#34495e]">
                        Confirmar
                      </Label>
                      <Input
                        id="register-confirm"
                        type="password"
                        placeholder="Repita a senha"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={loading}
                        className="h-11 bg-slate-50/50 border-slate-200 focus:border-[#89bcbe] focus:ring-[#89bcbe]/20 rounded-xl"
                      />
                    </div>
                  </div>

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

                  <div className="flex items-start space-x-2.5 pt-1">
                    <Checkbox
                      id="terms"
                      checked={acceptTerms}
                      onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                      disabled={loading}
                      className="mt-0.5 border-slate-300 data-[state=checked]:bg-[#89bcbe] data-[state=checked]:border-[#89bcbe]"
                    />
                    <Label htmlFor="terms" className="text-xs text-slate-600 leading-relaxed cursor-pointer">
                      Aceito os{' '}
                      <a href="#" className="text-[#89bcbe] hover:text-[#6ba9ab] font-medium underline">
                        termos de uso
                      </a>{' '}
                      e{' '}
                      <a href="#" className="text-[#89bcbe] hover:text-[#6ba9ab] font-medium underline">
                        politica de privacidade
                      </a>
                    </Label>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm"
                    >
                      {error}
                    </motion.div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 bg-gradient-to-r from-[#89bcbe] to-[#6ba9ab] hover:from-[#6ba9ab] hover:to-[#89bcbe] text-white font-semibold rounded-xl shadow-lg shadow-[#89bcbe]/25 hover:shadow-xl hover:shadow-[#89bcbe]/35 transition-all duration-300"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando conta...
                      </>
                    ) : (
                      'Criar conta gratis'
                    )}
                  </Button>

                  <p className="text-center text-sm text-slate-600 pt-2">
                    Ja possui uma conta?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      className="text-[#89bcbe] hover:text-[#6ba9ab] font-semibold transition-colors"
                    >
                      Entrar
                    </button>
                  </p>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 text-center">
          <p className="text-xs text-slate-400">
            2025 Zyra Legal. Todos os direitos reservados.
          </p>
        </div>
      </motion.div>

      {/* Right Side - Visual */}
      <AuthVisualSide />

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotPassword && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={closeForgotPassword}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="relative px-6 pt-6 pb-4">
                <button
                  onClick={closeForgotPassword}
                  className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>

                <div className="w-12 h-12 bg-[#89bcbe]/10 rounded-xl flex items-center justify-center mb-4">
                  <Mail className="w-6 h-6 text-[#89bcbe]" />
                </div>

                <h2 className="text-xl font-bold text-[#34495e]">
                  {forgotSuccess ? 'Email enviado!' : 'Recuperar senha'}
                </h2>
                <p className="text-sm text-[#46627f] mt-1">
                  {forgotSuccess
                    ? 'Verifique sua caixa de entrada'
                    : 'Digite seu email para receber o link de recuperacao'}
                </p>
              </div>

              {/* Modal Content */}
              <div className="px-6 pb-6">
                {forgotSuccess ? (
                  <div className="space-y-4">
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm">
                      Enviamos um link de recuperacao para <strong>{forgotEmail}</strong>.
                      Verifique tambem sua pasta de spam.
                    </div>
                    <Button
                      onClick={closeForgotPassword}
                      className="w-full h-11 bg-gradient-to-r from-[#34495e] to-[#46627f] hover:from-[#2c3e50] hover:to-[#3a5068] text-white font-semibold rounded-xl"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Voltar ao login
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email" className="text-sm font-medium text-[#34495e]">
                        E-mail
                      </Label>
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                        disabled={forgotLoading}
                        autoFocus
                        className="h-12 bg-slate-50/50 border-slate-200 focus:border-[#89bcbe] focus:ring-[#89bcbe]/20 rounded-xl transition-all"
                      />
                    </div>

                    {forgotError && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm"
                      >
                        {forgotError}
                      </motion.div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={closeForgotPassword}
                        disabled={forgotLoading}
                        className="flex-1 h-11 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={forgotLoading}
                        className="flex-1 h-11 bg-gradient-to-r from-[#89bcbe] to-[#6ba9ab] hover:from-[#6ba9ab] hover:to-[#89bcbe] text-white font-semibold rounded-xl"
                      >
                        {forgotLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          'Enviar link'
                        )}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
