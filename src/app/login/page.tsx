'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Capacitor } from '@capacitor/core'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Eye, EyeOff, Lock, ArrowRight, X, Mail, ArrowLeft, WifiOff, RefreshCw, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type AuthMode = 'login' | 'register'

function isNetworkError(err: any): boolean {
  const msg = (err?.message || '').toLowerCase()
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('err_name_not_resolved') ||
    msg.includes('load failed') ||
    msg.includes('network request failed') ||
    msg.includes('fetch failed') ||
    msg.includes('net::') ||
    err?.name === 'TypeError' && msg.includes('fetch')
  )
}

function getFriendlyErrorMessage(err: any): string {
  if (isNetworkError(err)) {
    return 'Nosso servidor está temporariamente indisponível. Isso geralmente se resolve em alguns minutos. Tente novamente.'
  }
  const msg = err?.message || ''
  if (msg.includes('Invalid login credentials')) {
    return 'E-mail ou senha incorretos. Verifique seus dados e tente novamente.'
  }
  if (msg.includes('Email not confirmed')) {
    return 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.'
  }
  if (msg.includes('User already registered')) {
    return 'Este e-mail já está cadastrado. Tente fazer login.'
  }
  if (msg.includes('Password should be at least')) {
    return 'A senha deve ter no mínimo 6 caracteres.'
  }
  if (msg.includes('rate limit') || msg.includes('too many requests')) {
    return 'Muitas tentativas. Aguarde alguns instantes antes de tentar novamente.'
  }
  return msg || 'Ocorreu um erro inesperado. Tente novamente.'
}

