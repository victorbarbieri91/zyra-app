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
import { Loader2, Scale, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ProcessosPessoaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pessoaId: string
  pessoaNome: string
}

interface Processo {
  id: string
  numero_cnj: string
  area: string
  fase: string
  status: string
  tribunal: string
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
  ambiental: 'Ambiental',
  outra: 'Outra',
}

const faseLabels: Record<string, string> = {
  conhecimento: 'Conhecimento',
  recurso: 'Recurso',
  execucao: 'Execucao',
  cumprimento_sentenca: 'Cumprimento de Sentenca',
}

const statusColors: Record<string, string> = {
  ativo: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  suspenso: 'bg-amber-50 text-amber-700 border-amber-200',
  arquivado: 'bg-slate-50 text-slate-700 border-slate-200',
  encerrado: 'bg-blue-50 text-blue-700 border-blue-200',
}

export function ProcessosPessoaModal({
  open,
  onOpenChange,
  pessoaId,
  pessoaNome,
}: ProcessosPessoaModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [processos, setProcessos] = useState<Processo[]>([])

  useEffect(() => {
    if (open && pessoaId) {
      loadProcessos()
    }
  }, [open, pessoaId])

  const loadProcessos = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('processos_processos')
        .select('id, numero_cnj, area, fase, status, tribunal')
        .eq('cliente_id', pessoaId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setProcessos(data || [])
    } catch (error) {
      console.error('Erro ao carregar processos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNavigate = (processoId: string) => {
    onOpenChange(false)
    router.push(`/dashboard/processos/${processoId}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[#34495e]">
            Processos de {pessoaNome}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : processos.length === 0 ? (
          <div className="py-12 text-center">
            <Scale className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="text-sm text-slate-500">
              Nenhum processo vinculado a esta pessoa
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {processos.map((processo) => (
                <div
                  key={processo.id}
                  onClick={() => handleNavigate(processo.id)}
                  className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-medium text-[#34495e]">
                          {processo.numero_cnj}
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <span>{processo.tribunal}</span>
                        <span>•</span>
                        <span>{areaLabels[processo.area] || processo.area}</span>
                        <span>•</span>
                        <span>{faseLabels[processo.fase] || processo.fase}</span>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${statusColors[processo.status] || 'bg-slate-50 text-slate-700'}`}
                    >
                      {processo.status}
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
