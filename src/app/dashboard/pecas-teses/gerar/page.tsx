'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, FileText, Scale, BookOpen, ArrowRight, Construction } from 'lucide-react'
import Link from 'next/link'

export default function GeradorPecasPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/50 p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#34495e]">Gerador de Peças</h1>
        <p className="text-sm text-slate-600 mt-1">
          Funcionalidade em desenvolvimento - Próxima fase
        </p>
      </div>

      {/* Main Card */}
      <Card className="border-slate-200">
        <CardHeader className="pb-4 pt-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#89bcbe] to-[#6ba9ab] flex items-center justify-center">
              <Construction className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-xl font-bold text-[#34495e] text-center">
            Gerador de Peças com IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pb-6">
          <p className="text-center text-slate-600">
            Esta funcionalidade será implementada na próxima fase do projeto.
            O gerador permitirá criar peças processuais completas combinando
            templates, teses e jurisprudências.
          </p>

          {/* Features Preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            <Card className="border-slate-200 bg-slate-50/50">
              <CardContent className="pt-6 pb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#34495e] to-[#46627f] flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#34495e] mb-1">
                      Templates Inteligentes
                    </h3>
                    <p className="text-xs text-slate-600">
                      Selecione templates personalizados e preencha variáveis
                      automaticamente com dados do processo
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-slate-50/50">
              <CardContent className="pt-6 pb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#89bcbe] to-[#6ba9ab] flex items-center justify-center shrink-0">
                    <Scale className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#34495e] mb-1">
                      Banco de Teses
                    </h3>
                    <p className="text-xs text-slate-600">
                      Combine teses jurídicas do seu banco para fundamentar
                      argumentos de forma consistente
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-slate-50/50">
              <CardContent className="pt-6 pb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#34495e] to-[#46627f] flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#34495e] mb-1">
                      Jurisprudências Relevantes
                    </h3>
                    <p className="text-xs text-slate-600">
                      Adicione jurisprudências do banco com citações formatadas
                      e links para inteiro teor
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-slate-50/50">
              <CardContent className="pt-6 pb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#89bcbe] to-[#6ba9ab] flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#34495e] mb-1">
                      Geração com IA
                    </h3>
                    <p className="text-xs text-slate-600">
                      IA sugere teses e jurisprudências relevantes e gera
                      rascunho completo da peça
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Workflow Preview */}
          <div className="mt-8 p-6 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200">
            <h3 className="text-sm font-semibold text-[#34495e] mb-4 text-center">
              Fluxo de Trabalho Previsto
            </h3>
            <div className="flex items-center justify-center gap-2 flex-wrap text-xs text-slate-600">
              <span className="px-3 py-1.5 bg-white rounded-lg border border-slate-200">
                1. Selecionar Template
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
              <span className="px-3 py-1.5 bg-white rounded-lg border border-slate-200">
                2. Escolher Teses
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
              <span className="px-3 py-1.5 bg-white rounded-lg border border-slate-200">
                3. Adicionar Jurisprudências
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
              <span className="px-3 py-1.5 bg-white rounded-lg border border-slate-200">
                4. Preencher Variáveis
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
              <span className="px-3 py-1.5 bg-white rounded-lg border border-slate-200">
                5. IA Gera Peça
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
              <span className="px-3 py-1.5 bg-white rounded-lg border border-slate-200">
                6. Revisar e Finalizar
              </span>
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col items-center gap-4 mt-8">
            <p className="text-sm text-slate-600 text-center">
              Enquanto isso, você pode preparar o terreno cadastrando:
            </p>
            <div className="flex gap-3">
              <Link href="/dashboard/pecas-teses/templates/novo">
                <Button variant="outline" size="sm">
                  <FileText className="w-4 h-4 mr-2" />
                  Templates
                </Button>
              </Link>
              <Link href="/dashboard/pecas-teses/teses/nova">
                <Button variant="outline" size="sm">
                  <Scale className="w-4 h-4 mr-2" />
                  Teses
                </Button>
              </Link>
              <Link href="/dashboard/pecas-teses/jurisprudencias/nova">
                <Button variant="outline" size="sm">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Jurisprudências
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-slate-200 bg-blue-50/30">
        <CardContent className="pt-6 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#34495e] mb-1">
                Por que construir a base primeiro?
              </h3>
              <p className="text-xs text-slate-600">
                Quanto mais templates, teses e jurisprudências você cadastrar agora,
                mais poderosa será a geração de peças com IA na próxima fase. A IA
                aprenderá com o seu banco de conhecimento para criar peças cada vez
                mais precisas e personalizadas para o seu escritório.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
