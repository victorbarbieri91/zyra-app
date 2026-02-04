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
import { Loader2, FileSignature, ExternalLink, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatBrazilDate } from '@/lib/timezone'

interface ContratosPessoaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pessoaId: string
  pessoaNome: string
}

interface Contrato {
  id: string
  numero_contrato: string
  tipo_servico: string
  forma_cobranca: string
  ativo: boolean
  data_inicio: string
  data_fim: string | null
}

const tipoServicoLabels: Record<string, string> = {
  processo: 'Processo',
  consultoria: 'Consultoria',
  avulso: 'Avulso',
  misto: 'Misto',
}

const formaCobrancaLabels: Record<string, string> = {
  fixo: 'Fixo',
  por_hora: 'Por Hora',
  por_etapa: 'Por Etapa',
  misto: 'Misto',
}

export function ContratosPessoaModal({
  open,
  onOpenChange,
  pessoaId,
  pessoaNome,
}: ContratosPessoaModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [contratos, setContratos] = useState<Contrato[]>([])

  useEffect(() => {
    if (open && pessoaId) {
      loadContratos()
    }
  }, [open, pessoaId])

  const loadContratos = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('contratos_honorarios')
        .select('id, numero_contrato, tipo_servico, forma_cobranca, ativo, data_inicio, data_fim')
        .eq('cliente_id', pessoaId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setContratos(data || [])
    } catch (error) {
      console.error('Erro ao carregar contratos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNavigate = (contratoId: string) => {
    onOpenChange(false)
    router.push(`/dashboard/financeiro/contratos/${contratoId}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[#34495e]">
            Contratos de Honorarios de {pessoaNome}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : contratos.length === 0 ? (
          <div className="py-12 text-center">
            <FileSignature className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="text-sm text-slate-500">
              Nenhum contrato de honorarios vinculado a esta pessoa
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {contratos.map((contrato) => (
                <div
                  key={contrato.id}
                  onClick={() => handleNavigate(contrato.id)}
                  className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-medium text-[#34495e]">
                          {contrato.numero_contrato}
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <span>{tipoServicoLabels[contrato.tipo_servico] || contrato.tipo_servico}</span>
                        <span>•</span>
                        <span>{formaCobrancaLabels[contrato.forma_cobranca] || contrato.forma_cobranca}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatBrazilDate(contrato.data_inicio)}
                          {contrato.data_fim && ` - ${formatBrazilDate(contrato.data_fim)}`}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        contrato.ativo
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {contrato.ativo ? 'Ativo' : 'Inativo'}
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
