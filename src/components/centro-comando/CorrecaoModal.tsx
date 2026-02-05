'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { AlertCircle, Pencil, Send } from 'lucide-react'

interface CorrecaoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mensagemOriginal: string
  respostaOriginal: string
  onEnviar: (correcao: {
    comentario: string
    respostaEsperada: string
  }) => void
  enviando?: boolean
}

export function CorrecaoModal({
  open,
  onOpenChange,
  mensagemOriginal,
  respostaOriginal,
  onEnviar,
  enviando = false,
}: CorrecaoModalProps) {
  const [comentario, setComentario] = useState('')
  const [respostaEsperada, setRespostaEsperada] = useState('')

  const handleEnviar = () => {
    if (!respostaEsperada.trim()) return

    onEnviar({
      comentario: comentario.trim(),
      respostaEsperada: respostaEsperada.trim(),
    })

    // Limpar campos
    setComentario('')
    setRespostaEsperada('')
  }

  const handleClose = () => {
    if (!enviando) {
      setComentario('')
      setRespostaEsperada('')
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-amber-500" />
            Corrigir resposta da Zyra
          </DialogTitle>
          <DialogDescription>
            Ajude a Zyra a melhorar explicando o que estava errado e qual seria a resposta correta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Contexto */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-500">Sua pergunta</Label>
            <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600 max-h-20 overflow-y-auto">
              {mensagemOriginal}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-slate-500">Resposta da Zyra</Label>
            <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600 max-h-20 overflow-y-auto">
              {respostaOriginal || '(sem texto)'}
            </div>
          </div>

          {/* Campos de correcao */}
          <div className="space-y-2">
            <Label htmlFor="respostaEsperada" className="flex items-center gap-1">
              Qual seria a resposta correta?
              <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="respostaEsperada"
              placeholder="Descreva a resposta que voce esperava..."
              value={respostaEsperada}
              onChange={(e) => setRespostaEsperada(e.target.value)}
              className="min-h-[100px] resize-none"
              disabled={enviando}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comentario">
              Comentario adicional (opcional)
            </Label>
            <Textarea
              id="comentario"
              placeholder="Explique o que estava errado ou como melhorar..."
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              className="min-h-[60px] resize-none"
              disabled={enviando}
            />
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-600">
              Sua correcao sera salva como uma memoria de alta prioridade.
              A Zyra aprendera com isso e nao repetira o mesmo erro.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={enviando}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleEnviar}
            disabled={!respostaEsperada.trim() || enviando}
            className="bg-[#34495e] hover:bg-[#46627f]"
          >
            {enviando ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Enviar correcao
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
