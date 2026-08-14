import { AuthHero } from '@/components/auth/auth-hero'
import { SignUpForm } from '@/components/auth/signup-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SignUpPage() {
    return (
        <div className="grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
            {/* Hero Section */}
            <AuthHero page="signup" />

            {/* Sign Up Form Card */}
            <div className="flex w-full flex-col">
                <Card className="shadow-lg">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-center text-2xl">Create an account</CardTitle>
                        <CardDescription className="text-center">
                            Enter your information below to create your account
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <SignUpForm />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
