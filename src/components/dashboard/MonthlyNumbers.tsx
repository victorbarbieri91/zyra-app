import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

export default function MonthlyNumbers() {
  // Placeholder data
  const metrics = {
    billedHours: { value: 80, goal: 120 },
    utilizationRate: { value: 75, goal: 85 },
    generatedRevenue: { value: 40000, goal: 50000 },
    pendingHours: 12,
  };

  const billedHoursPercent = (metrics.billedHours.value / metrics.billedHours.goal) * 100;
  const utilizationRatePercent = (metrics.utilizationRate.value / metrics.utilizationRate.goal) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seus Números do Mês</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <p className="font-medium">Horas Faturadas</p>
            <p className="text-text-secondary">{metrics.billedHours.value} / {metrics.billedHours.goal}h</p>
          </div>
          <Progress value={billedHoursPercent} />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <p className="font-medium">Taxa de Utilização</p>
            <p className="text-text-secondary">{metrics.utilizationRate.value}%</p>
          </div>
          <Progress value={utilizationRatePercent} />
        </div>

        <div className="text-sm">
          <p className="font-medium">Receita Gerada</p>
          <p className="text-2xl font-bold text-text-primary">R$ {metrics.generatedRevenue.value.toLocaleString('pt-BR')}</p>
          <p className="text-text-secondary">Meta: R$ {metrics.generatedRevenue.goal.toLocaleString('pt-BR')}</p>
        </div>

        <div className="border-t border-grey-200 pt-4">
            <p className="text-sm font-medium">Horas pendentes de faturamento: <span className="font-bold">{metrics.pendingHours}h</span></p>
            <Button variant="outline" size="sm" className="mt-2 w-full">Faturar Agora</Button>
        </div>
      </CardContent>
    </Card>
  );
}
