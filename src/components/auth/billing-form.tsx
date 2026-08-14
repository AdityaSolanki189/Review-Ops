'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Session } from '@/lib/auth/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
    Loader2,
    Check,
    CreditCard,
    Download,
    Calendar,
    TrendingUp,
    Database,
    Zap,
    Crown,
    Sparkles,
} from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'

interface BillingFormProps {
    session: Session | null
}

// Sample data for current plan
const currentPlanData = {
    name: 'Pro',
    price: 29,
    billingCycle: 'month',
    status: 'active',
    nextBillingDate: '2025-12-04',
    features: ['10,000 API calls/month', '5 GB storage', '50 GB bandwidth', 'Priority support', 'Advanced analytics'],
}

// Sample subscription plans
const subscriptionPlans = [
    {
        id: 'free',
        name: 'Free',
        price: 0,
        icon: Sparkles,
        features: ['1,000 API calls/month', '500 MB storage', '5 GB bandwidth', 'Community support', 'Basic analytics'],
        popular: false,
    },
    {
        id: 'pro',
        name: 'Pro',
        price: 29,
        icon: Zap,
        features: [
            '10,000 API calls/month',
            '5 GB storage',
            '50 GB bandwidth',
            'Priority support',
            'Advanced analytics',
        ],
        popular: true,
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        price: 99,
        icon: Crown,
        features: [
            'Unlimited API calls',
            '100 GB storage',
            '500 GB bandwidth',
            '24/7 dedicated support',
            'Custom integrations',
        ],
        popular: false,
    },
]

// Sample payment history
const paymentHistory = [
    {
        id: '1',
        date: '2025-11-04',
        description: 'Pro Plan - Monthly',
        amount: 29.0,
        status: 'paid' as const,
    },
    {
        id: '2',
        date: '2025-10-04',
        description: 'Pro Plan - Monthly',
        amount: 29.0,
        status: 'paid' as const,
    },
    {
        id: '3',
        date: '2025-09-04',
        description: 'Pro Plan - Monthly',
        amount: 29.0,
        status: 'paid' as const,
    },
    {
        id: '4',
        date: '2025-08-04',
        description: 'Pro Plan - Monthly',
        amount: 29.0,
        status: 'paid' as const,
    },
    {
        id: '5',
        date: '2025-07-04',
        description: 'Pro Plan - Monthly',
        amount: 29.0,
        status: 'paid' as const,
    },
]

// Sample usage metrics
const usageMetrics = [
    {
        label: 'API Calls',
        current: 4532,
        limit: 10000,
        unit: 'calls',
        icon: Zap,
    },
    {
        label: 'Storage',
        current: 2.3,
        limit: 5,
        unit: 'GB',
        icon: Database,
    },
    {
        label: 'Bandwidth',
        current: 15.7,
        limit: 50,
        unit: 'GB',
        icon: TrendingUp,
    },
]

// Zod schema for payment method form
const paymentMethodSchema = z.object({
    cardNumber: z
        .string()
        .regex(/^\d{16}$/, 'Card number must be 16 digits')
        .transform((val) => val.replace(/\s/g, '')),
    cardHolder: z.string().min(3, 'Cardholder name must be at least 3 characters'),
    expiryDate: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Expiry date must be in MM/YY format'),
    cvv: z.string().regex(/^\d{3,4}$/, 'CVV must be 3 or 4 digits'),
})

