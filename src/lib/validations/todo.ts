import { z } from 'zod'

export const todoStatusSchema = z.enum(['pending', 'in_progress', 'completed'])

const descriptionField = z
    .string()
    .max(1024)
    .optional()
    .transform((value) => {
        if (typeof value !== 'string') return value
        const trimmed = value.trim()
        return trimmed.length > 0 ? trimmed : undefined
    })

export const createTodoSchema = z.object({
    title: z.string().min(1, { message: 'Title is required' }).max(255),
    description: descriptionField,
})

export const updateTodoSchema = z
    .object({
        title: z.string().min(1).max(255).optional(),
        description: descriptionField,
        status: todoStatusSchema.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field must be provided',
    })

export const todoIdParamSchema = z.object({
    todoId: z.string().min(1, { message: 'Todo id is required' }),
})

export type TodoStatus = z.infer<typeof todoStatusSchema>
export type CreateTodoInput = z.input<typeof createTodoSchema>
export type UpdateTodoInput = z.input<typeof updateTodoSchema>
