import { NextResponse, type NextRequest } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { db } from '@/db'
import { todos } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { todoIdParamSchema, updateTodoSchema } from '@/lib/validations/todo'

type TodoInsert = typeof todos.$inferInsert

export async function PATCH(request: NextRequest, context: { params: Promise<{ todoId: string }> }) {
    const params = await context.params
    const session = await auth.api.getSession({ headers: request.headers }).catch(() => null)

    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const parseParams = todoIdParamSchema.safeParse(params)
    if (!parseParams.success) {
        return NextResponse.json({ error: parseParams.error.flatten() }, { status: 400 })
    }

    const payload = await request.json().catch(() => null)
    const parsed = updateTodoSchema.safeParse(payload)

    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const updates: Partial<TodoInsert> = {}
    if (parsed.data.title !== undefined) updates.title = parsed.data.title
    if (parsed.data.description !== undefined) updates.description = parsed.data.description
    if (parsed.data.status !== undefined) updates.status = parsed.data.status
    updates.updatedAt = new Date()

    const [updated] = await db
        .update(todos)
        .set(updates)
        .where(and(eq(todos.id, parseParams.data.todoId), eq(todos.userId, session.user.id)))
        .returning()

    if (!updated) {
        return NextResponse.json({ error: 'Todo not found' }, { status: 404 })
    }

    return NextResponse.json({ data: updated })
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ todoId: string }> }) {
    const params = await context.params
    const session = await auth.api.getSession({ headers: request.headers }).catch(() => null)

    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const parseParams = todoIdParamSchema.safeParse(params)
    if (!parseParams.success) {
        return NextResponse.json({ error: parseParams.error.flatten() }, { status: 400 })
    }

    const [deleted] = await db
        .delete(todos)
        .where(and(eq(todos.id, parseParams.data.todoId), eq(todos.userId, session.user.id)))
        .returning()

    if (!deleted) {
        return NextResponse.json({ error: 'Todo not found' }, { status: 404 })
    }

    return NextResponse.json({ data: deleted })
}
