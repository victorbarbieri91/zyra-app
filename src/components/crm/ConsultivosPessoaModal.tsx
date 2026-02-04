'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, FileText, ExternalLink, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatBrazilDate } from '@/lib/timezone'

interface ConsultivosPessoaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pessoaId: string
  pessoaNome: string
}

interface Consulta {
  id: string
  numero: string | null
  titulo: string
  area: string
  status: string
  prazo: string | null
}

const areaLabels: Record<string, string> = {
  civel: 'Civel',
  trabalhista: 'Trabalhista',
  tributaria: 'Tributaria',
  familia: 'Familia',
  criminal: 'Criminal',
  previdenciaria: 'Previdenciaria',
  consumidor: 'Consumidor',
  empresarial: 'Empresarial',
  societario: 'Societario',
  contratual: 'Contratual',
  imobiliario: 'Imobiliario',
  ambiental: 'Ambiental',
  outros: 'Outros',
}

const statusLabels: Record<string, string> = {
  nova: 'Nova',
  em_analise: 'Em Analise',
  aguardando_info: 'Aguardando Info',
  respondida: 'Respondida',
  concluida: 'Concluida',
  cancelada: 'Cancelada',
}

const statusColors: Record<string, string> = {
  nova: 'bg-blue-50 text-blue-700 border-blue-200',
  em_analise: 'bg-amber-50 text-amber-700 border-amber-200',
  aguardando_info: 'bg-purple-50 text-purple-700 border-purple-200',
  respondida: 'bg-teal-50 text-teal-700 border-teal-200',
  concluida: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelada: 'bg-slate-50 text-slate-700 border-slate-200',
}

export function ConsultivosPessoaModal({
  open,
  onOpenChange,
  pessoaId,
  pessoaNome,
}: ConsultivosPessoaModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [consultas, setConsultas] = useState<Consulta[]>([])

  useEffect(() => {
    if (open && pessoaId) {
      loadConsultas()
    }
  }, [open, pessoaId])

  const loadConsultas = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('consultivo_consultas')
        .select('id, numero, titulo, area, status, prazo')
        .eq('cliente_id', pessoaId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setConsultas(data || [])
    } catch (error) {
      console.error('Erro ao carregar consultas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNavigate = (consultaId: string) => {
    onOpenChange(false)
    router.push(`/dashboard/consultivo/consultas/${consultaId}`)
  }

  const isPrazoProximo = (prazo: string | null) => {
    if (!prazo) return false
    const prazoDate = new Date(prazo)
    const hoje = new Date()
    const diffDays = Math.ceil((prazoDate.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays >= 0 && diffDays <= 3
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[#34495e]">
            Consultivos de {pessoaNome}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : consultas.length === 0 ? (
          <div className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="text-sm text-slate-500">
              Nenhuma consulta vinculada a esta pessoa
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {consultas.map((consulta) => (
                <div
                  key={consulta.id}
                  onClick={() => handleNavigate(consulta.id)}
                  className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {consulta.numero && (
                          <span className="font-mono text-xs text-slate-500">
                            {consulta.numero}
                          </span>
                        )}
                        <span className="text-sm font-medium text-[#34495e] truncate">
                          {consulta.titulo}
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <span>{areaLabels[consulta.area] || consulta.area}</span>
                        {consulta.prazo && (
                          <>
                            <span>•</span>
                            <span className={`flex items-center gap-1 ${isPrazoProximo(consulta.prazo) ? 'text-amber-600 font-medium' : ''}`}>
                              <Calendar className="w-3 h-3" />
                              {formatBrazilDate(consulta.prazo)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] flex-shrink-0 ${statusColors[consulta.status] || 'bg-slate-50 text-slate-700'}`}
                    >
                      {statusLabels[consulta.status] || consulta.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}
