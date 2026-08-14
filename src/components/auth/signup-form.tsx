'use client'

import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { authClient } from '@/lib/auth/auth-client'
import { zodResolver } from '@hookform/resolvers/zod'
import { Chrome, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'

const signUpSchema = z
    .object({
        name: z.string().min(2, 'Name must be at least 2 characters'),
        email: z.string().email('Invalid email address'),
        password: z.string().min(8, 'Password must be at least 8 characters'),
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ['confirmPassword'],
    })

export function SignUpForm() {
    const [isEmailLoading, setIsEmailLoading] = useState(false)
    const [isGoogleLoading, setIsGoogleLoading] = useState(false)

    const form = useForm<z.infer<typeof signUpSchema>>({
        resolver: zodResolver(signUpSchema),
        defaultValues: {
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
        },
    })

    const isAnyLoading = isEmailLoading || isGoogleLoading

    async function onSubmit(values: z.infer<typeof signUpSchema>) {
        const { name, email, password } = values

        await authClient.signUp.email(
            {
                email,
                password,
                name,
                callbackURL: '/',
            },
            {
                onRequest: () => setIsEmailLoading(true),
                onSuccess: () => {
                    toast.success('Account created successfully', {
                        description: 'Redirecting...',
                    })
                },
                onError: (ctx) => {
                    toast.error('Error', { description: ctx.error.message })
                    setIsEmailLoading(false)
                },
                onSettled: () => setIsEmailLoading(false),
            },
        )
    }

    async function handleGoogleSignUp() {
        await authClient.signIn.social(
            { provider: 'google', callbackURL: '/' },
            {
                onRequest: () => setIsGoogleLoading(true),
                onSuccess: () => {
                    toast.success('Signed in successfully', {
                        description: 'Redirecting...',
                    })
                },
                onError: () => {
                    toast.error('Sign Up Error', {
                        description: 'Failed to sign up with Google',
                    })
                    setIsGoogleLoading(false)
                },
                onSettled: () => setIsGoogleLoading(false),
            },
        )
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>
                                Name <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                                <Input placeholder="John Doe" {...field} disabled={isAnyLoading} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>
                                Email <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="john@example.com"
                                    type="email"
                                    autoComplete="email"
                                    {...field}
                                    disabled={isAnyLoading}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>
                                Password <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="********"
                                    type="password"
                                    autoComplete="new-password"
                                    {...field}
                                    disabled={isAnyLoading}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>
                                Confirm Password <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="********"
                                    type="password"
                                    autoComplete="new-password"
                                    {...field}
                                    disabled={isAnyLoading}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full" disabled={isAnyLoading}>
                    {isEmailLoading ? (
                        <div className="flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Creating account...</span>
                        </div>
                    ) : (
                        'Create Account'
                    )}
                </Button>
            </form>

            <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background text-muted-foreground px-2">or</span>
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <Button variant="outline" className="w-full gap-2" onClick={handleGoogleSignUp} disabled={isAnyLoading}>
                    {isGoogleLoading ? (
                        <div className="flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Signing up...</span>
                        </div>
                    ) : (
                        <>
                            <Chrome />
                            <span>Continue with Google</span>
                        </>
                    )}
                </Button>
            </div>

            <div className="text-muted-foreground mt-4 text-center text-sm">
                Already have an account?{' '}
                <Link href="/signin" className="text-primary hover:underline">
                    Sign in
                </Link>
            </div>
        </Form>
    )
}
