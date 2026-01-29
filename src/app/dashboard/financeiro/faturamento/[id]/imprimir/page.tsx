'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Printer, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFaturaImpressao, FaturaImpressaoData } from '@/hooks/useFaturaImpressao'
import { formatBrazilDateLong, formatBrazilDateTime } from '@/lib/timezone'

export default function FaturaImprimirPage() {
  const params = useParams()
  const router = useRouter()
  const faturaId = params.id as string

  const { loading, error, loadFaturaCompleta } = useFaturaImpressao()
  const [dados, setDados] = useState<FaturaImpressaoData | null>(null)

  useEffect(() => {
    if (faturaId) {
      loadFaturaCompleta(faturaId).then(setDados)
    }
  }, [faturaId, loadFaturaCompleta])

  const handlePrint = () => {
    window.print()
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatCPFCNPJ = (value: string | null, tipo: 'pf' | 'pj') => {
    if (!value) return null
    const clean = value.replace(/\D/g, '')
    if (tipo === 'pf' && clean.length === 11) {
      return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    }
    if (tipo === 'pj' && clean.length === 14) {
      return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
    }
    return value
  }

  const formatCNPJ = (value: string | null) => {
    if (!value) return null
    const clean = value.replace(/\D/g, '')
    if (clean.length === 14) {
      return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
    }
    return value
  }

  const formatEndereco = (end: any) => {
    if (!end) return null
    const parts = []
    if (end.logradouro) {
      let linha = end.logradouro
      if (end.numero) linha += `, ${end.numero}`
      if (end.complemento) linha += ` - ${end.complemento}`
      parts.push(linha)
    }
    if (end.bairro) parts.push(end.bairro)
    const cidadeUf = [end.cidade, end.uf].filter(Boolean).join('/')
    if (cidadeUf) parts.push(cidadeUf)
    if (end.cep) parts.push(`CEP: ${end.cep}`)
    return parts.join(' - ')
  }

  const formatEnderecoCliente = (cliente: any) => {
    const parts = []
    if (cliente.logradouro) {
      let linha = cliente.logradouro
      if (cliente.numero) linha += `, ${cliente.numero}`
      if (cliente.complemento) linha += ` - ${cliente.complemento}`
      parts.push(linha)
    }
    if (cliente.bairro) parts.push(cliente.bairro)
    const cidadeUf = [cliente.cidade, cliente.uf].filter(Boolean).join('/')
    if (cidadeUf) parts.push(cidadeUf)
    if (cliente.cep) parts.push(`CEP: ${cliente.cep}`)
    return parts.join(' - ')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 mx-auto text-slate-400 animate-spin mb-3" />
          <p className="text-sm text-slate-600">Carregando fatura...</p>
        </div>
      </div>
    )
  }

  if (error || !dados) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto text-slate-300 mb-3" />
          <p className="text-lg font-medium text-slate-700 mb-1">Fatura nao encontrada</p>
          <p className="text-sm text-slate-500 mb-4">{error || 'Nao foi possivel carregar os dados da fatura.'}</p>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </div>
    )
  }

  const { escritorio, fatura, cliente, itens, totais, impostos, regime_tributario_label } = dados

  return (
    <>
      {/* CSS de Impressao - esconde TUDO do dashboard exceto a fatura */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 1.5cm;
            size: A4;
          }

          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* ESCONDE SIDEBAR (aside com border-r) */
          aside {
            display: none !important;
            width: 0 !important;
          }

          /* ESCONDE HEADER DO DASHBOARD (header.h-16) */
          header.h-16 {
            display: none !important;
          }

          /* ESCONDE TUDO QUE É FIXED (widgets, timer, etc) */
          .fixed,
          [style*="position: fixed"],
          [style*="position:fixed"] {
            display: none !important;
          }

          /* Ajusta o container principal do dashboard para impressão */
          .flex.h-screen {
            display: block !important;
            height: auto !important;
            overflow: visible !important;
          }

          .overflow-hidden {
            overflow: visible !important;
          }

          /* Remove limitações de largura */
          .flex-1 {
            width: 100% !important;
            max-width: 100% !important;
          }

          /* Remove overflow do main */
          main {
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          /* Classe para esconder elementos na impressão */
          .print-hidden {
            display: none !important;
          }

          .print-break-inside-avoid {
            break-inside: avoid;
          }

          /* Area da fatura - ocupa toda a página */
          .fatura-print-area {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            min-height: auto !important;
          }

          /* Card da fatura - sem sombra na impressão */
          .fatura-card-print {
            box-shadow: none !important;
            max-width: 100% !important;
            margin: 0 !important;
          }
        }
      `}</style>

      {/* Barra de Ferramentas (fora da fatura, no fundo cinza) */}
      <div className="print-hidden max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => router.back()} className="bg-white">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600 font-medium">
            {fatura.numero_fatura}
          </span>
          <Button onClick={handlePrint} className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90">
            <Printer className="h-4 w-4 mr-2" />
            Imprimir / Salvar PDF
          </Button>
        </div>
      </div>

      {/* Conteudo da Fatura */}
      <div className="min-h-screen bg-slate-100 pb-12 print:pb-0 print:bg-white fatura-print-area">
        <div className="max-w-4xl mx-auto bg-white shadow-lg print:shadow-none print:max-w-none fatura-card-print">
          <div className="p-10">
            {/* Cabeçalho: Logo + Emitente lado a lado */}
            <div className="fatura-header mb-6 flex items-center justify-between gap-8 pb-6 border-b border-slate-200">
              {/* Logo */}
              {escritorio.logo_url && (
                <div className="flex-shrink-0">
                  <img
                    src={escritorio.logo_url}
                    alt={escritorio.nome}
                    className="h-36 max-w-[320px] object-contain"
                  />
                </div>
              )}

              {/* Emitente */}
              <div className="text-right flex-shrink-0">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Emitente
                </h3>
                <p className="text-base font-semibold text-[#34495e]">
                  {escritorio.nome}
                </p>
                {escritorio.cnpj && (
                  <p className="text-sm text-slate-600 mt-0.5">
                    CNPJ: {formatCNPJ(escritorio.cnpj)}
                  </p>
                )}
                {escritorio.endereco && (
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-[280px] ml-auto">
                    {formatEndereco(escritorio.endereco)}
                  </p>
                )}
                {(escritorio.telefone || escritorio.email) && (
                  <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                    {escritorio.telefone && <p>Tel: {escritorio.telefone}</p>}
                    {escritorio.email && <p>{escritorio.email}</p>}
                  </div>
                )}
              </div>
            </div>

            {/* Titulo da Fatura */}
            <div className="bg-gradient-to-r from-[#34495e] to-[#46627f] text-white py-5 px-8 rounded-lg mb-8 text-center">
              <p className="text-sm uppercase tracking-widest text-white/80 mb-1">
                Fatura de Honorarios
              </p>
              <h2 className="text-3xl font-bold tracking-wide text-white">
                {fatura.numero_fatura}
              </h2>
            </div>

            {/* Destinatario e Datas */}
            <div className="grid grid-cols-2 gap-8 mb-8 pb-6 border-b border-slate-200 print-break-inside-avoid">
              {/* Destinatario */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Destinatario
                </h3>
                <p className="text-base font-semibold text-[#34495e]">
                  {cliente.nome_completo}
                </p>
                {cliente.nome_fantasia && (
                  <p className="text-sm text-slate-600">{cliente.nome_fantasia}</p>
                )}
                {cliente.cpf_cnpj && (
                  <p className="text-sm text-slate-600 mt-1">
                    {cliente.tipo_pessoa === 'pf' ? 'CPF' : 'CNPJ'}:{' '}
                    {formatCPFCNPJ(cliente.cpf_cnpj, cliente.tipo_pessoa)}
                  </p>
                )}
                {cliente.logradouro && (
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    {formatEnderecoCliente(cliente)}
                  </p>
                )}
                {cliente.email_principal && (
                  <p className="text-xs text-slate-500 mt-1">
                    {cliente.email_principal}
                  </p>
                )}
              </div>

              {/* Datas */}
              <div className="text-right">
                <div className="mb-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Data de Emissao
                  </p>
                  <p className="text-lg font-semibold text-[#34495e]">
                    {formatBrazilDateLong(fatura.data_emissao)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Data de Vencimento
                  </p>
                  <p className="text-xl font-bold text-[#1E3A8A]">
                    {formatBrazilDateLong(fatura.data_vencimento)}
                  </p>
                </div>
              </div>
            </div>

            {/* Discriminacao dos Servicos */}
            <div className="mb-8 print-break-inside-avoid">
              <h3 className="text-sm font-bold text-[#34495e] uppercase tracking-wide mb-4 pb-2 border-b-2 border-[#89bcbe]">
                Discriminacao dos Servicos
              </h3>

              <table className="w-full">
                <thead>
                  <tr className="bg-slate-100 text-xs font-bold text-slate-600 uppercase">
                    <th className="py-3 px-4 text-left w-[55%]">Descricao</th>
                    <th className="py-3 px-4 text-center w-[15%]">Qtd</th>
                    <th className="py-3 px-4 text-right w-[15%]">Unitario</th>
                    <th className="py-3 px-4 text-right w-[15%]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item, index) => (
                    <tr
                      key={item.id}
                      className={`border-b border-slate-100 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <p className="font-medium text-[#34495e]">{item.descricao}</p>
                        {/* Detalhes do processo */}
                        {(item.processo_numero || item.processo_pasta || item.partes_resumo) && (
                          <div className="mt-1.5 text-xs text-slate-500">
                            {item.processo_numero && (
                              <p>Processo n {item.processo_numero}</p>
                            )}
                            {!item.processo_numero && item.processo_pasta && (
                              <p>Ref: {item.processo_pasta}</p>
                            )}
                            {item.partes_resumo && (
                              <p className="italic">{item.partes_resumo}</p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-600">
                        {item.tipo_item === 'timesheet'
                          ? `${Number(item.quantidade || 0).toFixed(1)}h`
                          : item.tipo_item === 'pasta'
                          ? `${item.quantidade || 0} proc.`
                          : item.quantidade || 1}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600">
                        {item.valor_unitario
                          ? formatCurrency(Number(item.valor_unitario))
                          : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-[#34495e]">
                        {formatCurrency(Number(item.valor_total))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totais */}
            <div className="flex justify-end mb-8 print-break-inside-avoid">
              <div className="w-80 space-y-2">
                {totais.subtotal_honorarios > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Subtotal Honorarios:</span>
                    <span className="font-medium">
                      {formatCurrency(totais.subtotal_honorarios)}
                    </span>
                  </div>
                )}
                {totais.subtotal_horas > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">
                      Subtotal Horas ({totais.soma_horas.toFixed(1)}h):
                    </span>
                    <span className="font-medium">
                      {formatCurrency(totais.subtotal_horas)}
                    </span>
                  </div>
                )}
                {totais.subtotal_despesas > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Subtotal Despesas:</span>
                    <span className="font-medium">
                      {formatCurrency(totais.subtotal_despesas)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-3 border-t-2 border-[#34495e]">
                  <span className="text-lg font-bold text-[#34495e]">VALOR BRUTO:</span>
                  <span className="text-2xl font-bold text-[#1E3A8A]">
                    {formatCurrency(totais.valor_total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Secao de Impostos Retidos */}
            {impostos && impostos.total_retencoes > 0 && (
              <div className="mb-8 print-break-inside-avoid">
                <h3 className="text-sm font-bold text-[#34495e] uppercase tracking-wide mb-4 pb-2 border-b-2 border-amber-400">
                  Impostos Retidos na Fonte
                </h3>

                <div className="grid grid-cols-2 gap-6">
                  {/* Lista de Impostos */}
                  <div className="space-y-2">
                    {impostos.irrf.retido && impostos.irrf.valor > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">
                          IRRF ({impostos.irrf.aliquota.toFixed(2)}%):
                        </span>
                        <span className="font-medium text-amber-700">
                          - {formatCurrency(impostos.irrf.valor)}
                        </span>
                      </div>
                    )}
                    {impostos.pis.retido && impostos.pis.valor > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">
                          PIS ({impostos.pis.aliquota.toFixed(2)}%):
                        </span>
                        <span className="font-medium text-amber-700">
                          - {formatCurrency(impostos.pis.valor)}
                        </span>
                      </div>
                    )}
                    {impostos.cofins.retido && impostos.cofins.valor > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">
                          COFINS ({impostos.cofins.aliquota.toFixed(2)}%):
                        </span>
                        <span className="font-medium text-amber-700">
                          - {formatCurrency(impostos.cofins.valor)}
                        </span>
                      </div>
                    )}
                    {impostos.csll.retido && impostos.csll.valor > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">
                          CSLL ({impostos.csll.aliquota.toFixed(2)}%):
                        </span>
                        <span className="font-medium text-amber-700">
                          - {formatCurrency(impostos.csll.valor)}
                        </span>
                      </div>
                    )}
                    {impostos.iss.retido && impostos.iss.valor > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">
                          ISS ({impostos.iss.aliquota.toFixed(2)}%):
                        </span>
                        <span className="font-medium text-amber-700">
                          - {formatCurrency(impostos.iss.valor)}
                        </span>
                      </div>
                    )}
                    {impostos.inss.retido && impostos.inss.valor > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">
                          INSS ({impostos.inss.aliquota.toFixed(2)}%):
                        </span>
                        <span className="font-medium text-amber-700">
                          - {formatCurrency(impostos.inss.valor)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Resumo */}
                  <div className="flex flex-col justify-between">
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Base de Calculo:</span>
                          <span className="font-medium">{formatCurrency(impostos.base_calculo)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Total Retencoes:</span>
                          <span className="font-semibold text-amber-700">
                            - {formatCurrency(impostos.total_retencoes)}
                          </span>
                        </div>
                        <div className="flex justify-between pt-3 border-t border-slate-200">
                          <span className="font-bold text-[#34495e]">VALOR LIQUIDO:</span>
                          <span className="text-xl font-bold text-emerald-600">
                            {formatCurrency(impostos.valor_liquido)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {regime_tributario_label && (
                      <p className="text-xs text-slate-400 text-right mt-2">
                        Regime: {regime_tributario_label}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Regime Tributario Info (Simples Nacional sem retencoes) */}
            {impostos && impostos.total_retencoes === 0 && regime_tributario_label && (
              <div className="mb-8 p-4 bg-emerald-50 rounded-lg border border-emerald-200 print-break-inside-avoid">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-600 text-sm font-bold">SN</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-emerald-800">
                      Empresa optante pelo {regime_tributario_label}
                    </p>
                    <p className="text-xs text-emerald-600 mt-1">
                      Nao sujeita a retencao de impostos federais na fonte. A tributacao e recolhida mensalmente via DAS (Documento de Arrecadacao do Simples Nacional).
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Observacoes */}
            {fatura.observacoes && (
              <div className="mb-8 p-5 bg-slate-50 rounded-lg border border-slate-200 print-break-inside-avoid">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Observacoes
                </h4>
                <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                  {fatura.observacoes}
                </p>
              </div>
            )}

            {/* Anexo: Relacao de Processos (para itens tipo 'pasta') */}
            {itens
              .filter((item) => item.tipo_item === 'pasta' && item.processos_lista && item.processos_lista.length > 0)
              .map((item, idx) => (
                <div key={`anexo-${idx}`} className="mt-8 pt-8 border-t-2 border-[#34495e] print-break-inside-avoid">
                  <h3 className="text-sm font-bold text-[#34495e] uppercase tracking-wide mb-4 pb-2 border-b-2 border-[#89bcbe]">
                    Anexo: Relacao de Processos - Competencia {item.competencia || 'N/A'}
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Total de {item.processos_lista?.length || 0} processo(s) ativo(s) no periodo
                  </p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-xs font-bold text-slate-600 uppercase">
                        <th className="py-2 px-3 text-left w-[15%]">Pasta</th>
                        <th className="py-2 px-3 text-left w-[30%]">Numero CNJ</th>
                        <th className="py-2 px-3 text-left w-[35%]">Titulo/Partes</th>
                        <th className="py-2 px-3 text-left w-[20%]">Cliente</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.processos_lista?.map((proc, pIdx) => (
                        <tr
                          key={proc.id || pIdx}
                          className={`border-b border-slate-100 ${pIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                        >
                          <td className="py-2 px-3 text-slate-600">{proc.numero_pasta || '-'}</td>
                          <td className="py-2 px-3 text-slate-700 font-mono text-xs">{proc.numero_cnj || '-'}</td>
                          <td className="py-2 px-3 text-slate-600">{proc.titulo || '-'}</td>
                          <td className="py-2 px-3 text-slate-600">{proc.cliente_nome || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}

            {/* Rodape */}
            <footer className="mt-12 pt-4 border-t border-slate-200 text-center">
              <p className="text-xs text-slate-400">
                Documento gerado em {formatBrazilDateTime(new Date())}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Sistema Zyra Legal
              </p>
            </footer>
          </div>
        </div>
      </div>
    </>
  )
}
