'use client';

import { useState, useEffect } from 'react';
import {
  RegimeTributario,
  ConfiguracaoFiscal as ConfiguracaoFiscalType,
  ImpostosLucroPresumido,
  ALIQUOTAS_LUCRO_PRESUMIDO,
  FAIXAS_SIMPLES_ANEXO_IV,
  REGIME_TRIBUTARIO_LABELS,
  calcularAliquotaEfetivaSimplesNacional,
} from '@/types/escritorio';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Calculator,
  Building2,
  Percent,
  Info,
  FileText,
  Receipt,
  HelpCircle,
} from 'lucide-react';

interface ConfiguracaoFiscalProps {
  value: ConfiguracaoFiscalType | null;
  onChange: (config: ConfiguracaoFiscalType) => void;
}

const defaultConfig: ConfiguracaoFiscalType = {
  regime_tributario: 'lucro_presumido',
  lucro_presumido: {
    impostos: ALIQUOTAS_LUCRO_PRESUMIDO,
    percentual_presuncao: 32,
  },
  simples_nacional: {
    anexo: 'IV',
    faixa_atual: 1,
    aliquota_efetiva: 4.5,
    rbt12: 0,
    inss_patronal_separado: true,
  },
  exibir_impostos_fatura: true,
};

export function ConfiguracaoFiscal({ value, onChange }: ConfiguracaoFiscalProps) {
  const [config, setConfig] = useState<ConfiguracaoFiscalType>(value || defaultConfig);

  useEffect(() => {
    if (value) {
      setConfig(value);
    }
  }, [value]);

  const updateConfig = (updates: Partial<ConfiguracaoFiscalType>) => {
    const newConfig = { ...config, ...updates };
    console.log('=== CONFIG UPDATED ===');
    console.log('updates:', JSON.stringify(updates, null, 2));
    console.log('newConfig:', JSON.stringify(newConfig, null, 2));
    setConfig(newConfig);
    onChange(newConfig);
  };

  const updateImposto = (
    imposto: keyof ImpostosLucroPresumido,
    field: 'ativo' | 'aliquota' | 'retido_na_fonte',
    value: boolean | number
  ) => {
    const currentImpostos = config.lucro_presumido?.impostos || ALIQUOTAS_LUCRO_PRESUMIDO;
    const newImpostos = {
      ...currentImpostos,
      [imposto]: {
        ...currentImpostos[imposto],
        [field]: value,
      },
    };
    updateConfig({
      lucro_presumido: {
        ...config.lucro_presumido,
        impostos: newImpostos,
        percentual_presuncao: config.lucro_presumido?.percentual_presuncao || 32,
      },
    });
  };

  const updateSimplesNacional = (rbt12: number) => {
    const { faixa, aliquota_efetiva } = calcularAliquotaEfetivaSimplesNacional(rbt12);
    updateConfig({
      simples_nacional: {
        ...config.simples_nacional,
        anexo: 'IV',
        rbt12,
        faixa_atual: faixa,
        aliquota_efetiva,
        inss_patronal_separado: true,
      },
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const impostos = config.lucro_presumido?.impostos || ALIQUOTAS_LUCRO_PRESUMIDO;

  // Calcular total de retenções para Lucro Presumido
  const totalRetencoes = Object.values(impostos)
    .filter((imp) => imp.ativo && imp.retido_na_fonte)
    .reduce((sum, imp) => sum + imp.aliquota, 0);

  return (
    <div className="space-y-4">
      {/* Seleção do Regime Tributário */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-[#34495e] flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#89bcbe]" />
          Regime Tributário
        </Label>
        <Select
          value={config.regime_tributario}
          onValueChange={(value: RegimeTributario) => {
            // Garantir que os objetos de regime estejam inicializados ao trocar
            const updates: Partial<ConfiguracaoFiscalType> = { regime_tributario: value };

            if (value === 'simples_nacional' && !config.simples_nacional) {
              updates.simples_nacional = {
                anexo: 'IV',
                faixa_atual: 1,
                aliquota_efetiva: 4.5,
                rbt12: 0,
                inss_patronal_separado: true,
              };
            }

            if (value === 'lucro_presumido' && !config.lucro_presumido) {
              updates.lucro_presumido = {
                impostos: ALIQUOTAS_LUCRO_PRESUMIDO,
                percentual_presuncao: 32,
              };
            }

            updateConfig(updates);
          }}
        >
          <SelectTrigger className="border-slate-200">
            <SelectValue placeholder="Selecione o regime" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lucro_presumido">
              <div className="flex items-center gap-2">
                <span>Lucro Presumido</span>
                <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700">
                  Comum
                </Badge>
              </div>
            </SelectItem>
            <SelectItem value="simples_nacional">
              <div className="flex items-center gap-2">
                <span>Simples Nacional</span>
                <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700">
                  MEI/PE
                </Badge>
              </div>
            </SelectItem>
            <SelectItem value="lucro_real">Lucro Real</SelectItem>
            <SelectItem value="mei">MEI</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Configurações específicas por regime */}
      {config.regime_tributario === 'lucro_presumido' && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Impostos e Retenções
            </p>
            <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700">
              Total Retenções: {totalRetencoes.toFixed(2)}%
            </Badge>
          </div>

          <div className="space-y-3">
            {/* IRRF */}
            <ImpostoRow
              label="IRRF"
              tooltip="Imposto de Renda Retido na Fonte - 1,5% para serviços profissionais"
              imposto={impostos.irrf}
              onToggle={(v) => updateImposto('irrf', 'ativo', v)}
              onAliquotaChange={(v) => updateImposto('irrf', 'aliquota', v)}
              onRetidoChange={(v) => updateImposto('irrf', 'retido_na_fonte', v)}
            />

            {/* PIS */}
            <ImpostoRow
              label="PIS"
              tooltip="Programa de Integração Social - 0,65% no regime cumulativo"
              imposto={impostos.pis}
              onToggle={(v) => updateImposto('pis', 'ativo', v)}
              onAliquotaChange={(v) => updateImposto('pis', 'aliquota', v)}
              onRetidoChange={(v) => updateImposto('pis', 'retido_na_fonte', v)}
            />

            {/* COFINS */}
            <ImpostoRow
              label="COFINS"
              tooltip="Contribuição para Financiamento da Seguridade Social - 3% no regime cumulativo"
              imposto={impostos.cofins}
              onToggle={(v) => updateImposto('cofins', 'ativo', v)}
              onAliquotaChange={(v) => updateImposto('cofins', 'aliquota', v)}
              onRetidoChange={(v) => updateImposto('cofins', 'retido_na_fonte', v)}
            />

            {/* CSLL */}
            <ImpostoRow
              label="CSLL"
              tooltip="Contribuição Social sobre Lucro Líquido - 1% para retenção"
              imposto={impostos.csll}
              onToggle={(v) => updateImposto('csll', 'ativo', v)}
              onAliquotaChange={(v) => updateImposto('csll', 'aliquota', v)}
              onRetidoChange={(v) => updateImposto('csll', 'retido_na_fonte', v)}
            />

            {/* ISS */}
            <ImpostoRow
              label="ISS"
              tooltip="Imposto Sobre Serviços - Varia de 2% a 5% conforme município"
              imposto={impostos.iss}
              onToggle={(v) => updateImposto('iss', 'ativo', v)}
              onAliquotaChange={(v) => updateImposto('iss', 'aliquota', v)}
              onRetidoChange={(v) => updateImposto('iss', 'retido_na_fonte', v)}
            />

            {/* INSS */}
            <ImpostoRow
              label="INSS"
              tooltip="Retenção de INSS - Geralmente não aplicável para serviços advocatícios PJ"
              imposto={impostos.inss}
              onToggle={(v) => updateImposto('inss', 'ativo', v)}
              onAliquotaChange={(v) => updateImposto('inss', 'aliquota', v)}
              onRetidoChange={(v) => updateImposto('inss', 'retido_na_fonte', v)}
            />
          </div>
        </div>
      )}

      {config.regime_tributario === 'simples_nacional' && (
        <div className="space-y-4 pt-2">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-emerald-600 mt-0.5" />
              <div className="text-xs text-emerald-800">
                <p className="font-medium mb-1">Anexo IV - Advocacia</p>
                <p>No Simples Nacional, os impostos são pagos em guia única (DAS). O INSS patronal (20%) é pago separadamente.</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm text-[#34495e]">
                Receita Bruta dos últimos 12 meses (RBT12)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                  R$
                </span>
                <Input
                  type="number"
                  placeholder="0"
                  className="pl-9 border-slate-200"
                  value={config.simples_nacional?.rbt12 || ''}
                  onChange={(e) => updateSimplesNacional(Number(e.target.value) || 0)}
                />
              </div>
            </div>

            {/* Tabela de Faixas */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Faixas do Anexo IV
              </Label>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-2 py-1.5 text-left text-slate-600 font-medium">Faixa</th>
                      <th className="px-2 py-1.5 text-right text-slate-600 font-medium">Até</th>
                      <th className="px-2 py-1.5 text-right text-slate-600 font-medium">Alíq.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FAIXAS_SIMPLES_ANEXO_IV.map((faixa) => (
                      <tr
                        key={faixa.faixa}
                        className={`border-t border-slate-100 ${
                          config.simples_nacional?.faixa_atual === faixa.faixa
                            ? 'bg-emerald-50'
                            : ''
                        }`}
                      >
                        <td className="px-2 py-1.5">
                          <div className="flex items-center gap-1">
                            {config.simples_nacional?.faixa_atual === faixa.faixa && (
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            )}
                            <span className={config.simples_nacional?.faixa_atual === faixa.faixa ? 'font-medium text-emerald-700' : 'text-slate-600'}>
                              {faixa.faixa}ª
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-1.5 text-right text-slate-600">
                          {formatCurrency(faixa.receita_bruta_ate)}
                        </td>
                        <td className="px-2 py-1.5 text-right text-slate-600">
                          {faixa.aliquota_nominal}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Resultado Calculado */}
            {(config.simples_nacional?.rbt12 ?? 0) > 0 && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500">Alíquota Efetiva Calculada</p>
                    <p className="text-lg font-bold text-[#34495e]">
                      {config.simples_nacional!.aliquota_efetiva.toFixed(2)}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Faixa Atual</p>
                    <p className="text-lg font-bold text-emerald-600">
                      {config.simples_nacional!.faixa_atual}ª Faixa
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Configurações de Exibição na Fatura */}
      <div className="pt-4 border-t border-slate-200 space-y-3">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-2">
          <Receipt className="w-3.5 h-3.5" />
          Exibição na Fatura
        </p>

        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-sm text-[#34495e]">Exibir impostos na fatura</p>
              <p className="text-xs text-slate-500">Mostrar detalhamento de retenções</p>
            </div>
          </div>
          <Switch
            checked={config.exibir_impostos_fatura}
            onCheckedChange={(v) => updateConfig({ exibir_impostos_fatura: v })}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm text-[#34495e]">Observação Fiscal</Label>
          <Input
            placeholder="Ex: Documento sem valor fiscal"
            className="border-slate-200 text-sm"
            value={config.observacao_fiscal || ''}
            onChange={(e) => updateConfig({ observacao_fiscal: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-sm text-[#34495e]">Inscrição Municipal</Label>
            <Input
              placeholder="00000000"
              className="border-slate-200 text-sm"
              value={config.inscricao_municipal || ''}
              onChange={(e) => updateConfig({ inscricao_municipal: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-[#34495e]">Código Serviço ISS</Label>
            <Input
              placeholder="Ex: 17.14"
              className="border-slate-200 text-sm"
              value={config.codigo_servico_iss || ''}
              onChange={(e) => updateConfig({ codigo_servico_iss: e.target.value })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente auxiliar para linha de imposto
interface ImpostoRowProps {
  label: string;
  tooltip: string;
  imposto: { ativo: boolean; aliquota: number; retido_na_fonte: boolean };
  onToggle: (value: boolean) => void;
  onAliquotaChange: (value: number) => void;
  onRetidoChange: (value: boolean) => void;
}

function ImpostoRow({
  label,
  tooltip,
  imposto,
  onToggle,
  onAliquotaChange,
  onRetidoChange,
}: ImpostoRowProps) {
  return (
    <div className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
      imposto.ativo ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100'
    }`}>
      <Switch
        checked={imposto.ativo}
        onCheckedChange={onToggle}
        className="data-[state=checked]:bg-[#89bcbe]"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`text-sm font-medium ${imposto.ativo ? 'text-[#34495e]' : 'text-slate-400'}`}>
            {label}
          </span>
          <span title={tooltip}>
            <HelpCircle
              className="w-3 h-3 text-slate-400 cursor-help"
            />
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative w-20">
          <Input
            type="number"
            step="0.01"
            className="h-8 text-sm pr-6 border-slate-200"
            value={imposto.aliquota}
            onChange={(e) => onAliquotaChange(Number(e.target.value))}
            disabled={!imposto.ativo}
          />
          <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
        </div>

        <div className="flex items-center gap-1" title="Retido na Fonte">
          <Switch
            checked={imposto.retido_na_fonte}
            onCheckedChange={onRetidoChange}
            disabled={!imposto.ativo}
            className="data-[state=checked]:bg-amber-500 scale-75"
          />
          <span className={`text-[10px] ${imposto.retido_na_fonte ? 'text-amber-600' : 'text-slate-400'}`}>
            RF
          </span>
        </div>
      </div>
    </div>
  );
}
