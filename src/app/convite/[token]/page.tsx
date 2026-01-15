'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { aceitarConvite } from '@/lib/supabase/escritorio-helpers'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Loader2,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  UserPlus,
  AlertCircle
} from 'lucide-react'

interface ConviteInfo {
  id: string
  email: string
  role: string
  expira_em: string
  escritorio_nome: string
  convidado_por_nome: string
}

export default function ConvitePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [convite, setConvite] = useState<ConviteInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    checkAuthAndLoadConvite()
  }, [token])

  async function checkAuthAndLoadConvite() {
    setLoading(true)
    setError(null)

    try {
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)
      setUserEmail(user?.email || null)

      // Load invite details
      const { data: conviteData, error: conviteError } = await supabase
        .from('escritorios_convites')
        .select(`
          id,
          email,
          role,
          expira_em,
          aceito,
          escritorio:escritorio_id (
            nome
          ),
          convidador:convidado_por (
            nome_completo
          )
        `)
        .eq('token', token)
        .single()

      if (conviteError || !conviteData) {
        setError('Convite não encontrado. Verifique se o link está correto.')
        return
      }

      // Check if already accepted
      if (conviteData.aceito) {
        setError('Este convite já foi aceito.')
        return
      }

      // Check if expired
      if (new Date(conviteData.expira_em) < new Date()) {
        setError('Este convite expirou. Solicite um novo convite ao administrador do escritório.')
        return
      }

      setConvite({
        id: conviteData.id,
        email: conviteData.email,
        role: conviteData.role,
        expira_em: conviteData.expira_em,
        escritorio_nome: (conviteData.escritorio as any)?.nome || 'Escritório',
        convidado_por_nome: (conviteData.convidador as any)?.nome_completo || 'Administrador'
      })
    } catch (err) {
      console.error('Erro ao carregar convite:', err)
      setError('Erro ao carregar informações do convite.')
    } finally {
      setLoading(false)
    }
  }

  async function handleAcceptInvite() {
    if (!isLoggedIn) {
      // Save token in sessionStorage and redirect to login
      sessionStorage.setItem('pendingInviteToken', token)
      router.push('/login')
      return
    }

    setAccepting(true)
    setError(null)

    try {
      await aceitarConvite(token)
      setSuccess(true)

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (err: any) {
      console.error('Erro ao aceitar convite:', err)
      setError(err.message || 'Erro ao aceitar convite. Tente novamente.')
    } finally {
      setAccepting(false)
    }
  }

  function getRoleDisplay(role: string) {
    const roles: Record<string, string> = {
      'owner': 'Proprietário',
      'admin': 'Administrador',
      'advogado': 'Advogado',
      'assistente': 'Assistente',
      'readonly': 'Somente Leitura'
    }
    return roles[role] || role
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-slate-50/30 to-[#f0f9f9]/40 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-10 h-10 text-[#89bcbe] animate-spin mb-4" />
            <p className="text-slate-600">Carregando convite...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-slate-50/30 to-[#f0f9f9]/40 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold text-[#34495e] mb-2">Convite aceito!</h2>
            <p className="text-slate-600 text-center mb-4">
              Você agora faz parte de <strong>{convite?.escritorio_nome}</strong>
            </p>
            <p className="text-sm text-slate-500">Redirecionando para o dashboard...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-slate-50/30 to-[#f0f9f9]/40 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-[#34495e] mb-2">Convite inválido</h2>
            <p className="text-slate-600 text-center mb-6">{error}</p>
            <Button
              variant="outline"
              onClick={() => router.push('/login')}
              className="border-[#89bcbe] text-[#34495e] hover:bg-[#f0f9f9]"
            >
              Ir para o login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50/30 to-[#f0f9f9]/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <img
            src="/zyra.logo.png"
            alt="Zyra Legal"
            className="h-16 w-auto mx-auto"
          />
        </div>

        <Card className="shadow-xl border-slate-200/50">
          <CardHeader className="text-center pb-2">
            <div className="w-14 h-14 bg-[#89bcbe]/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <UserPlus className="w-7 h-7 text-[#89bcbe]" />
            </div>
            <CardTitle className="text-xl text-[#34495e]">Convite para o escritório</CardTitle>
            <CardDescription>
              Você foi convidado para fazer parte de uma equipe
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Office info */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#34495e]/10 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-[#34495e]" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Escritório</p>
                  <p className="font-semibold text-[#34495e]">{convite?.escritorio_nome}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <p className="text-xs text-slate-500">Cargo</p>
                  <p className="text-sm font-medium text-[#34495e]">{getRoleDisplay(convite?.role || '')}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Convidado por</p>
                  <p className="text-sm font-medium text-[#34495e]">{convite?.convidado_por_nome}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-200">
                <Clock className="w-3.5 h-3.5" />
                <span>Expira em {formatDate(convite?.expira_em || '')}</span>
              </div>
            </div>

            {/* Email mismatch warning */}
            {isLoggedIn && userEmail && convite?.email && userEmail !== convite.email && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800">Email diferente</p>
                  <p className="text-amber-700 text-xs mt-0.5">
                    O convite foi enviado para <strong>{convite.email}</strong>,
                    mas você está logado como <strong>{userEmail}</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* Login notice */}
            {!isLoggedIn && (
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-blue-800">Login necessário</p>
                  <p className="text-blue-700 text-xs mt-0.5">
                    Você precisa fazer login ou criar uma conta para aceitar este convite.
                  </p>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 border-slate-300 hover:bg-slate-50"
                onClick={() => router.push('/login')}
              >
                {isLoggedIn ? 'Voltar' : 'Criar conta'}
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-[#89bcbe] to-[#6ba9ab] hover:from-[#6ba9ab] hover:to-[#89bcbe] text-white"
                onClick={handleAcceptInvite}
                disabled={accepting}
              >
                {accepting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Aceitando...
                  </>
                ) : isLoggedIn ? (
                  'Aceitar convite'
                ) : (
                  'Fazer login'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
