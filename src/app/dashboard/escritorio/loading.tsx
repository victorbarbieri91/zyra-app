import { PageSkeleton } from '@/components/shared/PageSkeleton'

export default function EscritorioLoading() {
  return <PageSkeleton kpiCards={0} showTable={true} tableRows={5} title="Escritorio" />
}
