import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod'
import {
    createTodoSchema,
    todoStatusSchema,
    updateTodoSchema,
    type CreateTodoInput,
    type TodoStatus,
    type UpdateTodoInput,
} from '@/lib/validations/todo'

const todoResponseSchema = z.object({
    data: z.array(
        z.object({
            id: z.string(),
            title: z.string(),
            description: z.string().nullable().optional(),
            status: todoStatusSchema,
            userId: z.string(),
            createdAt: z.coerce.date(),
            updatedAt: z.coerce.date(),
        }),
    ),
})

const todoEntitySchema = todoResponseSchema.shape.data.element

export type Todo = z.infer<typeof todoEntitySchema>

export type TodosFilters = {
    status?: TodoStatus | 'all'
}

const fetchTodos = async (filters?: TodosFilters): Promise<Todo[]> => {
    const params = new URLSearchParams()
    if (filters?.status && filters.status !== 'all') {
        params.set('status', filters.status)
    }

    const response = await fetch(`/api/todos${params.size ? `?${params.toString()}` : ''}`, {
        credentials: 'include',
    })

    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: { message: 'Failed to fetch todos' } }))
        throw new Error(errorBody.error?.message ?? 'Failed to fetch todos')
    }

    const result = await response.json()
    const parsed = todoResponseSchema.safeParse(result)

    if (!parsed.success) {
        throw new Error('Invalid data format received for todos')
    }

    return parsed.data.data
}

const createTodo = async (input: CreateTodoInput): Promise<Todo> => {
    const payload = createTodoSchema.parse(input)

    const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
    })

    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: { message: 'Failed to create todo' } }))
        throw new Error(errorBody.error?.message ?? 'Failed to create todo')
    }

    const result = await response.json()
    const parsed = todoEntitySchema.safeParse(result.data)

    if (!parsed.success) {
        throw new Error('Invalid data format received for todo')
    }

    return parsed.data
}

const updateTodo = async ({ id, data }: { id: string; data: UpdateTodoInput }): Promise<Todo> => {
    const payload = updateTodoSchema.parse(data)

    const response = await fetch(`/api/todos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
    })

    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: { message: 'Failed to update todo' } }))
        throw new Error(errorBody.error?.message ?? 'Failed to update todo')
    }

    const result = await response.json()
    const parsed = todoEntitySchema.safeParse(result.data)

    if (!parsed.success) {
        throw new Error('Invalid data format received for todo')
    }

    return parsed.data
}

const deleteTodo = async (id: string): Promise<Todo> => {
    const response = await fetch(`/api/todos/${id}`, {
        method: 'DELETE',
        credentials: 'include',
    })

    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: { message: 'Failed to delete todo' } }))
        throw new Error(errorBody.error?.message ?? 'Failed to delete todo')
    }

    const result = await response.json()
    const parsed = todoEntitySchema.safeParse(result.data)

    if (!parsed.success) {
        throw new Error('Invalid data format received for todo')
    }

    return parsed.data
}

export function useTodosQuery(filters?: TodosFilters) {
    return useQuery({
        queryKey: ['todos', filters],
        queryFn: () => fetchTodos(filters),
        staleTime: 1000 * 15,
    })
}

export function useCreateTodoMutation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: createTodo,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['todos'] })
            toast.success('Todo created')
        },
        onError: (error: Error) => {
            toast.error(error.message)
        },
    })
}

export function useUpdateTodoMutation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: updateTodo,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['todos'] })
            toast.success('Todo updated')
        },
        onError: (error: Error) => {
            toast.error(error.message)
        },
    })
}

export function useDeleteTodoMutation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: deleteTodo,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['todos'] })
            toast.success('Todo deleted')
        },
        onError: (error: Error) => {
            toast.error(error.message)
        },
    })
}
