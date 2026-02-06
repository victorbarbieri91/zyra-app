'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Printer, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFaturaImpressao, FaturaImpressaoData, ItemFaturaImpressao } from '@/hooks/useFaturaImpressao'
import { formatBrazilDateLong, formatBrazilDateTime, formatBrazilDate } from '@/lib/timezone'
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

  // Separar itens por tipo
  const timesheetItens = itens.filter(i => i.tipo_item === 'timesheet')
  const nonTimesheetItens = itens.filter(i => i.tipo_item !== 'timesheet')
  const hasTimesheet = timesheetItens.length > 0

  // Calcular dados consolidados do timesheet
  const timesheetDatas = timesheetItens
    .map(i => i.data_trabalho)
    .filter(Boolean)
    .sort() as string[]
  const periodoInicio = timesheetDatas[0] || null
  const periodoFim = timesheetDatas[timesheetDatas.length - 1] || null
  const totalHorasTimesheet = timesheetItens.reduce((sum, i) => sum + Number(i.quantidade || 0), 0)
  const totalValorTimesheet = timesheetItens.reduce((sum, i) => sum + Number(i.valor_total), 0)

  // Ordenar timesheet por data para o anexo
  const timesheetOrdenado = [...timesheetItens].sort((a, b) => {
    if (!a.data_trabalho && !b.data_trabalho) return 0
    if (!a.data_trabalho) return 1
    if (!b.data_trabalho) return -1
    return a.data_trabalho.localeCompare(b.data_trabalho)
  })

  // Total de itens na tabela principal (não-timesheet + 1 consolidado se tiver timesheet)
  const totalLinhasTabela = nonTimesheetItens.length + (hasTimesheet ? 1 : 0)

  // Montar itens para a tabela principal (não-timesheet individuais + timesheet consolidado)
  const renderMainTableItems = () => {
    const rows: React.ReactElement[] = []
    let rowIndex = 0

    // Itens não-timesheet (honorários, despesas, etc.) - individuais
    nonTimesheetItens.forEach((item) => {
      const idx = rowIndex++
      rows.push(
        <tr
          key={item.id}
          className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
        >
          <td className="py-1.5 px-2">
            <p className="text-[11px] font-medium text-[#34495e] leading-snug">{item.descricao}</p>
            {item.caso_titulo && (
              <p className="mt-0.5 text-[10px] text-slate-400 italic leading-snug">
                {item.caso_titulo}
              </p>
            )}
          </td>
          <td className="py-1.5 px-2 text-center text-[11px] text-slate-600">
            {item.tipo_item === 'pasta'
              ? (item.quantidade ? `${item.quantidade} proc.` : 1)
              : (item.quantidade || 1)}
          </td>
          <td className="py-1.5 px-2 text-right text-[11px] font-semibold text-[#34495e]">
            {formatCurrency(Number(item.valor_total))}
          </td>
        </tr>
      )
    })

    // Linha consolidada de timesheet
    if (hasTimesheet) {
      const idx = rowIndex++
      const descricaoConsolidada = periodoInicio && periodoFim
        ? `Timesheet - Horas trabalhadas`
        : 'Timesheet - Horas trabalhadas'
      const periodoTexto = periodoInicio && periodoFim
        ? `Período: ${formatBrazilDate(periodoInicio)} a ${formatBrazilDate(periodoFim)}`
        : null

      rows.push(
        <tr
          key="timesheet-consolidado"
          className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
        >
          <td className="py-1.5 px-2">
            <p className="text-[11px] font-medium text-[#34495e] leading-snug">{descricaoConsolidada}</p>
            {periodoTexto && (
              <p className="text-[10px] text-slate-500 leading-snug">
                {periodoTexto}
              </p>
            )}
            <p className="text-[10px] text-slate-400 italic leading-snug">
              (Ver Anexo - Detalhamento de Horas)
            </p>
          </td>
          <td className="py-1.5 px-2 text-center text-[11px] text-slate-600">
            {formatHoras(totalHorasTimesheet, 'curto')}
          </td>
          <td className="py-1.5 px-2 text-right text-[11px] font-semibold text-[#34495e]">
            {formatCurrency(totalValorTimesheet)}
          </td>
        </tr>
      )
    }

    return rows
  }

  return (
    <>
      {/* CSS de Impressao */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 0.5cm 0.8cm;
            size: A4;
          }

          html {
            margin: 0;
            padding: 0;
          }

          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0;
            padding: 0;
            font-size: 9pt !important;
          }

          .print-hidden {
            display: none !important;
          }

          .print-bg-white {
            background: white !important;
            padding: 0 !important;
            min-height: auto !important;
          }

          .print-card {
            box-shadow: none !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            border-radius: 0 !important;
            padding: 0 !important;
            min-height: auto !important;
          }

          .print-break-inside-avoid {
            break-inside: avoid;
          }

          .print-page-break-before {
            page-break-before: always;
            break-before: page;
          }

          .print-logo {
            max-height: 50px !important;
            max-width: 160px !important;
          }

          .print-title-box {
            padding: 0.4rem 1rem !important;
            margin-bottom: 0.6rem !important;
          }

          .print-title-small {
            font-size: 7pt !important;
          }

          .print-title-main {
            font-size: 13pt !important;
          }

          .print-section {
            margin-bottom: 0.5rem !important;
            padding-bottom: 0.3rem !important;
          }

          .print-header-section {
            margin-bottom: 0.4rem !important;
            padding-bottom: 0.3rem !important;
          }

          .print-text-base {
            font-size: 8.5pt !important;
          }

          .print-text-sm {
            font-size: 8pt !important;
          }

          .print-text-xs {
            font-size: 7pt !important;
          }

          .print-text-lg {
            font-size: 9pt !important;
          }

          .print-text-xl {
            font-size: 10pt !important;
          }

          .print-text-2xl {
            font-size: 11pt !important;
          }

          .print-compact-table th,
          .print-compact-table td {
            padding: 0.2rem 0.3rem !important;
            font-size: 8pt !important;
          }

          .print-totals {
            width: 200px !important;
          }

          .print-totals-item {
            font-size: 8pt !important;
          }

          .print-totals-main {
            font-size: 9pt !important;
          }

          .print-totals-value {
            font-size: 11pt !important;
          }

          .print-obs {
            padding: 0.4rem !important;
            margin-bottom: 0.4rem !important;
          }

          .print-footer {
            margin-top: 0.3rem !important;
            padding-top: 0.2rem !important;
          }

          .print-footer p {
            font-size: 6.5pt !important;
          }

          /* Anexo de horas */
          .print-anexo-table th,
          .print-anexo-table td {
            padding: 0.15rem 0.3rem !important;
            font-size: 7pt !important;
          }

          .print-anexo-title {
            font-size: 9pt !important;
            padding: 0.3rem 0.8rem !important;
          }

          .print-anexo-subtitle {
            font-size: 7pt !important;
          }
        }

        @media screen {
          .paper-preview {
            background: white;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05);
            border-radius: 4px;
            width: 210mm;
            min-height: 297mm;
            margin-left: auto;
            margin-right: auto;
          }
        }
      `}</style>

      {/* Container principal */}
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
          <div className="paper-preview print-card">
            <div className="p-8 print:p-4 flex flex-col min-h-[inherit]">
              {/* Cabecalho: Logo + Emitente */}
              <div className="mb-6 print-header-section flex items-center justify-between gap-6 pb-4 border-b border-slate-200">
                {escritorio.logo_url && (
                  <div className="flex-shrink-0">
                    <img
                      src={escritorio.logo_url}
                      alt={escritorio.nome}
                      className="h-32 max-w-[280px] object-contain print-logo"
                    />
                  </div>
                )}
                <div className="text-right flex-shrink-0">
                  <h3 className="text-[10px] print-text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">
                    Emitente
                  </h3>
                  <p className="text-sm print-text-base font-semibold text-[#34495e]">
                    {escritorio.nome}
                  </p>
                  {escritorio.cnpj && (
                    <p className="text-xs print-text-sm text-slate-600 mt-0.5">
                      CNPJ: {formatCNPJ(escritorio.cnpj)}
                    </p>
                  )}
                  {escritorio.endereco && (
                    <p className="text-[10px] print-text-xs text-slate-500 mt-0.5 leading-relaxed max-w-[260px] ml-auto">
                      {formatEndereco(escritorio.endereco)}
                    </p>
                  )}
                  {(escritorio.telefone || escritorio.email) && (
                    <div className="text-[10px] print-text-xs text-slate-500 mt-0.5 space-y-0">
                      {escritorio.telefone && <p>Tel: {escritorio.telefone}</p>}
                      {escritorio.email && <p>{escritorio.email}</p>}
                    </div>
                  )}
                </div>
              </div>

              {/* Titulo da Fatura */}
              <div className="bg-gradient-to-r from-[#34495e] to-[#46627f] text-white py-3 px-6 print-title-box rounded-lg mb-7 print-section text-center">
                <p className="text-[10px] print-title-small uppercase tracking-widest text-white/80 mb-0.5">
                  Fatura de Honorarios
                </p>
                <h2 className="text-2xl print-title-main font-bold tracking-wide text-white">
                  {fatura.numero_fatura}
                </h2>
              </div>

              {/* Destinatario e Datas */}
              <div className="grid grid-cols-2 gap-6 mb-7 print-section pb-4 border-b border-slate-200 print-break-inside-avoid">
                <div>
                  <h3 className="text-[10px] print-text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">
                    Destinatario
                  </h3>
                  <p className="text-sm print-text-base font-semibold text-[#34495e]">
                    {cliente.nome_completo}
                  </p>
                  {cliente.nome_fantasia && (
                    <p className="text-xs print-text-sm text-slate-600">{cliente.nome_fantasia}</p>
                  )}
                  {cliente.cpf_cnpj && (
                    <p className="text-xs print-text-sm text-slate-600 mt-0.5">
                      {cliente.tipo_pessoa === 'pf' ? 'CPF' : 'CNPJ'}:{' '}
                      {formatCPFCNPJ(cliente.cpf_cnpj, cliente.tipo_pessoa)}
                    </p>
                  )}
                  {cliente.logradouro && (
                    <p className="text-[10px] print-text-xs text-slate-500 mt-0.5 leading-relaxed">
                      {formatEnderecoCliente(cliente)}
                    </p>
                  )}
                  {cliente.email_principal && (
                    <p className="text-[10px] print-text-xs text-slate-500 mt-0.5">
                      {cliente.email_principal}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="mb-2">
                    <p className="text-[10px] print-text-xs font-bold text-slate-400 uppercase tracking-wide">
                      Data de Emissao
                    </p>
                    <p className="text-sm print-text-lg font-semibold text-[#34495e]">
                      {formatBrazilDateLong(fatura.data_emissao)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] print-text-xs font-bold text-slate-400 uppercase tracking-wide">
                      Data de Vencimento
                    </p>
                    <p className="text-base print-text-xl font-bold text-[#1E3A8A]">
                      {formatBrazilDateLong(fatura.data_vencimento)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Discriminacao dos Servicos */}
              <div className="mb-2 print-section print-break-inside-avoid">
                <h3 className="text-xs print-text-sm font-bold text-[#34495e] uppercase tracking-wide mb-3 pb-1 border-b-2 border-[#89bcbe]">
                  Discriminacao dos Servicos
                </h3>

                <table className="w-full print-compact-table">
                  <thead>
                    <tr className="bg-slate-100 text-[10px] print-text-xs font-bold text-slate-500 uppercase">
                      <th className="py-1.5 px-2 text-left w-[65%]">Descricao</th>
                      <th className="py-1.5 px-2 text-center w-[15%]">Qtd</th>
                      <th className="py-1.5 px-2 text-right w-[20%]">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {renderMainTableItems()}
                  </tbody>
                </table>
              </div>

              {/* Espaço reservado - garante respiro entre itens e total quando poucos itens */}
              {totalLinhasTabela <= 5 && (
                <div className="min-h-[140px] print:min-h-[100px]" />
              )}

              {/* Totais */}
              <div className="flex justify-end mb-6 print-section print-break-inside-avoid">
                <div className="w-64 print-totals space-y-0.5">
                  {totais.subtotal_honorarios > 0 && (
                    <div className="flex justify-between text-xs print-totals-item">
                      <span className="text-slate-500">Subtotal Honorarios:</span>
                      <span className="font-medium text-slate-700">
                        {formatCurrency(totais.subtotal_honorarios)}
                      </span>
                    </div>
                  )}
                  {totais.subtotal_horas > 0 && (
                    <div className="flex justify-between text-xs print-totals-item">
                      <span className="text-slate-500">
                        Subtotal Horas ({formatHoras(totais.soma_horas, 'curto')}):
                      </span>
                      <span className="font-medium text-slate-700">
                        {formatCurrency(totais.subtotal_horas)}
                      </span>
                    </div>
                  )}
                  {totais.subtotal_despesas > 0 && (
                    <div className="flex justify-between text-xs print-totals-item">
                      <span className="text-slate-500">Subtotal Despesas:</span>
                      <span className="font-medium text-slate-700">
                        {formatCurrency(totais.subtotal_despesas)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline pt-2 mt-1 border-t-2 border-[#34495e]">
                    <span className="text-sm print-totals-main font-bold text-[#34495e] uppercase">Valor Total:</span>
                    <span className="text-xl print-totals-value font-bold text-[#1E3A8A]">
                      {formatCurrency(totais.valor_total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Observacoes */}
              {fatura.observacoes && (
                <div className="mb-4 print-obs p-3 bg-slate-50 rounded-lg border border-slate-200 print-break-inside-avoid">
                  <h4 className="text-[10px] print-text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">
                    Observacoes
                  </h4>
                  <p className="text-xs print-text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                    {fatura.observacoes}
                  </p>
                </div>
              )}

              {/* Spacer para empurrar rodapé para o final da página A4 */}
              <div className="flex-1" />

              {/* Rodape */}
              <footer className="mt-6 print-footer pt-2 border-t border-slate-200 text-center">
                <p className="text-[10px] print-text-xs text-slate-400">
                  Documento gerado em {formatBrazilDateTime(new Date())}
                </p>
                <p className="text-[10px] print-text-xs text-slate-400 mt-0.5">
                  Sistema Zyra Legal
                </p>
              </footer>
            </div>
          </div>

          {/* ============================================ */}
          {/* ANEXO - DETALHAMENTO DE HORAS TRABALHADAS */}
          {/* ============================================ */}
          {hasTimesheet && (
            <div className="paper-preview print-card mt-8 print:mt-0 print-page-break-before">
              <div className="p-8 print:p-4 flex flex-col min-h-[inherit]">
                {/* Header do Anexo */}
                <div className="bg-gradient-to-r from-[#34495e] to-[#46627f] text-white py-3 px-5 print-anexo-title rounded-lg mb-4 text-center">
                  <p className="text-[10px] print-text-xs uppercase tracking-widest text-white/80 mb-0.5">
                    Anexo - Detalhamento de Horas Trabalhadas
                  </p>
                  <p className="text-sm print-anexo-subtitle font-semibold text-white">
                    {fatura.numero_fatura}
                    {periodoInicio && periodoFim && (
                      <span className="font-normal text-white/80">
                        {' '}| Periodo: {formatBrazilDate(periodoInicio)} a {formatBrazilDate(periodoFim)}
                      </span>
                    )}
                  </p>
                </div>

                {/* Info do cliente no anexo */}
                <div className="mb-3 pb-2 border-b border-slate-200">
                  <p className="text-[10px] print-text-xs text-slate-500">
                    Cliente: <span className="font-semibold text-[#34495e]">{cliente.nome_completo}</span>
                  </p>
                </div>

                {/* Tabela de Detalhamento */}
                <table className="w-full print-anexo-table">
                  <thead>
                    <tr className="bg-slate-100 text-[9px] print-text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-1.5 px-1.5 text-left w-[9%]">Data</th>
                      <th className="py-1.5 px-1.5 text-left w-[32%]">Descricao</th>
                      <th className="py-1.5 px-1.5 text-left w-[22%]">Caso</th>
                      <th className="py-1.5 px-1.5 text-center w-[7%]">Horas</th>
                      <th className="py-1.5 px-1.5 text-left w-[18%]">Profissional</th>
                      <th className="py-1.5 px-1.5 text-right w-[12%]">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timesheetOrdenado.map((item, index) => (
                      <tr
                        key={item.id}
                        className={`border-b border-slate-100 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                        }`}
                      >
                        {/* Data */}
                        <td className="py-1 px-1.5 text-[10px] print-text-xs text-slate-600 align-top whitespace-nowrap">
                          {item.data_trabalho
                            ? formatBrazilDate(item.data_trabalho)
                            : '-'}
                        </td>

                        {/* Descrição */}
                        <td className="py-1 px-1.5 align-top">
                          <p className="text-[10px] print-text-xs text-[#34495e] leading-snug">
                            {item.descricao}
                          </p>
                        </td>

                        {/* Caso (título) */}
                        <td className="py-1 px-1.5 align-top">
                          {item.caso_titulo ? (
                            <p className="text-[10px] print-text-xs text-slate-500 leading-snug">
                              {item.caso_titulo}
                            </p>
                          ) : (
                            <p className="text-[10px] print-text-xs text-slate-300">-</p>
                          )}
                        </td>

                        {/* Horas */}
                        <td className="py-1 px-1.5 text-center text-[10px] print-text-xs text-slate-600 font-medium align-top whitespace-nowrap">
                          {item.quantidade
                            ? formatHoras(Number(item.quantidade), 'curto')
                            : '-'}
                        </td>

                        {/* Profissional */}
                        <td className="py-1 px-1.5 align-top">
                          {item.profissional_nome ? (
                            <div>
                              <p className="text-[10px] print-text-xs text-slate-700 leading-snug">
                                {item.profissional_nome}
                              </p>
                              {item.cargo_nome && (
                                <p className="text-[9px] print-text-xs text-slate-400 leading-snug">
                                  {item.cargo_nome}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-[10px] print-text-xs text-slate-300">-</p>
                          )}
                        </td>

                        {/* Valor */}
                        <td className="py-1 px-1.5 text-right text-[10px] print-text-xs font-semibold text-[#34495e] align-top whitespace-nowrap">
                          {formatCurrency(Number(item.valor_total))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totais do Anexo */}
                <div className="mt-3 pt-2 border-t-2 border-[#34495e]">
                  <div className="flex justify-end">
                    <div className="w-56 space-y-0.5">
                      <div className="flex justify-between text-xs print-text-sm">
                        <span className="font-bold text-[#34495e] uppercase">Total de Horas:</span>
                        <span className="font-bold text-[#34495e]">
                          {formatHoras(totalHorasTimesheet, 'curto')}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline text-xs print-text-sm">
                        <span className="font-bold text-[#34495e] uppercase">Valor Total:</span>
                        <span className="font-bold text-[#1E3A8A] text-sm">
                          {formatCurrency(totalValorTimesheet)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Spacer para empurrar rodapé para o final da página A4 */}
                <div className="flex-1" />

                {/* Rodapé do Anexo */}
                <footer className="mt-6 print-footer pt-2 border-t border-slate-200 text-center">
                  <p className="text-[10px] print-text-xs text-slate-400">
                    Anexo da Fatura {fatura.numero_fatura} - {escritorio.nome}
                  </p>
                  <p className="text-[10px] print-text-xs text-slate-400 mt-0.5">
                    Documento gerado em {formatBrazilDateTime(new Date())} - Sistema Zyra Legal
                  </p>
                </footer>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
