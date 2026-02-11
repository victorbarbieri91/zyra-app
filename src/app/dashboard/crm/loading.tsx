import { PageSkeleton } from '@/components/shared/PageSkeleton'

export default function CrmLoading() {
  return <PageSkeleton kpiCards={4} showTable={true} tableRows={8} title="CRM" />
}
