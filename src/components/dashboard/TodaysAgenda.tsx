import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const appointments = [
  {
    time: '09:00 - 10:00',
    title: 'Audiência - Processo 123',
    client: 'Empresa ABC',
    avatar: '/avatars/01.png',
    fallback: 'EA',
  },
  {
    time: '11:00 - 12:00',
    title: 'Reunião com Cliente Silva',
    client: 'João Silva',
    avatar: '/avatars/02.png',
    fallback: 'JS',
  },
  {
    time: '14:00 - 15:00',
    title: 'Prazo Final - Petição',
    client: 'Processo XYZ',
    avatar: '',
    fallback: 'P',
  },
];

export default function TodaysAgenda() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Agenda de Hoje</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {appointments.map((item, index) => (
          <div key={index} className="flex items-center">
            <Avatar className="h-9 w-9">
              <AvatarImage src={item.avatar} alt="Avatar" />
              <AvatarFallback>{item.fallback}</AvatarFallback>
            </Avatar>
            <div className="ml-4 space-y-1">
              <p className="text-sm font-medium leading-none">{item.title}</p>
              <p className="text-sm text-text-secondary">{item.client}</p>
            </div>
            <div className="ml-auto font-medium text-sm">{item.time}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
