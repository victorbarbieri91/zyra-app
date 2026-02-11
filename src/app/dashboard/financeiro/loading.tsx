import { PageSkeleton } from '@/components/shared/PageSkeleton'

export default function FinanceiroLoading() {
  return <PageSkeleton kpiCards={4} showTable={true} tableRows={6} title="Financeiro" />
}
