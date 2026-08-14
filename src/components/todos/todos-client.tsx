'use client'

import { useMemo, useState, type ReactNode } from 'react'
// biome-ignore lint/style/useImportType: z namespace is required for inference helpers
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { formatDistanceToNow } from 'date-fns'
import { Plus, Pencil, Trash, MoreVertical, Loader2, CheckCircle2, Clock, ListTodo } from 'lucide-react'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils/utils'
import {
    useCreateTodoMutation,
    useDeleteTodoMutation,
    useTodosQuery,
    useUpdateTodoMutation,
    type Todo,
    type TodosFilters,
} from '@/lib/mutations/todos'
import { createTodoSchema, type TodoStatus, type UpdateTodoInput } from '@/lib/validations/todo'

type FormValues = z.input<typeof createTodoSchema>

const statusLabels: Record<TodoStatus, string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
}

const statusBadges: Record<TodoStatus, string> = {
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200',
    in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-200',
    completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200',
}

const statusIcons: Record<TodoStatus, ReactNode> = {
    pending: <Clock className="size-4" />,
    in_progress: <Loader2 className="size-4 animate-spin" />,
    completed: <CheckCircle2 className="size-4" />,
}

const STATUS_FILTERS: Array<{ label: string; value: TodosFilters['status'] }> = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Completed', value: 'completed' },
]

