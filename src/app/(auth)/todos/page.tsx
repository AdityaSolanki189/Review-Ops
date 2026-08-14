import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { auth } from '@/lib/auth/auth'
import { TodosClient } from '@/components/todos/todos-client'

export const metadata: Metadata = {
    title: 'Todos',
    description: 'Manage your tasks, update their status, and stay organised.',
}

export default async function TodosPage() {
    const session = await auth.api
        .getSession({
            headers: await headers(),
        })
        .catch(() => null)

    if (!session) {
        redirect('/signin')
    }

    return <TodosClient />
}
