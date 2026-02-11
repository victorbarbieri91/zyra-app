import { PageSkeleton } from '@/components/shared/PageSkeleton'

export default function PublicacoesLoading() {
  return <PageSkeleton kpiCards={3} showTable={true} tableRows={6} title="Publicacoes" />
}
