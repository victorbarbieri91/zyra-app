'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Printer,
  Download,
  Clock,
  CheckCircle2,
  Users,
  Calculator,
  Building2,
  Scale,
  Briefcase,
  Star,
  Phone,
  Mail,
  Globe,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { usePortfolioProdutos } from '@/hooks/usePortfolioProdutos'
import type { ProdutoCompleto, AreaJuridica } from '@/types/portfolio'
import { AREA_JURIDICA_LABELS, COMPLEXIDADE_LABELS, TIPO_PRECO_LABELS } from '@/types/portfolio'

// Ícones por área
const AREA_ICONS: Record<AreaJuridica, typeof Calculator> = {
  tributario: Calculator,
  societario: Building2,
  trabalhista: Users,
  civel: Scale,
  outro: Briefcase,
}

// Dados do escritório para o PDF
const ESCRITORIO_INFO = {
  nome: 'Zyra Legal',
  subtitulo: 'Advocacia & Consultoria',
  endereco: 'Av. Paulista, 1000 - 10º andar - São Paulo/SP',
  telefone: '(11) 3000-0000',
  email: 'contato@zyralegal.com.br',
  website: 'www.zyralegal.com.br',
}

export default function ProdutoPDFPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const produtoId = params.id as string

  const [escritorioId, setEscritorioId] = useState<string | null>(null)
  const [produto, setProduto] = useState<ProdutoCompleto | null>(null)
  const [loading, setLoading] = useState(true)

  // Carregar escritório do usuário logado
  useEffect(() => {
    const loadEscritorioId = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('escritorio_id')
          .eq('id', user.id)
          .single()
        if (profile?.escritorio_id) {
          setEscritorioId(profile.escritorio_id)
        }
      }
    }
    loadEscritorioId()
  }, [])

  const { loadProdutoCompleto } = usePortfolioProdutos(escritorioId || '')

  // Carregar produto
  useEffect(() => {
    async function load() {
      if (!escritorioId) return
      setLoading(true)
      const data = await loadProdutoCompleto(produtoId)
      if (data) setProduto(data)
      setLoading(false)
    }
    load()
  }, [produtoId, escritorioId])

  // Handlers
  const handlePrint = () => {
    window.print()
  }

  const handleBack = () => {
    router.back()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#34495e]" />
      </div>
    )
  }

  if (!produto) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-500">Produto não encontrado</p>
      </div>
    )
  }

  const AreaIcon = AREA_ICONS[produto.area_juridica]
  const precosPadrao = produto.precos.filter((p) => p.ativo)
  const duracaoTotal = produto.fases.reduce((acc, f) => acc + (f.duracao_estimada_dias || 0), 0)

  return (
    <>
      {/* Barra de ferramentas (não imprime) */}
      <div className="print:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir / Salvar PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Conteúdo do PDF */}
      <div className="print:pt-0 pt-16 bg-white min-h-screen">
        <div className="max-w-4xl mx-auto p-8 print:p-0">
          {/* ============================================= */}
          {/* PÁGINA 1: Capa e Visão Geral */}
          {/* ============================================= */}
          <div className="print:break-after-page">
            {/* Header com Logo */}
            <header className="flex items-start justify-between mb-12 pb-6 border-b-2 border-[#34495e]">
              <div>
                <h1 className="text-4xl font-bold text-[#34495e]">{ESCRITORIO_INFO.nome}</h1>
                <p className="text-lg text-[#46627f] mt-1">{ESCRITORIO_INFO.subtitulo}</p>
              </div>
              <div className="text-right text-sm text-slate-500">
                <p>{ESCRITORIO_INFO.endereco}</p>
                <p>{ESCRITORIO_INFO.telefone}</p>
                <p>{ESCRITORIO_INFO.email}</p>
              </div>
            </header>

            {/* Título do Produto */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-3 mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#34495e] to-[#46627f] flex items-center justify-center">
                  <AreaIcon className="w-8 h-8 text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-[#34495e] mb-2">{produto.nome}</h2>
              <p className="text-xl text-[#46627f]">{AREA_JURIDICA_LABELS[produto.area_juridica]}</p>
              {produto.categoria && (
                <p className="text-sm text-slate-500 mt-2">{produto.categoria}</p>
              )}
            </div>

            {/* Descrição Comercial */}
            {produto.descricao_comercial && (
              <div className="mb-12 p-6 bg-slate-50 rounded-xl">
                <p className="text-lg text-[#34495e] leading-relaxed whitespace-pre-line">
                  {produto.descricao_comercial}
                </p>
              </div>
            )}

            {/* Destaques */}
            <div className="grid grid-cols-3 gap-6 mb-12">
              <div className="text-center p-6 rounded-xl bg-gradient-to-br from-[#f0f9f9] to-[#e8f5f5]">
                <Clock className="w-8 h-8 text-[#34495e] mx-auto mb-3" />
                <p className="text-3xl font-bold text-[#34495e]">
                  {duracaoTotal || produto.duracao_estimada_dias || '-'}
                </p>
                <p className="text-sm text-slate-600">dias estimados</p>
              </div>

              <div className="text-center p-6 rounded-xl bg-gradient-to-br from-[#f0f9f9] to-[#e8f5f5]">
                <CheckCircle2 className="w-8 h-8 text-[#34495e] mx-auto mb-3" />
                <p className="text-3xl font-bold text-[#34495e]">{produto.fases.length}</p>
                <p className="text-sm text-slate-600">fases de trabalho</p>
              </div>

              <div className="text-center p-6 rounded-xl bg-gradient-to-br from-[#f0f9f9] to-[#e8f5f5]">
                <Star className="w-8 h-8 text-[#34495e] mx-auto mb-3" />
                <p className="text-3xl font-bold text-[#34495e]">
                  {produto.complexidade ? COMPLEXIDADE_LABELS[produto.complexidade] : '-'}
                </p>
                <p className="text-sm text-slate-600">complexidade</p>
              </div>
            </div>

            {/* Rodapé da página */}
            <div className="absolute bottom-8 left-8 right-8 print:relative print:mt-12">
              <div className="text-center text-sm text-slate-400">
                <p>Proposta Comercial - {new Date().toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          </div>

          {/* ============================================= */}
          {/* PÁGINA 2: Fases do Trabalho */}
          {/* ============================================= */}
          <div className="print:break-after-page">
            <h3 className="text-2xl font-bold text-[#34495e] mb-8 pb-4 border-b-2 border-[#89bcbe]">
              Etapas do Serviço
            </h3>

            <div className="space-y-6">
              {produto.fases.map((fase, index) => {
                const diasAcumulados = produto.fases
                  .slice(0, index)
                  .reduce((acc, f) => acc + (f.duracao_estimada_dias || 0), 0)

                return (
                  <div key={fase.id} className="flex gap-6">
                    {/* Número da fase */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#34495e] to-[#46627f] text-white flex items-center justify-center font-bold text-xl">
                        {index + 1}
                      </div>
                    </div>

                    {/* Conteúdo da fase */}
                    <div className="flex-1 pb-6 border-b border-slate-200 last:border-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-xl font-semibold text-[#34495e]">{fase.nome}</h4>
                          {fase.descricao && (
                            <p className="text-slate-600 mt-2 leading-relaxed">{fase.descricao}</p>
                          )}
                        </div>
                        {fase.duracao_estimada_dias && (
                          <div className="text-right flex-shrink-0 ml-4">
                            <p className="text-lg font-semibold text-[#34495e]">
                              {fase.duracao_estimada_dias} dias
                            </p>
                            <p className="text-xs text-slate-500">
                              Dia {diasAcumulados + 1} - {diasAcumulados + fase.duracao_estimada_dias}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Checklist da fase */}
                      {fase.checklist && fase.checklist.length > 0 && (
                        <div className="mt-4 pl-4 border-l-2 border-[#89bcbe]">
                          <p className="text-sm font-medium text-slate-500 mb-2">Entregas:</p>
                          <ul className="space-y-1">
                            {fase.checklist.map((item) => (
                              <li
                                key={item.id}
                                className="flex items-center gap-2 text-sm text-slate-600"
                              >
                                <CheckCircle2 className="w-4 h-4 text-[#89bcbe]" />
                                {item.item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Timeline visual */}
            {produto.fases.length > 0 && (
              <div className="mt-12">
                <h4 className="text-lg font-semibold text-[#34495e] mb-4">Cronograma Visual</h4>
                <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex">
                  {produto.fases.map((fase, index) => {
                    const width = fase.duracao_estimada_dias
                      ? (fase.duracao_estimada_dias / duracaoTotal) * 100
                      : 100 / produto.fases.length

                    const colors = [
                      'from-[#34495e] to-[#46627f]',
                      'from-[#46627f] to-[#6c757d]',
                      'from-[#89bcbe] to-[#aacfd0]',
                      'from-[#aacfd0] to-[#cbe2e2]',
                    ]

                    return (
                      <div
                        key={fase.id}
                        className={`h-full bg-gradient-to-r ${colors[index % colors.length]}`}
                        style={{ width: `${width}%` }}
                        title={`${fase.nome}: ${fase.duracao_estimada_dias || '-'} dias`}
                      />
                    )
                  })}
                </div>
                <div className="flex justify-between mt-2 text-xs text-slate-500">
                  <span>Início</span>
                  <span>{duracaoTotal} dias</span>
                </div>
              </div>
            )}
          </div>

          {/* ============================================= */}
          {/* PÁGINA 3: Investimento e Contato */}
          {/* ============================================= */}
          <div>
            <h3 className="text-2xl font-bold text-[#34495e] mb-8 pb-4 border-b-2 border-[#89bcbe]">
              Investimento
            </h3>

            {precosPadrao.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl">
                <p className="text-slate-500">
                  Entre em contato para uma proposta personalizada
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                {precosPadrao.map((preco) => (
                  <div
                    key={preco.id}
                    className={`p-6 rounded-xl border-2 ${
                      preco.padrao
                        ? 'border-[#34495e] bg-gradient-to-br from-[#f0f9f9] to-white'
                        : 'border-slate-200'
                    }`}
                  >
                    {preco.padrao && (
                      <div className="inline-block px-3 py-1 bg-[#34495e] text-white text-xs font-medium rounded-full mb-3">
                        Recomendado
                      </div>
                    )}

                    <h4 className="text-xl font-semibold text-[#34495e] mb-2">
                      {preco.nome_opcao || 'Padrão'}
                    </h4>

                    <div className="text-3xl font-bold text-[#1E3A8A] mb-4">
                      {preco.tipo === 'fixo' && preco.valor_fixo && (
                        <>R$ {preco.valor_fixo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</>
                      )}
                      {preco.tipo === 'faixa' && (
                        <>
                          R$ {preco.valor_minimo?.toLocaleString('pt-BR')} a R${' '}
                          {preco.valor_maximo?.toLocaleString('pt-BR')}
                        </>
                      )}
                      {preco.tipo === 'hora' && (
                        <>
                          R$ {preco.valor_hora?.toLocaleString('pt-BR')}/hora
                          {preco.horas_estimadas && (
                            <span className="text-lg font-normal text-slate-500 block">
                              (~{preco.horas_estimadas}h estimadas)
                            </span>
                          )}
                        </>
                      )}
                      {preco.tipo === 'exito' && <>{preco.percentual_exito}% de êxito</>}
                      {preco.tipo === 'por_fase' && <>Sob consulta</>}
                    </div>

                    {preco.descricao && (
                      <p className="text-sm text-slate-600">{preco.descricao}</p>
                    )}

                    <p className="text-xs text-slate-400 mt-4">
                      Tipo: {TIPO_PRECO_LABELS[preco.tipo]}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Observações */}
            <div className="bg-slate-50 rounded-xl p-6 mb-12">
              <h4 className="font-semibold text-[#34495e] mb-3">Condições:</h4>
              <ul className="text-sm text-slate-600 space-y-2">
                <li>• Valores sujeitos a análise prévia do caso</li>
                <li>• Honorários não incluem custas processuais ou despesas</li>
                <li>• Condições de pagamento a negociar</li>
                <li>• Proposta válida por 30 dias</li>
              </ul>
            </div>

            {/* Contato */}
            <div className="text-center bg-gradient-to-br from-[#34495e] to-[#46627f] rounded-xl p-8 text-white">
              <h4 className="text-2xl font-bold mb-4">Entre em Contato</h4>
              <p className="text-slate-200 mb-6">
                Estamos à disposição para esclarecer dúvidas e elaborar uma proposta personalizada.
              </p>

              <div className="flex justify-center gap-8 text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  <span>{ESCRITORIO_INFO.telefone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  <span>{ESCRITORIO_INFO.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  <span>{ESCRITORIO_INFO.website}</span>
                </div>
              </div>
            </div>

            {/* Rodapé final */}
            <div className="mt-12 pt-6 border-t border-slate-200 text-center text-sm text-slate-400">
              <p>{ESCRITORIO_INFO.nome} - {ESCRITORIO_INFO.endereco}</p>
              <p className="mt-1">
                Documento gerado em {new Date().toLocaleDateString('pt-BR')} às{' '}
                {new Date().toLocaleTimeString('pt-BR')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Estilos de impressão */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 2cm;
            size: A4;
          }

          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .print\\:hidden {
            display: none !important;
          }

          .print\\:break-after-page {
            page-break-after: always;
          }
        }
      `}</style>
    </>
  )
}