export function TodosClient() {
    const [statusFilter, setStatusFilter] = useState<TodosFilters['status']>('all')
    const [isDialogOpen, setDialogOpen] = useState(false)
    const [editingTodo, setEditingTodo] = useState<Todo | null>(null)

    const form = useForm<FormValues>({
        resolver: zodResolver(createTodoSchema),
        defaultValues: { title: '', description: '' },
    })

    const filters = useMemo(() => ({ status: statusFilter }), [statusFilter])

    const todosQuery = useTodosQuery(filters)
    const createMutation = useCreateTodoMutation()
    const updateMutation = useUpdateTodoMutation()
    const deleteMutation = useDeleteTodoMutation()

    const handleOpenCreate = () => {
        setEditingTodo(null)
        form.reset({ title: '', description: '' })
        setDialogOpen(true)
    }

    const handleOpenEdit = (todo: Todo) => {
        setEditingTodo(todo)
        form.reset({ title: todo.title, description: todo.description ?? '' })
        setDialogOpen(true)
    }

    const closeDialog = () => {
        setDialogOpen(false)
        setEditingTodo(null)
        form.reset({ title: '', description: '' })
    }

    const handleSubmit = async (values: FormValues) => {
        try {
            if (editingTodo) {
                const payload: UpdateTodoInput = {
                    title: values.title,
                    description: values.description ?? undefined,
                }

                await updateMutation.mutateAsync({ id: editingTodo.id, data: payload })
            } else {
                await createMutation.mutateAsync(values)
            }

            closeDialog()
        } catch (error) {
            console.error(error)
        }
    }

    const handleUpdateStatus = (todo: Todo, status: TodoStatus) => {
        if (todo.status === status) return
        updateMutation.mutate({ id: todo.id, data: { status } })
    }

    const handleDelete = (todo: Todo) => {
        deleteMutation.mutate(todo.id)
    }

    const isSubmitting = createMutation.isPending || updateMutation.isPending

    return (
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-12">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">Todos</h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Keep track of what needs to get done, organized by status.
                    </p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
                    <DialogTrigger asChild>
                        <Button onClick={handleOpenCreate}>
                            <Plus className="mr-2 size-4" />
                            Add Todo
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingTodo ? 'Edit Todo' : 'Create Todo'}</DialogTitle>
                            <DialogDescription>
                                {editingTodo ? 'Update the details of this todo.' : 'Add a new task to your list.'}
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Title</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Write documentation" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Description</FormLabel>
                                            <FormControl>
                                                <textarea
                                                    placeholder="Add optional context..."
                                                    className="bg-background border-input focus-visible:ring-ring min-h-[96px] w-full rounded-md border px-3 py-2 text-sm shadow-sm transition focus-visible:outline-hidden"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <DialogFooter>
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                                        {editingTodo ? 'Save changes' : 'Create todo'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle className="text-xl font-semibold">Your todos</CardTitle>
                        <CardDescription>Filter by status or manage todo actions from the menu.</CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {STATUS_FILTERS.map((option) => (
                            <Button
                                key={option.value}
                                variant={statusFilter === option.value ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setStatusFilter(option.value)}
                            >
                                {option.label}
                            </Button>
                        ))}
                    </div>
                </CardHeader>

                <CardContent>
                    {todosQuery.isLoading && (
                        <div className="space-y-3">
                            {Array.from({ length: 4 }).map((_, index) => (
                                <Skeleton key={index} className="h-20 w-full" />
                            ))}
                        </div>
                    )}

                    {todosQuery.isError && (
                        <div className="text-destructive rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm">
                            Failed to load todos. Please try again.
                        </div>
                    )}

                    {!todosQuery.isLoading && !todosQuery.isError && (todosQuery.data?.length ?? 0) === 0 && (
                        <div className="text-muted-foreground flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center">
                            <ListTodo className="size-10" />
                            <div>
                                <p className="font-medium">No todos yet</p>
                                <p className="text-sm">Add your first todo to get started.</p>
                            </div>
                        </div>
                    )}

                    {!todosQuery.isLoading && !todosQuery.isError && (todosQuery.data?.length ?? 0) > 0 && (
                        <div className="space-y-3">
                            {todosQuery.data?.map((todo) => (
                                <div
                                    key={todo.id}
                                    className="border-border bg-muted/30 hover:bg-muted/50 flex flex-col gap-3 rounded-lg border p-4 transition"
                                >
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="font-medium text-base sm:text-lg">{todo.title}</h3>
                                                <Badge
                                                    className={cn(
                                                        'flex items-center gap-1 text-xs font-medium',
                                                        statusBadges[todo.status],
                                                    )}
                                                >
                                                    <span>{statusLabels[todo.status]}</span>
                                                </Badge>
                                            </div>
                                            {todo.description && (
                                                <p className="text-muted-foreground mt-1 text-sm">{todo.description}</p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1 self-end sm:self-start">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleOpenEdit(todo)}
                                                disabled={updateMutation.isPending}
                                            >
                                                <Pencil className="size-4" />
                                                <span className="sr-only">Edit todo</span>
                                            </Button>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreVertical className="size-4" />
                                                        <span className="sr-only">Open menu</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Status</DropdownMenuLabel>
                                                    <DropdownMenuSub>
                                                        <DropdownMenuSubTrigger>Change status</DropdownMenuSubTrigger>
                                                        <DropdownMenuSubContent>
                                                            {(Object.keys(statusLabels) as TodoStatus[]).map(
                                                                (status) => (
                                                                    <DropdownMenuItem
                                                                        key={status}
                                                                        onClick={() => handleUpdateStatus(todo, status)}
                                                                        disabled={updateMutation.isPending}
                                                                    >
                                                                        <span className="flex items-center gap-2">
                                                                            <span
                                                                                className={cn(
                                                                                    'rounded-full p-1',
                                                                                    statusBadges[status],
                                                                                )}
                                                                            >
                                                                                {statusIcons[status]}
                                                                            </span>
                                                                            {statusLabels[status]}
                                                                        </span>
                                                                    </DropdownMenuItem>
                                                                ),
                                                            )}
                                                        </DropdownMenuSubContent>
                                                    </DropdownMenuSub>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => handleOpenEdit(todo)}>
                                                        <Pencil className="size-4" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        variant="destructive"
                                                        onClick={() => handleDelete(todo)}
                                                        disabled={deleteMutation.isPending}
                                                    >
                                                        <Trash className="size-4" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>

                                    <p className="text-muted-foreground text-xs">
                                        Updated{' '}
                                        {formatDistanceToNow(new Date(todo.updatedAt ?? todo.createdAt), {
                                            addSuffix: true,
                                        })}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
