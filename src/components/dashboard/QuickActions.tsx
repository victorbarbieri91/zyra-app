import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Bot,
  Briefcase,
  UserPlus,
  MessageSquarePlus,
  FilePlus2,
  Clock,
  CircleDollarSign,
  Search,
} from 'lucide-react';

const actions = [
  { label: '+ Processo', Icon: Briefcase },
  { label: '+ Cliente', Icon: UserPlus },
  { label: '+ Consulta', Icon: MessageSquarePlus },
  { label: '+ Documento', Icon: FilePlus2 },
  { label: 'Registrar Horas', Icon: Clock },
  { label: 'Nova Despesa', Icon: CircleDollarSign },
  { label: 'Buscar...', Icon: Search },
];

export default function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ações Rápidas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button className="w-full font-bold" variant="default">
          <Bot className="mr-2 h-4 w-4" />
          Centro de Comando
        </Button>
        <div className="grid grid-cols-2 gap-2 pt-2">
          {actions.map(({ label, Icon }) => (
            <Button key={label} variant="outline" className="flex items-center justify-start text-left h-auto py-2">
              <Icon className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="text-xs font-normal">{label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
