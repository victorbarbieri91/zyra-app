'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Printer, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFaturaImpressao, FaturaImpressaoData } from '@/hooks/useFaturaImpressao'
import { formatBrazilDateLong, formatBrazilDateTime } from '@/lib/timezone'
import { formatHoras } from '@/lib/utils'

export default function FaturaImprimirPage() {
  const params = useParams()
  const router = useRouter()
  const faturaId = params.id as string

  const { loading, error, loadFaturaCompleta } = useFaturaImpressao()
  const [dados, setDados] = useState<FaturaImpressaoData | null>(null)
  const [tentouCarregar, setTentouCarregar] = useState(false)

  useEffect(() => {
    if (faturaId) {
      loadFaturaCompleta(faturaId).then((result) => {
        setDados(result)
        setTentouCarregar(true)
      })
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

  // Mostra loading enquanto carrega OU enquanto ainda nao tentou carregar
  if (loading || !tentouCarregar) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-200">
        <div className="text-center">
          <Loader2 className="h-8 w-8 mx-auto text-slate-400 animate-spin mb-3" />
          <p className="text-sm text-slate-600">Carregando fatura...</p>
        </div>
      </div>
    )
  }

  // So mostra erro DEPOIS de ter tentado carregar e falhou
  if (error || !dados) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-200">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg">
          <FileText className="h-12 w-12 mx-auto text-slate-300 mb-3" />
          <p className="text-lg font-medium text-slate-700 mb-1">Fatura nao encontrada</p>
          <p className="text-sm text-slate-500 mb-4">{error || 'Nao foi possivel carregar os dados da fatura.'}</p>
          <Button variant="outline" onClick={() => window.close()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Fechar
          </Button>
        </div>
      </div>
    )
  }

  const { escritorio, fatura, cliente, itens, totais } = dados

  return (
    <>
      {/* CSS de Impressao */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 0.5cm 0.8cm;
            size: A4;
          }

          /* Remove cabecalho e rodape do navegador */
          html {
            margin: 0;
            padding: 0;
          }

          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0;
            padding: 0;
            font-size: 11pt !important;
          }

          /* Esconde a barra de ferramentas na impressao */
          .print-hidden {
            display: none !important;
          }

          /* Fundo branco na impressao */
          .print-bg-white {
            background: white !important;
            padding: 0 !important;
            min-height: auto !important;
          }

          /* Card sem sombra e sem margens na impressao */
          .print-card {
            box-shadow: none !important;
            margin: 0 !important;
            max-width: 100% !important;
            border-radius: 0 !important;
            padding: 0 !important;
          }

          .print-break-inside-avoid {
            break-inside: avoid;
          }

          /* Reducao de tamanhos para impressao */
          .print-logo {
            max-height: 60px !important;
            max-width: 180px !important;
          }

          .print-title-box {
            padding: 0.6rem 1.5rem !important;
            margin-bottom: 1rem !important;
          }

          .print-title-small {
            font-size: 10pt !important;
          }

          .print-title-main {
            font-size: 16pt !important;
          }

          .print-section {
            margin-bottom: 0.8rem !important;
            padding-bottom: 0.5rem !important;
          }

          .print-header-section {
            margin-bottom: 0.6rem !important;
            padding-bottom: 0.5rem !important;
          }

          .print-text-base {
            font-size: 10pt !important;
          }

          .print-text-sm {
            font-size: 9pt !important;
          }

          .print-text-xs {
            font-size: 8pt !important;
          }

          .print-text-lg {
            font-size: 11pt !important;
          }

          .print-text-xl {
            font-size: 12pt !important;
          }

          .print-text-2xl {
            font-size: 14pt !important;
          }

          .print-compact-table th,
          .print-compact-table td {
            padding: 0.4rem 0.5rem !important;
            font-size: 9pt !important;
          }

          .print-totals {
            width: 220px !important;
          }

          .print-totals-item {
            font-size: 9pt !important;
          }

          .print-totals-main {
            font-size: 11pt !important;
          }

          .print-totals-value {
            font-size: 13pt !important;
          }

          .print-obs {
            padding: 0.5rem !important;
            margin-bottom: 0.5rem !important;
          }

          .print-footer {
            margin-top: 0.5rem !important;
            padding-top: 0.3rem !important;
          }

          .print-footer p {
            font-size: 7pt !important;
          }
        }

        /* Estilo para visualizacao na tela (simula papel) */
        @media screen {
          .paper-preview {
            background: white;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05);
            border-radius: 4px;
          }
        }
      `}</style>

      {/* Container principal - fundo cinza escuro para contraste */}
      <div className="min-h-screen bg-slate-300 print-bg-white">
        {/* Barra de Ferramentas (nao imprime) */}
        <div className="print-hidden sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => window.close()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Fechar
            </Button>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600 font-medium">
                {fatura.numero_fatura}
              </span>
              <Button onClick={handlePrint} className="bg-[#34495e] hover:bg-[#46627f] text-white">
                <Printer className="h-4 w-4 mr-2" />
                Imprimir / Salvar PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Area do Papel */}
        <div className="py-8 px-4 print:py-0 print:px-0">
          <div className="max-w-4xl mx-auto paper-preview print-card">
            <div className="p-10 print:p-4">
              {/* Cabecalho: Logo + Emitente lado a lado */}
              <div className="mb-6 print-header-section flex items-center justify-between gap-8 pb-4 border-b border-slate-200">
                {/* Logo */}
                {escritorio.logo_url && (
                  <div className="flex-shrink-0">
                    <img
                      src={escritorio.logo_url}
                      alt={escritorio.nome}
                      className="h-32 max-w-[280px] object-contain print-logo"
                    />
                  </div>
                )}

                {/* Emitente */}
                <div className="text-right flex-shrink-0">
                  <h3 className="text-xs print-text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                    Emitente
                  </h3>
                  <p className="text-base print-text-base font-semibold text-[#34495e]">
                    {escritorio.nome}
                  </p>
                  {escritorio.cnpj && (
                    <p className="text-sm print-text-sm text-slate-600 mt-0.5">
                      CNPJ: {formatCNPJ(escritorio.cnpj)}
                    </p>
                  )}
                  {escritorio.endereco && (
                    <p className="text-xs print-text-xs text-slate-500 mt-1 leading-relaxed max-w-[280px] ml-auto">
                      {formatEndereco(escritorio.endereco)}
                    </p>
                  )}
                  {(escritorio.telefone || escritorio.email) && (
                    <div className="text-xs print-text-xs text-slate-500 mt-0.5 space-y-0">
                      {escritorio.telefone && <p>Tel: {escritorio.telefone}</p>}
                      {escritorio.email && <p>{escritorio.email}</p>}
                    </div>
                  )}
                </div>
              </div>

              {/* Titulo da Fatura */}
              <div className="bg-gradient-to-r from-[#34495e] to-[#46627f] text-white py-5 px-8 print-title-box rounded-lg mb-8 print-section text-center">
                <p className="text-sm print-title-small uppercase tracking-widest text-white/80 mb-1">
                  Fatura de Honorarios
                </p>
                <h2 className="text-3xl print-title-main font-bold tracking-wide text-white">
                  {fatura.numero_fatura}
                </h2>
              </div>

              {/* Destinatario e Datas */}
              <div className="grid grid-cols-2 gap-8 mb-8 print-section pb-4 border-b border-slate-200 print-break-inside-avoid">
                {/* Destinatario */}
                <div>
                  <h3 className="text-xs print-text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                    Destinatario
                  </h3>
                  <p className="text-base print-text-base font-semibold text-[#34495e]">
                    {cliente.nome_completo}
                  </p>
                  {cliente.nome_fantasia && (
                    <p className="text-sm print-text-sm text-slate-600">{cliente.nome_fantasia}</p>
                  )}
                  {cliente.cpf_cnpj && (
                    <p className="text-sm print-text-sm text-slate-600 mt-0.5">
                      {cliente.tipo_pessoa === 'pf' ? 'CPF' : 'CNPJ'}:{' '}
                      {formatCPFCNPJ(cliente.cpf_cnpj, cliente.tipo_pessoa)}
                    </p>
                  )}
                  {cliente.logradouro && (
                    <p className="text-xs print-text-xs text-slate-500 mt-1 leading-relaxed">
                      {formatEnderecoCliente(cliente)}
                    </p>
                  )}
                  {cliente.email_principal && (
                    <p className="text-xs print-text-xs text-slate-500 mt-0.5">
                      {cliente.email_principal}
                    </p>
                  )}
                </div>

                {/* Datas */}
                <div className="text-right">
                  <div className="mb-3">
                    <p className="text-xs print-text-xs font-bold text-slate-500 uppercase tracking-wide">
                      Data de Emissao
                    </p>
                    <p className="text-lg print-text-lg font-semibold text-[#34495e]">
                      {formatBrazilDateLong(fatura.data_emissao)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs print-text-xs font-bold text-slate-500 uppercase tracking-wide">
                      Data de Vencimento
                    </p>
                    <p className="text-xl print-text-xl font-bold text-[#1E3A8A]">
                      {formatBrazilDateLong(fatura.data_vencimento)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Discriminacao dos Servicos */}
              <div className="mb-6 print-section print-break-inside-avoid">
                <h3 className="text-sm print-text-sm font-bold text-[#34495e] uppercase tracking-wide mb-3 pb-1 border-b-2 border-[#89bcbe]">
                  Discriminacao dos Servicos
                </h3>

                <table className="w-full print-compact-table">
                  <thead>
                    <tr className="bg-slate-100 text-xs print-text-xs font-bold text-slate-600 uppercase">
                      <th className="py-2 px-3 text-left w-[55%]">Descricao</th>
                      <th className="py-2 px-3 text-center w-[15%]">Qtd</th>
                      <th className="py-2 px-3 text-right w-[15%]">Unitario</th>
                      <th className="py-2 px-3 text-right w-[15%]">Total</th>
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
                        <td className="py-2 px-3">
                          <p className="font-medium text-[#34495e] print-text-sm">{item.descricao}</p>
                          {/* Detalhes do processo */}
                          {(item.processo_numero || item.processo_pasta || item.partes_resumo) && (
                            <div className="mt-1 text-xs print-text-xs text-slate-500">
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
                        <td className="py-2 px-3 text-center text-slate-600 print-text-sm">
                          {item.tipo_item === 'timesheet'
                            ? formatHoras(Number(item.quantidade || 0), 'curto')
                            : item.quantidade || 1}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-600 print-text-sm">
                          {item.valor_unitario
                            ? formatCurrency(Number(item.valor_unitario))
                            : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-[#34495e] print-text-sm">
                          {formatCurrency(Number(item.valor_total))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totais */}
              <div className="flex justify-end mb-6 print-section print-break-inside-avoid">
                <div className="w-80 print-totals space-y-1">
                  {totais.subtotal_honorarios > 0 && (
                    <div className="flex justify-between text-sm print-totals-item">
                      <span className="text-slate-600">Subtotal Honorarios:</span>
                      <span className="font-medium">
                        {formatCurrency(totais.subtotal_honorarios)}
                      </span>
                    </div>
                  )}
                  {totais.subtotal_horas > 0 && (
                    <div className="flex justify-between text-sm print-totals-item">
                      <span className="text-slate-600">
                        Subtotal Horas ({formatHoras(totais.soma_horas, 'curto')}):
                      </span>
                      <span className="font-medium">
                        {formatCurrency(totais.subtotal_horas)}
                      </span>
                    </div>
                  )}
                  {totais.subtotal_despesas > 0 && (
                    <div className="flex justify-between text-sm print-totals-item">
                      <span className="text-slate-600">Subtotal Despesas:</span>
                      <span className="font-medium">
                        {formatCurrency(totais.subtotal_despesas)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t-2 border-[#34495e]">
                    <span className="text-lg print-totals-main font-bold text-[#34495e]">VALOR TOTAL:</span>
                    <span className="text-2xl print-totals-value font-bold text-[#1E3A8A]">
                      {formatCurrency(totais.valor_total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Observacoes */}
              {fatura.observacoes && (
                <div className="mb-6 print-obs p-4 bg-slate-50 rounded-lg border border-slate-200 print-break-inside-avoid">
                  <h4 className="text-xs print-text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                    Observacoes
                  </h4>
                  <p className="text-sm print-text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                    {fatura.observacoes}
                  </p>
                </div>
              )}

              {/* Rodape */}
              <footer className="mt-8 print-footer pt-3 border-t border-slate-200 text-center">
                <p className="text-xs print-text-xs text-slate-400">
                  Documento gerado em {formatBrazilDateTime(new Date())}
                </p>
                <p className="text-xs print-text-xs text-slate-400 mt-0.5">
                  Sistema Zyra Legal
                </p>
              </footer>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
