'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { User, Phone, Scale, Upload, Loader2, ArrowRight, ArrowLeft } from 'lucide-react'
import { colors } from '@/lib/design-system'
import { UpdateProfileData } from '@/hooks/useOnboarding'

interface ProfileFormProps {
  onSubmit: (data: UpdateProfileData) => Promise<{ success: boolean; error?: string }>
  onSkip: () => Promise<{ success: boolean; error?: string }>
  onBack?: () => void
  isSubmitting?: boolean
}

// Lista de UFs brasileiras
const UF_OPTIONS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
]

export function ProfileForm({ onSubmit, onSkip, onBack, isSubmitting = false }: ProfileFormProps) {
  const [telefone, setTelefone] = useState('')
  const [oabNumero, setOabNumero] = useState('')
  const [oabUf, setOabUf] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const result = await onSubmit({
      telefone: telefone.trim() || undefined,
      oab_numero: oabNumero.trim() || undefined,
      oab_uf: oabUf || undefined,
      avatar_url: avatarUrl || undefined,
    })

    if (!result.success) {
      setError(result.error || 'Erro ao salvar perfil')
    }
  }

  const handleSkip = async () => {
    setError(null)
    const result = await onSkip()
    if (!result.success) {
      setError(result.error || 'Erro ao pular etapa')
    }
  }

  const hasAnyData = telefone || oabNumero || oabUf

  return (
    <div className="space-y-6">
      {/* Botão Voltar */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
      )}

      {/* Header - Sem ícone para não poluir */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold" style={{ color: colors.primary.darkest }}>
          Complete seu Perfil
        </h2>
        <p className="text-sm text-slate-600">
          Adicione suas informações profissionais (opcional)
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card className="p-6 space-y-5">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center space-y-3 pb-4 border-b border-slate-100">
            <div className="relative">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center border-2"
                style={{
                  borderColor: colors.primary.light,
                  backgroundColor: avatarUrl ? 'transparent' : colors.primary.light + '10'
                }}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-slate-400" />
                )}
              </div>
              <button
                type="button"
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md border border-white text-white"
                style={{ backgroundColor: colors.primary.medium }}
                onClick={() => {
                  // TODO: Implementar upload de avatar
                  alert('Upload de foto será implementado em breve')
                }}
                disabled={isSubmitting}
              >
                <Upload className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Adicionar foto (opcional)
            </p>
          </div>

          {/* Telefone */}
          <div className="space-y-2">
            <Label htmlFor="telefone" className="text-sm font-medium text-slate-700">
              Telefone Pessoal
            </Label>
            <div className="relative">
              <Phone
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              />
              <Input
                id="telefone"
                type="tel"
                placeholder="(11) 99999-9999"
                value={telefone}
                onChange={(e) => setTelefone(formatPhone(e.target.value))}
                className="pl-10"
                maxLength={15}
                disabled={isSubmitting}
              />
            </div>
            <p className="text-xs text-slate-500">
              Usado para notificações importantes
            </p>
          </div>

          {/* OAB */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">
              Registro OAB
            </Label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Scale
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                />
                <Input
                  id="oab_numero"
                  type="text"
                  placeholder="123456"
                  value={oabNumero}
                  onChange={(e) => setOabNumero(e.target.value.replace(/\D/g, ''))}
                  className="pl-10"
                  maxLength={10}
                  disabled={isSubmitting}
                />
              </div>
              <select
                value={oabUf}
                onChange={(e) => setOabUf(e.target.value)}
                className="w-20 h-10 rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-offset-0"
                style={{
                  borderColor: oabUf ? colors.primary.medium : undefined,
                }}
                disabled={isSubmitting}
              >
                <option value="">UF</option>
                {UF_OPTIONS.map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-slate-500">
              Aparecerá em documentos e petições
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleSkip}
              disabled={isSubmitting}
              className="flex-1 h-12"
            >
              Pular e Começar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 h-12 font-semibold shadow-lg hover:shadow-xl transition-all"
              style={{
                background: `linear-gradient(135deg, ${colors.primary.darkest}, ${colors.primary.dark})`,
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  Salvar e Começar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
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
          <strong>Dica:</strong> Essas informações podem ser adicionadas ou alteradas depois
          no menu de configurações do seu perfil.
        </p>
      </div>
    </div>
  )
}
