export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="from-background to-muted/20 flex min-h-screen flex-col items-center bg-gradient-to-b">
            <main className="flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
                {children}
            </main>
        </div>
    )
}
