import { auth } from '@/lib/auth/auth'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { ProfileNav } from '@/components/auth/profile-nav'

interface SettingsLayoutProps {
    children: React.ReactNode
}

export default async function SettingsLayout({ children }: SettingsLayoutProps) {
    const session = await auth.api.getSession({
        headers: await headers(),
    })

    if (!session) {
        notFound()
    }

    return (
        <div className="size-full flex-grow">
            <div className="flex flex-col gap-6 md:flex-row">
                <aside className="w-full border-b pb-6 md:w-64 md:border-r md:border-b-0 md:pr-6 md:pb-0">
                    <ProfileNav />
                </aside>
                <main className="flex-1">{children}</main>
            </div>
        </div>
    )
}
