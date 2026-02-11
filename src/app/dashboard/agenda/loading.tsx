import { PageSkeleton } from '@/components/shared/PageSkeleton'

export default function AgendaLoading() {
  return <PageSkeleton kpiCards={0} showCalendar={true} title="Agenda" />
}
