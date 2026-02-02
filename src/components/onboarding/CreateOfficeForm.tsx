'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Building2, ChevronDown, ChevronUp, Phone, Mail, FileText, Loader2 } from 'lucide-react'
import { colors } from '@/lib/design-system'
import { CreateEscritorioData, EscritorioData } from '@/hooks/useOnboarding'

interface CreateOfficeFormProps {
  onSubmit: (data: CreateEscritorioData) => Promise<{ success: boolean; error?: string }>
  isSubmitting?: boolean
  initialData?: EscritorioData | null
}

export function CreateOfficeForm({ onSubmit, isSubmitting = false, initialData }: CreateOfficeFormProps) {
  const [nome, setNome] = useState('')
  const [showOptional, setShowOptional] = useState(false)
  const [cnpj, setCnpj] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!initialData?.id

  // Preencher com dados existentes
  useEffect(() => {
    if (initialData) {
      setNome(initialData.nome || '')
      setCnpj(initialData.cnpj || '')
      setTelefone(initialData.telefone || '')
      setEmail(initialData.email || '')
      // Se tem dados opcionais, mostrar a seção
      if (initialData.cnpj || initialData.telefone || initialData.email) {
        setShowOptional(true)
      }
    }
  }, [initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!nome.trim()) {
      setError('Nome do escritório é obrigatório')
      return
    }

    const result = await onSubmit({
      nome: nome.trim(),
      cnpj: cnpj.trim() || undefined,
      telefone: telefone.trim() || undefined,
      email: email.trim() || undefined,
    })

    if (!result.success) {
      setError(result.error || 'Erro ao criar escritório')
    }
  }

  // Formatar CNPJ
  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 14) {
      return numbers
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
    }
    return value
  }

  // Formatar telefone
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 11) {
      if (numbers.length <= 10) {
        return numbers
          .replace(/(\d{2})(\d)/, '($1) $2')
          .replace(/(\d{4})(\d)/, '$1-$2')
      }
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
    }
    return value
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold" style={{ color: colors.primary.darkest }}>
          {isEditing ? 'Edite seu Escritório' : 'Crie seu Escritório'}
        </h2>
        <p className="text-sm text-slate-600">
          {isEditing
            ? 'Revise os dados do seu escritório antes de continuar'
            : 'Vamos começar criando seu escritório no Zyra Legal'}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card className="p-6 space-y-5">
          {/* Nome do Escritório - Obrigatório */}
          <div className="space-y-2">
            <Label htmlFor="nome" className="text-sm font-medium text-slate-700">
              Nome do Escritório <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Building2
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              />
              <Input
                id="nome"
                type="text"
                placeholder="Ex: Silva & Associados Advocacia"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="pl-10 h-12"
                disabled={isSubmitting}
                autoFocus
              />
            </div>
            <p className="text-xs text-slate-500">
              Este nome aparecerá em documentos e comunicações
            </p>
          </div>

          {/* Toggle para campos opcionais */}
          <button
            type="button"
            onClick={() => setShowOptional(!showOptional)}
            className="flex items-center gap-2 text-sm font-medium transition-colors w-full justify-center py-2 rounded-lg hover:bg-slate-50"
            style={{ color: colors.primary.dark }}
          >
            {showOptional ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Ocultar dados adicionais
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Adicionar mais dados (opcional)
              </>
            )}
          </button>

          {/* Campos opcionais */}
          {showOptional && (
            <div className="space-y-4 pt-2 border-t border-slate-100">
              {/* CNPJ */}
              <div className="space-y-2">
                <Label htmlFor="cnpj" className="text-sm font-medium text-slate-700">
                  CNPJ
                </Label>
                <div className="relative">
                  <FileText
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                  />
                  <Input
                    id="cnpj"
                    type="text"
                    placeholder="00.000.000/0000-00"
                    value={cnpj}
                    onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                    className="pl-10"
                    maxLength={18}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Telefone */}
              <div className="space-y-2">
                <Label htmlFor="office_telefone" className="text-sm font-medium text-slate-700">
                  Telefone do Escritório
                </Label>
                <div className="relative">
                  <Phone
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                  />
                  <Input
                    id="office_telefone"
                    type="tel"
                    placeholder="(11) 3333-3333"
                    value={telefone}
                    onChange={(e) => setTelefone(formatPhone(e.target.value))}
                    className="pl-10"
                    maxLength={15}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="office_email" className="text-sm font-medium text-slate-700">
                  Email do Escritório
                </Label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                  />
                  <Input
                    id="office_email"
                    type="email"
                    placeholder="contato@escritorio.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting || !nome.trim()}
            className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
            style={{
              background: `linear-gradient(135deg, ${colors.primary.darkest}, ${colors.primary.dark})`,
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {isEditing ? 'Salvando...' : 'Criando escritório...'}
              </>
            ) : (
              isEditing ? 'Salvar e Continuar' : 'Criar e Continuar'
            )}
          </Button>
        </Card>
      </form>

      {/* Info Footer */}
      <div
        className="p-4 rounded-lg border"
        style={{
          backgroundColor: colors.primary.light + '10',
          borderColor: colors.primary.light
        }}
      >
        <p className="text-xs text-slate-600">
          <strong>Dica:</strong> Você pode adicionar mais informações do escritório depois
          nas configurações, como endereço, logo e dados bancários.
        </p>
      </div>
    </div>
  )
}
