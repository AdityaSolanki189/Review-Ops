import { auth } from '@/lib/auth/auth'
import { headers } from 'next/headers'
import { BillingForm } from '@/components/auth/billing-form'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Billing',
    description: 'Manage your subscription, payment methods, and view billing history.',
}

export default async function BillingPage() {
    const session = await auth.api
        .getSession({
            headers: await headers(),
        })
        .catch(() => {
            redirect('/signin')
        })

    if (!session) {
        redirect('/signin')
    }

    return <BillingForm session={JSON.parse(JSON.stringify(session))} />
}
