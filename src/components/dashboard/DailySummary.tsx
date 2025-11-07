import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot } from 'lucide-react';

export default function DailySummary() {
  // Placeholder data - this will be replaced by AI-generated content
  const summary = {
    greeting: 'Bom dia, Victor!',
    content: 'Você tem 2 audiências e 3 prazos importantes hoje. Sua agenda está 75% ocupada. Há uma oportunidade de faturar 4 horas (R$ 2.000). Tenha um dia produtivo!',
    generatedAt: new Date(),
  };

  return (
    <Card className="bg-secondary-main text-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Resumo do Dia
          </CardTitle>
          <CardDescription className="text-xs text-secondary-light">
            Gerado às {summary.generatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <p className="font-semibold text-lg">{summary.greeting}</p>
        <p className="text-sm text-secondary-light mt-2">
          {summary.content}
        </p>
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="secondary" size="sm">Atualizar Resumo</Button>
        <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">Ver Detalhes</Button>
      </CardFooter>
    </Card>
  );
}
