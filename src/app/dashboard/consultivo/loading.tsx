import { PageSkeleton } from '@/components/shared/PageSkeleton'

export default function ConsultivoLoading() {
  return <PageSkeleton kpiCards={3} showTable={true} tableRows={6} title="Consultivo" />
}
