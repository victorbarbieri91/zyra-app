'use client';

import { Users, Briefcase, DollarSign, FileText } from 'lucide-react';
import MetricCard from '@/components/dashboard/MetricCard';
import { formatCurrency } from '@/lib/utils';

interface EscritorioStatsProps {
  stats: {
    totalMembros: number;
    processosAtivos: number;
    clientesAtivos: number;
    receitaMes: number;
  };
}

export function EscritorioStats({ stats }: EscritorioStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <MetricCard
        title="Total de Membros"
        value={stats.totalMembros}
        icon={Users}
        gradient="kpi1"
        subtitle="usuários ativos"
      />

      <MetricCard
        title="Processos Ativos"
        value={stats.processosAtivos}
        icon={Briefcase}
        gradient="kpi2"
        subtitle="em andamento"
      />

      <MetricCard
        title="Clientes Ativos"
        value={stats.clientesAtivos}
        icon={FileText}
        gradient="kpi3"
        subtitle="cadastrados"
      />

      <MetricCard
        title="Receita do Mês"
        value={formatCurrency(stats.receitaMes)}
        icon={DollarSign}
        gradient="kpi4"
        subtitle="faturamento"
      />
    </div>
  );
}
