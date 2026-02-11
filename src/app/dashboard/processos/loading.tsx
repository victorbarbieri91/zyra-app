import { PageSkeleton } from '@/components/shared/PageSkeleton'

export default function ProcessosLoading() {
  return <PageSkeleton kpiCards={4} showTable={true} tableRows={8} title="Processos" />
}
