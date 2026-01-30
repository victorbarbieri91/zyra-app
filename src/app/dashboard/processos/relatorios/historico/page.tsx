'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
  Clock,
  Users,
  Loader2,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  Trash2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { RelatorioGerado } from '@/types/relatorios'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

export default function HistoricoRelatoriosPage() {
  const router = useRouter()
  const supabase = createClient()

  const [relatorios, setRelatorios] = useState<RelatorioGerado[]>([])
  const [loading, setLoading] = useState(true)
  const [escritorioId, setEscritorioId] = useState<string | null>(null)

  // Carregar dados do usuario
  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('escritorio_id')
          .eq('id', user.id)
          .single()

        if (profile) {
          setEscritorioId(profile.escritorio_id)
        }
      }
    }
    loadUserData()
  }, [supabase])

  // Carregar historico
  useEffect(() => {
    if (!escritorioId) return

    const loadHistorico = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('relatorios_gerados')
          .select('*')
          .eq('escritorio_id', escritorioId)
          .order('created_at', { ascending: false })
          .limit(50)

        if (error) throw error
        setRelatorios(data || [])
      } catch (err) {
        console.error('Erro ao carregar historico:', err)
      } finally {
        setLoading(false)
      }
    }

    loadHistorico()
  }, [escritorioId, supabase])

  // Gerar URL de download
  const getDownloadUrl = async (arquivoUrl: string) => {
    const { data } = await supabase
      .storage
      .from('relatorios')
      .createSignedUrl(arquivoUrl, 3600)

    return data?.signedUrl
  }

  // Handler de download
  const handleDownload = async (relatorio: RelatorioGerado) => {
    if (!relatorio.arquivo_url) return

    const url = await getDownloadUrl(relatorio.arquivo_url)
    if (url) {
      window.open(url, '_blank')
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/dashboard/processos/relatorios')}
          className="h-9 w-9"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-[#34495e]">
            Historico de Relatorios
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Relatorios gerados anteriormente
          </p>
        </div>
      </div>

      {/* Lista de relatorios */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#89bcbe]" />
        </div>
      ) : relatorios.length === 0 ? (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="py-12 text-center">
            <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-700 mb-2">
              Nenhum relatorio gerado
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Seus relatorios gerados aparecerao aqui
            </p>
            <Button
              onClick={() => router.push('/dashboard/processos/relatorios')}
              className="bg-[#34495e] hover:bg-[#46627f] text-white"
            >
              Gerar Primeiro Relatorio
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {relatorios.map(relatorio => (
            <Card key={relatorio.id} className="border-slate-200 shadow-sm hover:border-[#89bcbe] transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Icone */}
                  <div className={cn(
                    "w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0",
                    relatorio.status === 'concluido'
                      ? "bg-emerald-100"
                      : relatorio.status === 'erro'
                        ? "bg-red-100"
                        : "bg-amber-100"
                  )}>
                    {relatorio.status === 'concluido' ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    ) : relatorio.status === 'erro' ? (
                      <AlertCircle className="w-6 h-6 text-red-600" />
                    ) : (
                      <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
                    )}
                  </div>

                  {/* Informacoes */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-[#34495e] truncate">
                        {relatorio.titulo}
                      </h3>
                      {relatorio.andamentos_salvos && (
                        <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200">
                          Andamentos salvos
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {format(new Date(relatorio.created_at), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {relatorio.clientes_ids.length} cliente{relatorio.clientes_ids.length !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        {relatorio.processos_ids.length} processo{relatorio.processos_ids.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {relatorio.arquivo_nome && (
                      <p className="text-xs text-slate-400 mt-1 truncate">
                        {relatorio.arquivo_nome}
                      </p>
                    )}
                  </div>

                  {/* Acoes */}
                  <div className="flex items-center gap-2">
                    {relatorio.status === 'concluido' && relatorio.arquivo_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(relatorio)}
                        className="h-9"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Baixar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
