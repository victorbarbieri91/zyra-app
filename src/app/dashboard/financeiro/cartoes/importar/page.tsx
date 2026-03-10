'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ImportarFaturaPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/financeiro/cartoes')
  }, [router])

  return null
}
