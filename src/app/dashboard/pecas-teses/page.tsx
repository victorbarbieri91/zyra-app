'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { FileText, Scale, BookOpen, Sparkles, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function PecasTesesPage() {
  const [stats, setStats] = useState({
    templates: 0,
    teses: 0,
    jurisprudencias: 0,
  })
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('escritorio_id')
        .eq('id', user.id)
        .single()

      if (!profile) return

      const [templatesRes, tesesRes, jurisRes] = await Promise.all([
        supabase
          .from('pecas_templates')
          .select('id', { count: 'exact', head: true })
          .eq('escritorio_id', profile.escritorio_id)
          .eq('ativo', true),
        supabase
          .from('pecas_teses')
          .select('id', { count: 'exact', head: true })
          .eq('escritorio_id', profile.escritorio_id)
          .eq('ativa', true),
        supabase
          .from('pecas_jurisprudencias')
          .select('id', { count: 'exact', head: true })
          .eq('escritorio_id', profile.escritorio_id),
      ])

      setStats({
        templates: templatesRes.count || 0,
        teses: tesesRes.count || 0,
        jurisprudencias: jurisRes.count || 0,
      })
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-600">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/50 p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#34495e]">Peças e Teses</h1>
        <p className="text-sm text-slate-600 mt-1">
          Gerencie templates, banco de conhecimento jurídico e crie peças processuais
        </p>
      </div>

      {/* Navigation Cards - 3 colunas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Templates */}
        <Link href="/dashboard/pecas-teses/templates">
          <Card className="border-slate-200 hover:shadow-lg hover:border-[#34495e]/30 transition-all cursor-pointer group h-full">
            <CardContent className="pt-8 pb-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#34495e] to-[#46627f] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#34495e] mb-1">
                    Templates
                  </h2>
                  <p className="text-sm text-slate-600 mb-3">
                    Modelos de peças processuais
                  </p>
                  <p className="text-2xl font-bold text-[#34495e]">
                    {stats.templates}
                  </p>
                  <p className="text-xs text-slate-500">
                    {stats.templates === 1 ? 'template cadastrado' : 'templates cadastrados'}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#34495e] font-medium pt-2">
                  <span>Acessar</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Card 2: Banco de Teses & Jurisprudências */}
        <Link href="/dashboard/pecas-teses/banco">
          <Card className="border-slate-200 hover:shadow-lg hover:border-[#89bcbe]/30 transition-all cursor-pointer group h-full">
            <CardContent className="pt-8 pb-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#89bcbe] to-[#6ba9ab] flex items-center justify-center group-hover:scale-110 transition-transform relative">
                  <Scale className="w-7 h-7 text-white absolute -left-1" />
                  <BookOpen className="w-7 h-7 text-white absolute right-0" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#34495e] mb-1">
                    Banco de Conhecimento
                  </h2>
                  <p className="text-sm text-slate-600 mb-3">
                    Teses jurídicas e jurisprudências
                  </p>
                  <div className="flex items-center justify-center gap-4">
                    <div>
                      <p className="text-2xl font-bold text-[#34495e]">
                        {stats.teses}
                      </p>
                      <p className="text-xs text-slate-500">
                        {stats.teses === 1 ? 'tese' : 'teses'}
                      </p>
                    </div>
                    <div className="w-px h-10 bg-slate-200"></div>
                    <div>
                      <p className="text-2xl font-bold text-[#34495e]">
                        {stats.jurisprudencias}
                      </p>
                      <p className="text-xs text-slate-500">
                        {stats.jurisprudencias === 1 ? 'jurisprudência' : 'jurisprudências'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#34495e] font-medium pt-2">
                  <span>Acessar</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Card 3: Gerador de Peças */}
        <Link href="/dashboard/pecas-teses/gerar">
          <Card className="border-slate-200 hover:shadow-lg hover:border-[#89bcbe]/30 transition-all cursor-pointer group h-full">
            <CardContent className="pt-8 pb-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#89bcbe] to-[#6ba9ab] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#34495e] mb-1">
                    Gerador de Peças
                  </h2>
                  <p className="text-sm text-slate-600 mb-3">
                    Crie peças com templates e IA
                  </p>
                  <div className="inline-block px-3 py-1 bg-blue-100 rounded-full">
                    <p className="text-xs text-blue-700 font-medium">
                      Em desenvolvimento
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#34495e] font-medium pt-2">
                  <span>Acessar</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Info Card */}
      <Card className="border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100/50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#89bcbe] to-[#6ba9ab] flex items-center justify-center shrink-0">
              <Scale className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-[#34495e] mb-1">
                Como funciona?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong>1. Templates:</strong> Crie modelos de peças e vincule teses e jurisprudências do seu banco.{' '}
                <strong>2. Banco:</strong> Organize seu conhecimento jurídico com teses e jurisprudências reutilizáveis.{' '}
                <strong>3. Gerador:</strong> Combine templates + banco + dados do processo para gerar peças completas.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