export function BillingForm({ session }: BillingFormProps) {
    const [isChangingPlan, setIsChangingPlan] = useState(false)
    const [selectedPlan, setSelectedPlan] = useState(currentPlanData.name.toLowerCase())
    const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false)
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
    const [isUpdatingPayment, setIsUpdatingPayment] = useState(false)

    const paymentForm = useForm<z.infer<typeof paymentMethodSchema>>({
        resolver: zodResolver(paymentMethodSchema),
        defaultValues: {
            cardNumber: '',
            cardHolder: '',
            expiryDate: '',
            cvv: '',
        },
    })

    async function handlePlanChange(planId: string) {
        try {
            setIsChangingPlan(true)
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 1500))
            toast.success('Plan changed successfully', {
                description: `You are now on the ${planId.charAt(0).toUpperCase() + planId.slice(1)} plan.`,
            })
            setSelectedPlan(planId)
            setIsPlanDialogOpen(false)
        } catch {
            toast.error('Failed to change plan')
        } finally {
            setIsChangingPlan(false)
        }
    }

    async function onUpdatePaymentMethod(_data: z.infer<typeof paymentMethodSchema>) {
        try {
            setIsUpdatingPayment(true)
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 1500))
            toast.success('Payment method updated successfully')
            setIsPaymentDialogOpen(false)
            paymentForm.reset()
        } catch {
            toast.error('Failed to update payment method')
        } finally {
            setIsUpdatingPayment(false)
        }
    }

    function getUsageBadgeVariant(percentage: number) {
        if (percentage >= 90) return 'destructive'
        if (percentage >= 70) return 'default'
        return 'secondary'
    }

    function getUsageBadgeLabel(percentage: number) {
        if (percentage >= 90) return 'High'
        if (percentage >= 70) return 'Medium'
        return 'Low'
    }

    function getStatusBadgeVariant(status: string) {
        switch (status) {
            case 'paid':
                return 'default'
            case 'pending':
                return 'secondary'
            case 'failed':
                return 'destructive'
            default:
                return 'secondary'
        }
    }

    if (!session) return null

    return (
        <div className="space-y-6">
            {/* Current Plan Section */}
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle className="text-2xl font-bold">Current Plan</CardTitle>
                            <CardDescription>Manage your subscription and billing preferences.</CardDescription>
                        </div>
                        <Badge variant={currentPlanData.status === 'active' ? 'default' : 'secondary'}>
                            {currentPlanData.status.charAt(0).toUpperCase() + currentPlanData.status.slice(1)}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-2">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-bold">${currentPlanData.price}</span>
                                    <span className="text-muted-foreground text-sm">
                                        / {currentPlanData.billingCycle}
                                    </span>
                                </div>
                                <p className="text-muted-foreground text-sm">
                                    Next billing date: {new Date(currentPlanData.nextBillingDate).toLocaleDateString()}
                                </p>
                            </div>
                            <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="w-full sm:w-auto">
                                        Change Plan
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
                                    <DialogHeader>
                                        <DialogTitle>Choose a Plan</DialogTitle>
                                        <DialogDescription>
                                            Select the plan that best fits your needs. Changes take effect immediately.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        {subscriptionPlans.map((plan) => {
                                            const Icon = plan.icon
                                            const isCurrentPlan = plan.id === selectedPlan
                                            return (
                                                <Card
                                                    key={plan.id}
                                                    className={`relative cursor-pointer transition-all hover:border-primary ${
                                                        isCurrentPlan ? 'border-primary ring-1 ring-primary' : ''
                                                    }`}
                                                    onClick={() => !isChangingPlan && handlePlanChange(plan.id)}
                                                >
                                                    {plan.popular && (
                                                        <div className="bg-primary text-primary-foreground absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-semibold">
                                                            Most Popular
                                                        </div>
                                                    )}
                                                    <CardHeader>
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <Icon className="h-5 w-5" />
                                                                <CardTitle>{plan.name}</CardTitle>
                                                            </div>
                                                            {isCurrentPlan && (
                                                                <Badge variant="secondary">
                                                                    <Check className="mr-1 h-3 w-3" />
                                                                    Current
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-3xl font-bold">${plan.price}</span>
                                                            <span className="text-muted-foreground text-sm">
                                                                /month
                                                            </span>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <ul className="space-y-2">
                                                            {plan.features.map((feature, index) => (
                                                                <li
                                                                    key={index}
                                                                    className="flex items-start gap-2 text-sm"
                                                                >
                                                                    <Check className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                                                                    <span>{feature}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </CardContent>
                                                </Card>
                                            )
                                        })}
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>

                        <Separator />

                        <div className="space-y-2">
                            <p className="text-sm font-semibold">Plan Features</p>
                            <ul className="grid gap-2 sm:grid-cols-2">
                                {currentPlanData.features.map((feature, index) => (
                                    <li key={index} className="flex items-start gap-2 text-sm">
                                        <Check className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Payment Method Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Payment Method</CardTitle>
                    <CardDescription>Manage your payment information securely.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                            <div className="bg-muted flex h-12 w-16 items-center justify-center rounded-md">
                                <CreditCard className="h-6 w-6" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-semibold">Visa ending in 4242</p>
                                <p className="text-muted-foreground text-sm">Expires 12/25</p>
                            </div>
                        </div>
                        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="w-full sm:w-auto">
                                    Update Payment Method
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[450px]">
                                <DialogHeader>
                                    <DialogTitle>Update Payment Method</DialogTitle>
                                    <DialogDescription>
                                        Enter your new card details. Your information is securely encrypted.
                                    </DialogDescription>
                                </DialogHeader>
                                <Form {...paymentForm}>
                                    <form
                                        onSubmit={paymentForm.handleSubmit(onUpdatePaymentMethod)}
                                        className="space-y-4"
                                    >
                                        <FormField
                                            control={paymentForm.control}
                                            name="cardNumber"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Card Number</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            {...field}
                                                            placeholder="1234 5678 9012 3456"
                                                            maxLength={16}
                                                            onChange={(e) => {
                                                                const value = e.target.value.replace(/\D/g, '')
                                                                field.onChange(value)
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={paymentForm.control}
                                            name="cardHolder"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Cardholder Name</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} placeholder="John Doe" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <FormField
                                                control={paymentForm.control}
                                                name="expiryDate"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Expiry Date</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                {...field}
                                                                placeholder="MM/YY"
                                                                maxLength={5}
                                                                onChange={(e) => {
                                                                    let value = e.target.value.replace(/\D/g, '')
                                                                    if (value.length >= 2) {
                                                                        value = `${value.slice(0, 2)}/${value.slice(2, 4)}`
                                                                    }
                                                                    field.onChange(value)
                                                                }}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={paymentForm.control}
                                                name="cvv"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>CVV</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                {...field}
                                                                placeholder="123"
                                                                maxLength={4}
                                                                onChange={(e) => {
                                                                    const value = e.target.value.replace(/\D/g, '')
                                                                    field.onChange(value)
                                                                }}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <div className="flex gap-3 pt-4">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="flex-1"
                                                onClick={() => setIsPaymentDialogOpen(false)}
                                            >
                                                Cancel
                                            </Button>
                                            <Button type="submit" className="flex-1" disabled={isUpdatingPayment}>
                                                {isUpdatingPayment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Save Card
                                            </Button>
                                        </div>
                                    </form>
                                </Form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardContent>
            </Card>

            {/* Usage Metrics Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Usage This Month</CardTitle>
                    <CardDescription>Track your current usage across all plan limits.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {usageMetrics.map((metric) => {
                            const Icon = metric.icon
                            const percentage = (metric.current / metric.limit) * 100
                            const usageLevel = getUsageBadgeLabel(percentage)
                            return (
                                <div key={metric.label} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Icon className="h-4 w-4" />
                                            <span className="text-sm font-semibold">{metric.label}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground text-sm">
                                                {metric.current.toLocaleString()} / {metric.limit.toLocaleString()}{' '}
                                                {metric.unit}
                                            </span>
                                            <Badge variant={getUsageBadgeVariant(percentage)}>{usageLevel}</Badge>
                                        </div>
                                    </div>
                                    <div className="bg-secondary h-2 w-full overflow-hidden rounded-full">
                                        <div
                                            className={`h-full rounded-full transition-all ${
                                                percentage >= 90
                                                    ? 'bg-destructive'
                                                    : percentage >= 70
                                                      ? 'bg-primary'
                                                      : 'bg-primary'
                                            }`}
                                            style={{ width: `${Math.min(percentage, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Payment History Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Payment History</CardTitle>
                    <CardDescription>View and download your past invoices and receipts.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {paymentHistory.map((payment) => (
                            <div
                                key={payment.id}
                                className="flex flex-col gap-4 border-b pb-4 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-md">
                                        <Calendar className="h-5 w-5" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold">{payment.description}</p>
                                        <p className="text-muted-foreground text-sm">
                                            {new Date(payment.date).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                            })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 sm:flex-row-reverse">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold">${payment.amount.toFixed(2)}</span>
                                        <Badge variant={getStatusBadgeVariant(payment.status)}>
                                            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                                        </Badge>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            toast.success('Invoice downloaded', {
                                                description: 'Your invoice has been downloaded successfully.',
                                            })
                                        }}
                                    >
                                        <Download className="mr-2 h-4 w-4" />
                                        Download
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