// ---- tokens visuais (design "Tecnológico"; claro = base, escuro = dark:) ----
const KICKER = 'font-mono text-[12px] tracking-[0.18em] uppercase text-[#6ba9ab]'
const SECURE = 'inline-flex items-center gap-[7px] font-mono text-[10.5px] tracking-[0.1em] uppercase text-[#a89f8c] dark:text-[#5d717c]'
const LABEL = 'font-mono text-[11px] tracking-[0.14em] uppercase text-[#9a9385] dark:text-[#5d717c]'
const FTITLE = 'text-[30px] font-semibold tracking-[-0.02em] text-[#2c3e50] dark:text-white m-0'
const FSUB = 'text-[14.5px] text-[#6c6f6a] dark:text-[#8ea3ad] mt-2 mb-8'
const SWAP = 'text-center text-[14px] text-[#6c6f6a] dark:text-[#8ea3ad] mt-[24px]'
const LNK = 'text-[#6ba9ab] dark:text-[#89bcbe] font-medium hover:text-[#89bcbe] dark:hover:text-[#aacfd0] transition-colors'
const FOOT = 'font-mono text-[10.5px] tracking-[0.1em] text-[#b3aa97] dark:text-[#5d717c] mt-auto pt-[22px]'
const INP = cn(
  'h-[52px] rounded-[11px] px-[17px] text-[15px] w-full transition-colors shadow-none',
  'bg-[#faf7f0] border-[#e4ded0] text-[#34495e] placeholder:text-[#aaa492]',
  'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[rgba(137,188,190,0.18)] focus-visible:border-[#6ba9ab]',
  'dark:bg-[rgba(255,255,255,0.04)] dark:border-[rgba(255,255,255,0.07)] dark:text-[#e7eef0] dark:placeholder:text-[#5d717c]',
  'dark:focus-visible:border-[#89bcbe] dark:focus-visible:ring-[rgba(137,188,190,0.16)]',
)
const BTN = cn(
  'h-[52px] w-full rounded-[11px] inline-flex items-center justify-center gap-2.5 text-[14.5px] font-semibold tracking-[0.02em] text-white transition-all',
  'bg-gradient-to-r from-[#34495e] to-[#3d566f] shadow-[0_14px_30px_-12px_rgba(44,62,80,0.45)] hover:brightness-[1.06]',
  'dark:from-[#46627f] dark:to-[#6ba9ab] dark:shadow-[0_14px_30px_-10px_rgba(137,188,190,0.4)]',
  'disabled:opacity-60 disabled:cursor-not-allowed',
)
const GRID_LIGHT: React.CSSProperties = {
  backgroundImage: 'linear-gradient(rgba(90,75,50,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(90,75,50,.05) 1px,transparent 1px)',
  backgroundSize: '54px 54px',
  WebkitMaskImage: 'radial-gradient(90% 90% at 70% 10%,#000 0%,transparent 80%)',
  maskImage: 'radial-gradient(90% 90% at 70% 10%,#000 0%,transparent 80%)',
}
const GRID_DARK: React.CSSProperties = {
  backgroundImage: 'linear-gradient(rgba(137,188,190,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(137,188,190,.05) 1px,transparent 1px)',
  backgroundSize: '54px 54px',
  WebkitMaskImage: 'radial-gradient(90% 90% at 70% 10%,#000 0%,transparent 80%)',
  maskImage: 'radial-gradient(90% 90% at 70% 10%,#000 0%,transparent 80%)',
}

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [nome, setNome] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [keepConnected, setKeepConnected] = useState(true)
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

  useEffect(() => {
    const savedEmail = localStorage.getItem('zyra_last_email')
    if (savedEmail) setEmail(savedEmail)
  }, [])

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

      if (keepConnected) localStorage.setItem('zyra_last_email', email)
      else localStorage.removeItem('zyra_last_email')

      // Ask browser to save credentials for password autofill (apenas no navegador/PWA;
      // no app nativo a API não existe e o gerenciador de senhas do sistema cuida disso)
      if (!Capacitor.isNativePlatform() && 'PasswordCredential' in window) {
        try {
          const cred = new (window as any).PasswordCredential({ id: email, password })
          await navigator.credentials.store(cred)
        } catch { /* browser may block, ignore */ }
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err))
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

      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotLoading(true)
    setForgotError('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail)

      if (error) throw error

      setForgotSuccess(true)
    } catch (err: any) {
      setForgotError(getFriendlyErrorMessage(err))
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
    if (pwd.length < 10) return { strength: 2, label: 'Média', color: 'text-amber-500' }
    if (pwd.length >= 10 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd))
      return { strength: 3, label: 'Forte', color: 'text-emerald-500' }
    return { strength: 2, label: 'Média', color: 'text-amber-500' }
  }

  const passwordStrength = mode === 'register' ? getPasswordStrength(password) : null

  const resetForm = () => {
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

  // ---------- bloco de erro (reutilizado nos dois layouts) ----------
  const errorBanner = () => error ? (
    <div
      className={cn(
        'mb-4 px-4 py-3 rounded-[10px] text-[13px]',
        error.includes('temporariamente indisponível')
          ? 'bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400'
          : 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400',
      )}
    >
      <div className="flex items-start gap-2.5">
        {error.includes('temporariamente indisponível') && <WifiOff className="w-4 h-4 mt-0.5 flex-shrink-0" />}
        <div className="flex-1">
          <p>{error}</p>
          {error.includes('temporariamente indisponível') && (
            <button type="submit" className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium underline hover:no-underline">
              <RefreshCw className="w-3 h-3" />Tentar novamente
            </button>
          )}
        </div>
      </div>
    </div>
  ) : null

  // ---------- corpo do LOGIN ----------
  const loginBody = (pfx: string) => (
    <form onSubmit={handleLogin} className="flex flex-col">
      <h2 className={FTITLE}>Bem-vindo de volta</h2>
      <p className={FSUB}>Entre para acessar o sistema.</p>

      <div className="flex flex-col gap-2 mb-[17px]">
        <label htmlFor={`${pfx}-email`} className={LABEL}>E-mail</label>
        <Input id={`${pfx}-email`} name="email" type="email" autoComplete="email" placeholder="você@escritorio.adv.br"
          value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} className={INP} />
      </div>

      <div className="flex flex-col gap-2 mb-1">
        <label htmlFor={`${pfx}-password`} className={LABEL}>Senha</label>
        <div className="relative">
          <Input id={`${pfx}-password`} name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password"
            placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading}
            className={cn(INP, 'pr-12')} />
          <button type="button" onClick={() => setShowPassword(!showPassword)}
            className="absolute right-[13px] top-1/2 -translate-y-1/2 text-[#a89f8c] dark:text-[#5d717c] hover:text-[#46627f] dark:hover:text-[#aacfd0] transition-colors">
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between my-[18px]">
        <label className="flex items-center gap-2 text-[12.5px] text-[#6c6f6a] dark:text-[#8ea3ad] cursor-pointer select-none">
          <Checkbox checked={keepConnected} onCheckedChange={(c) => setKeepConnected(c as boolean)}
            className="h-4 w-4 rounded-[4px] border-[#89bcbe] data-[state=checked]:bg-[#89bcbe] data-[state=checked]:border-[#89bcbe] data-[state=checked]:text-[#10181f]" />
          Manter conectado
        </label>
        <button type="button" onClick={() => setShowForgotPassword(true)} className={cn(LNK, 'text-[12.5px]')}>Esqueceu a senha?</button>
      </div>

      {errorBanner()}

      <button type="submit" disabled={loading} className={BTN}>
        {loading ? <><Loader2 className="w-5 h-5 animate-spin" />Entrando...</> : <>Entrar no sistema<ArrowRight className="w-4 h-4" /></>}
      </button>

      <p className={SWAP}>Ainda não tem conta? <button type="button" onClick={() => switchMode('register')} className={LNK}>Cadastre-se</button></p>
    </form>
  )

  // ---------- corpo do CADASTRO ----------
  const registerBody = (pfx: string) => (
    <form onSubmit={handleRegister} className="flex flex-col">
      <h2 className={FTITLE}>Crie sua conta</h2>
      <p className={FSUB}>Comece a operar seu escritório em minutos.</p>

      <div className="flex flex-col gap-2 mb-[15px]">
        <label htmlFor={`${pfx}-nome`} className={LABEL}>Nome completo</label>
        <Input id={`${pfx}-nome`} type="text" autoComplete="name" placeholder="João da Silva"
          value={nome} onChange={(e) => setNome(e.target.value)} required disabled={loading} className={INP} />
      </div>

      <div className="flex flex-col gap-2 mb-[15px]">
        <label htmlFor={`${pfx}-reg-email`} className={LABEL}>E-mail</label>
        <Input id={`${pfx}-reg-email`} type="email" autoComplete="email" placeholder="você@escritorio.adv.br"
          value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} className={INP} />
      </div>

      <div className="flex gap-4 mb-[15px]">
        <div className="flex flex-col gap-2 flex-1">
          <label htmlFor={`${pfx}-reg-pass`} className={LABEL}>Senha</label>
          <div className="relative">
            <Input id={`${pfx}-reg-pass`} type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Mín. 6"
              value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} className={cn(INP, 'pr-10')} />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-[11px] top-1/2 -translate-y-1/2 text-[#a89f8c] dark:text-[#5d717c] hover:text-[#46627f] dark:hover:text-[#aacfd0] transition-colors">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-2 flex-1">
          <label htmlFor={`${pfx}-reg-confirm`} className={LABEL}>Confirmar</label>
          <Input id={`${pfx}-reg-confirm`} type="password" autoComplete="new-password" placeholder="Repita"
            value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={loading} className={INP} />
        </div>
      </div>

      {passwordStrength && passwordStrength.strength > 0 && (
        <div className="space-y-1.5 mb-[15px]">
          <div className="flex gap-1.5">
            {[1, 2, 3].map((level) => (
              <div key={level} className={cn('h-1.5 flex-1 rounded-full transition-all duration-300',
                level <= passwordStrength.strength
                  ? level === 1 ? 'bg-red-500' : level === 2 ? 'bg-amber-500' : 'bg-emerald-500'
                  : 'bg-[#e4ded0] dark:bg-[rgba(255,255,255,0.08)]')} />
            ))}
          </div>
          <p className={cn('text-[11px] font-medium', passwordStrength.color)}>Senha {passwordStrength.label}</p>
        </div>
      )}

      <label className="flex items-start gap-2.5 text-[12.5px] text-[#6c6f6a] dark:text-[#8ea3ad] cursor-pointer mb-[18px] leading-relaxed">
        <Checkbox checked={acceptTerms} onCheckedChange={(c) => setAcceptTerms(c as boolean)} disabled={loading}
          className="mt-0.5 h-4 w-4 rounded-[4px] border-[#d6cfbf] dark:border-[rgba(255,255,255,0.12)] data-[state=checked]:bg-[#89bcbe] data-[state=checked]:border-[#89bcbe] data-[state=checked]:text-[#10181f]" />
        <span>Aceito os <a href="#" className={LNK}>termos</a> e <a href="#" className={LNK}>privacidade</a></span>
      </label>

      {errorBanner()}

      <button type="submit" disabled={loading} className={BTN}>
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Criando conta...</> : <>Criar conta grátis<ArrowRight className="w-4 h-4" /></>}
      </button>

      <p className={SWAP}>Já possui uma conta? <button type="button" onClick={() => switchMode('login')} className={LNK}>Entrar</button></p>
    </form>
  )

  // ---------- painel da marca (desliza) ----------
  const brandPanel = (
    <div
      className={cn(
        'absolute top-0 left-1/2 w-1/2 h-full z-[5] px-14 xl:px-20 py-16 flex flex-col overflow-hidden',
        'bg-[linear-gradient(165deg,#2c3e50_0%,#34495e_52%,#46627f_100%)] dark:bg-[linear-gradient(165deg,#2c3e50_0%,#26343f_55%,#1d2935_100%)]',
        'border-l border-[rgba(255,255,255,0.07)] shadow-[-24px_0_70px_-30px_rgba(44,62,80,0.3)] transition-transform duration-700 ease-[cubic-bezier(.76,0,.24,1)]',
        mode === 'register' ? '-translate-x-full' : 'translate-x-0',
      )}
    >
      <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ ...GRID_DARK, WebkitMaskImage: 'radial-gradient(80% 70% at 30% 80%,#000,transparent 75%)', maskImage: 'radial-gradient(80% 70% at 30% 80%,#000,transparent 75%)', backgroundImage: 'linear-gradient(rgba(137,188,190,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(137,188,190,.06) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className={cn('relative z-[2] flex', mode === 'register' ? 'justify-start' : 'justify-end')}>
        <img src="/zyra.logo.png" alt="Zyra Legal" className="h-[74px] w-auto object-contain brightness-0 invert drop-shadow-[0_0_22px_rgba(137,188,190,0.28)]" />
      </div>

      <div className="relative z-[2] flex-1 flex flex-col justify-center">
        {mode === 'register' ? (
          <>
            <span className="inline-flex items-center gap-[12px] font-mono text-[12px] tracking-[0.2em] uppercase text-[#89bcbe] mb-[28px] before:content-[''] before:w-[34px] before:h-px before:bg-[#89bcbe]">Comece em minutos</span>
            <h1 className="text-[42px] xl:text-[46px] font-semibold leading-[1.14] tracking-[-0.02em] text-white m-0">
              <span className="font-normal text-[#6f868f]">Seu escritório,</span><br /><span className="text-[#eef4f5]">em</span> <span className="text-[#89bcbe]">ordem.</span>
            </h1>
            <p className="text-[15.5px] leading-[1.6] text-[#8ea3ad] mt-[20px] max-w-[360px]">Tudo o que seu escritório precisa, em um só lugar. Sem instalação, sem complicação.</p>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-[12px] font-mono text-[12px] tracking-[0.2em] uppercase text-[#89bcbe] mb-[28px] before:content-[''] before:w-[34px] before:h-px before:bg-[#89bcbe]">Plataforma jurídica</span>
            <h1 className="text-[42px] xl:text-[46px] font-semibold leading-[1.14] tracking-[-0.02em] text-white m-0">
              <span className="font-normal text-[#6f868f]">Tudo o que</span><br /><span className="text-[#eef4f5]">seu escritório</span><br /><span className="text-[#eef4f5]">precisa,</span> <span className="text-[#89bcbe]">conectado.</span>
            </h1>
            <div className="flex gap-2.5 flex-wrap mt-[38px]">
              {['Processos', 'Clientes', 'Agenda', 'Financeiro'].map((c) => (
                <span key={c} className="font-mono text-[12.5px] tracking-[0.04em] text-[#8ea3ad] border border-[rgba(137,188,190,0.14)] bg-[rgba(137,188,190,0.05)] rounded-md px-[14px] py-[7px]">{c}</span>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="relative z-[2] font-mono text-[10px] tracking-[0.1em] text-[#5d717c] mt-auto">SEU ESCRITÓRIO, EM ORDEM</div>
    </div>
  )

  const formHead = (kicker: string) => (
    <div className="flex items-baseline justify-between mb-[26px]">
      <span className={KICKER}>{kicker}</span>
      <span className={SECURE}><Lock className="w-[11px] h-[11px]" />conexão segura</span>
    </div>
  )

  return (
    <div className="fixed inset-0 overflow-hidden bg-[radial-gradient(120%_120%_at_80%_-10%,#efeae0_0%,#f3efe6_42%,#f5f2eb_100%)] dark:bg-[radial-gradient(120%_120%_at_80%_-10%,#2c3e50_0%,#22303c_42%,#16202a_100%)]">
      {/* grid + glows decorativos */}
      <div aria-hidden className="absolute inset-0 pointer-events-none dark:hidden" style={GRID_LIGHT} />
      <div aria-hidden className="absolute inset-0 pointer-events-none hidden dark:block" style={GRID_DARK} />
      <div aria-hidden className="pointer-events-none absolute w-[520px] h-[520px] rounded-full blur-[90px] right-[-80px] top-[-120px] bg-[rgba(137,188,190,0.20)]" />
      <div aria-hidden className="pointer-events-none absolute w-[420px] h-[420px] rounded-full blur-[90px] left-[-100px] bottom-[-140px] bg-[rgba(194,149,107,0.16)] dark:bg-[rgba(70,98,127,0.30)]" />

      {/* ===== DESKTOP/TABLET: split em tela cheia com painel deslizante (md+) ===== */}
      <div className="hidden md:block absolute inset-0 z-10">
        {/* LOGIN (esquerda) */}
        <div inert={mode !== 'login' || undefined} className="absolute top-0 left-0 h-full w-1/2 flex flex-col px-8 py-12 overflow-y-auto">
          <div className="w-full max-w-[480px] mx-auto flex flex-col flex-1">
            {formHead('Acesso seguro')}
            <div className="flex-1 flex flex-col justify-center">{loginBody('d-login')}</div>
            <div className={FOOT}>© 2025 ZYRA LEGAL</div>
          </div>
        </div>

        {/* CADASTRO (direita) */}
        <div inert={mode !== 'register' || undefined} className="absolute top-0 right-0 h-full w-1/2 flex flex-col px-8 py-12 overflow-y-auto">
          <div className="w-full max-w-[480px] mx-auto flex flex-col flex-1">
            {formHead('Nova conta')}
            <div className="flex-1 flex flex-col justify-center">{registerBody('d-reg')}</div>
            <div className={cn(FOOT, 'text-right')}>© 2025 ZYRA LEGAL</div>
          </div>
        </div>

        {/* MARCA deslizante (metade da tela, full-height) */}
        {brandPanel}
      </div>

      {/* ===== CELULAR: tela cheia (provisório — modelo dedicado virá depois) ===== */}
      <div className="md:hidden absolute inset-0 z-10 flex flex-col overflow-y-auto">
        <div className="shrink-0 bg-[linear-gradient(165deg,#2c3e50_0%,#34495e_52%,#46627f_100%)] px-6 pt-10 pb-8 flex flex-col items-center text-center">
          <img src="/zyra.logo.png" alt="Zyra Legal" className="h-[44px] w-auto object-contain brightness-0 invert drop-shadow-[0_0_18px_rgba(137,188,190,0.28)]" />
          <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-[#89bcbe] mt-3">Seu escritório, em ordem</p>
        </div>
        <div className="flex-1 px-6 py-8 flex flex-col">
          <div className="w-full max-w-[420px] mx-auto flex flex-col flex-1 justify-center">
            {formHead(mode === 'login' ? 'Acesso seguro' : 'Nova conta')}
            {mode === 'login' ? loginBody('m-login') : registerBody('m-reg')}
          </div>
        </div>
      </div>

      {/* Modal: Esqueci a senha */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={closeForgotPassword}>
          <div className="w-full max-w-md rounded-[16px] overflow-hidden bg-[#f5f2eb] dark:bg-[#1a2530] border border-[#e4ded0] dark:border-[rgba(255,255,255,0.08)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="relative px-6 pt-6 pb-4">
              <button onClick={closeForgotPassword} className="absolute right-4 top-4 p-2 text-[#a89f8c] dark:text-[#5d717c] hover:text-[#46627f] dark:hover:text-[#aacfd0] rounded-full transition-colors">
                <X size={20} />
              </button>
              <div className="w-12 h-12 bg-[#89bcbe]/15 rounded-xl flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-[#6ba9ab] dark:text-[#89bcbe]" />
              </div>
              <h2 className="text-xl font-semibold text-[#2c3e50] dark:text-white">{forgotSuccess ? 'E-mail enviado!' : 'Recuperar senha'}</h2>
              <p className="text-sm text-[#6c6f6a] dark:text-[#8ea3ad] mt-1">{forgotSuccess ? 'Verifique sua caixa de entrada.' : 'Digite seu e-mail para receber o link de recuperação.'}</p>
            </div>
            <div className="px-6 pb-6">
              {forgotSuccess ? (
                <div className="space-y-4">
                  <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 px-4 py-3 rounded-xl text-sm">
                    Enviamos um link de recuperação para <strong>{forgotEmail}</strong>. Verifique também o spam.
                  </div>
                  <button onClick={closeForgotPassword} className={BTN}><ArrowLeft className="w-4 h-4" />Voltar ao login</button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="forgot-email" className={LABEL}>E-mail</label>
                    <Input id="forgot-email" type="email" placeholder="você@escritorio.adv.br" value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)} required disabled={forgotLoading} autoFocus className={INP} />
                  </div>
                  {forgotError && (
                    <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">{forgotError}</div>
                  )}
                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={closeForgotPassword} disabled={forgotLoading}
                      className="flex-1 h-[47px] rounded-[10px] border border-[#e4ded0] dark:border-[rgba(255,255,255,0.1)] text-[#6c6f6a] dark:text-[#8ea3ad] text-[13.5px] font-semibold hover:bg-[#faf7f0] dark:hover:bg-[rgba(255,255,255,0.04)] transition-colors disabled:opacity-60">
                      Cancelar
                    </button>
                    <button type="submit" disabled={forgotLoading} className={BTN}>
                      {forgotLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Enviando...</> : <>Enviar link<Check className="w-4 h-4" /></>}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
