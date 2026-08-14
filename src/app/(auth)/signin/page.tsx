import { AuthHero } from '@/components/auth/auth-hero'
import { SignInForm } from '@/components/auth/signin-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SignInPage() {
    return (
        <div className="grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
            {/* Hero Section */}
            <AuthHero page="signin" />

            {/* Sign In Form Card */}
            <div className="flex w-full flex-col">
                <Card className="shadow-lg">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-center text-2xl">Welcome back</CardTitle>
                        <CardDescription className="text-center">
                            Enter your credentials to sign in to your account
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <SignInForm />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
