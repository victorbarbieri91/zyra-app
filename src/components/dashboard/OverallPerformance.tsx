import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

export default function OverallPerformance() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Geral</CardTitle>
        <CardDescription>
          Uma visão consolidada da performance do escritório.
        </CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <Tabs defaultValue="equipe">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="equipe">Equipe</TabsTrigger>
            <TabsTrigger value="area">Por Área</TabsTrigger>
            <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          </TabsList>
          <TabsContent value="equipe">
            <Card>
              <CardHeader>
                <CardTitle>Performance da Equipe</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Gráfico de performance da equipe aqui.</p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="area">
            <Card>
              <CardHeader>
                <CardTitle>Performance por Área</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Gráfico de performance por área aqui.</p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="financeiro">
            <Card>
              <CardHeader>
                <CardTitle>Performance Financeira</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Gráfico de performance financeira aqui.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
