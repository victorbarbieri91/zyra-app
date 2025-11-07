'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Clock, Briefcase, DollarSign, User } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface MembroPerformance {
  id: string;
  nome: string;
  avatar_url?: string;
  horasTrabalhadas: number;
  metaHoras: number;
  processosAtivos: number;
  receitaGerada: number;
}

interface PerformanceMembroTabsProps {
  membros: MembroPerformance[];
}

// Helper para obter iniciais de forma segura
const getIniciais = (nome: string | undefined): string => {
  if (!nome) return '??';
  return nome
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
};

export function PerformanceMembroTabs({ membros }: PerformanceMembroTabsProps) {
  // Ordenar membros por horas trabalhadas
  const membrosPorHoras = [...membros].sort(
    (a, b) => b.horasTrabalhadas - a.horasTrabalhadas
  );

  // Ordenar membros por processos ativos
  const membrosPorProcessos = [...membros].sort(
    (a, b) => b.processosAtivos - a.processosAtivos
  );

  // Ordenar membros por receita gerada
  const membrosPorReceita = [...membros].sort(
    (a, b) => b.receitaGerada - a.receitaGerada
  );

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium text-[#34495e] flex items-center gap-2">
          <User className="w-4 h-4 text-[#89bcbe]" />
          Performance dos Membros
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="horas" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="horas" className="text-xs">
              <Clock className="w-3.5 h-3.5 mr-1.5" />
              Horas
            </TabsTrigger>
            <TabsTrigger value="processos" className="text-xs">
              <Briefcase className="w-3.5 h-3.5 mr-1.5" />
              Processos
            </TabsTrigger>
            <TabsTrigger value="receita" className="text-xs">
              <DollarSign className="w-3.5 h-3.5 mr-1.5" />
              Receita
            </TabsTrigger>
          </TabsList>

          {/* Tab: Horas Trabalhadas */}
          <TabsContent value="horas" className="space-y-4 mt-0">
            {membrosPorHoras.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-[#adb5bd]">Nenhum registro de horas ainda</p>
              </div>
            ) : (
              membrosPorHoras.map((membro, index) => {
                const percentual = Math.min(
                  (membro.horasTrabalhadas / membro.metaHoras) * 100,
                  100
                );
                const gradientClass =
                  index === 0
                    ? 'from-[#34495e] to-[#46627f]'
                    : index === 1
                    ? 'from-[#46627f] to-[#6c757d]'
                    : index === 2
                    ? 'from-[#89bcbe] to-[#aacfd0]'
                    : 'from-[#aacfd0] to-[#cbe2e2]';

                return (
                  <div key={membro.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#34495e] to-[#46627f] flex items-center justify-center text-white text-xs font-semibold">
                          {getIniciais(membro.nome)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#34495e]">
                            {membro.nome}
                          </p>
                          <p className="text-xs text-[#adb5bd]">
                            {membro.horasTrabalhadas}h / {membro.metaHoras}h
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className={`bg-gradient-to-r ${gradientClass} text-white border-0`}
                      >
                        {percentual.toFixed(0)}%
                      </Badge>
                    </div>
                    <Progress value={percentual} className="h-2" />
                  </div>
                );
              })
            )}
          </TabsContent>

          {/* Tab: Processos Ativos */}
          <TabsContent value="processos" className="space-y-3 mt-0">
            {membrosPorProcessos.length === 0 ? (
              <div className="text-center py-8">
                <Briefcase className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-[#adb5bd]">Nenhum processo atribuído ainda</p>
              </div>
            ) : (
              membrosPorProcessos.map((membro, index) => {
                const gradientClass =
                  index === 0
                    ? 'from-[#34495e] to-[#46627f]'
                    : index === 1
                    ? 'from-[#46627f] to-[#6c757d]'
                    : index === 2
                    ? 'from-[#89bcbe] to-[#aacfd0]'
                    : 'from-[#aacfd0] to-[#cbe2e2]';

                return (
                  <div
                    key={membro.id}
                    className="flex items-center justify-between p-3 bg-slate-50/50 rounded-lg border border-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#34495e] to-[#46627f] flex items-center justify-center text-white text-xs font-semibold">
                        {getIniciais(membro.nome)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#34495e]">
                          {membro.nome}
                        </p>
                        <p className="text-xs text-[#adb5bd]">
                          {membro.processosAtivos} processos ativos
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={`bg-gradient-to-r ${gradientClass} text-white border-0`}
                    >
                      {membro.processosAtivos}
                    </Badge>
                  </div>
                );
              })
            )}
          </TabsContent>

          {/* Tab: Receita Gerada */}
          <TabsContent value="receita" className="space-y-3 mt-0">
            {membrosPorReceita.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-[#adb5bd]">Nenhuma receita registrada ainda</p>
              </div>
            ) : (
              membrosPorReceita.map((membro, index) => {
                const gradientClass =
                  index === 0
                    ? 'from-[#34495e] to-[#46627f]'
                    : index === 1
                    ? 'from-[#46627f] to-[#6c757d]'
                    : index === 2
                    ? 'from-[#89bcbe] to-[#aacfd0]'
                    : 'from-[#aacfd0] to-[#cbe2e2]';

                return (
                  <div
                    key={membro.id}
                    className="flex items-center justify-between p-3 bg-slate-50/50 rounded-lg border border-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#34495e] to-[#46627f] flex items-center justify-center text-white text-xs font-semibold">
                        {getIniciais(membro.nome)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#34495e]">
                          {membro.nome}
                        </p>
                        <p className="text-xs text-[#adb5bd]">Faturamento gerado</p>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={`bg-gradient-to-r ${gradientClass} text-white border-0`}
                    >
                      {formatCurrency(membro.receitaGerada)}
                    </Badge>
                  </div>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
