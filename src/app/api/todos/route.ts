import { NextResponse, type NextRequest } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { db } from '@/db'
import { todos } from '@/db/schema'
import { and, desc, eq } from 'drizzle-orm'
import { createTodoSchema, todoStatusSchema } from '@/lib/validations/todo'

export async function GET(request: NextRequest) {
    const session = await auth.api.getSession({ headers: request.headers }).catch(() => null)

    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const statusParam = searchParams.get('status')
    const parsedStatus = statusParam ? todoStatusSchema.safeParse(statusParam) : null
    const status = parsedStatus?.success ? parsedStatus.data : undefined

    const conditions = [eq(todos.userId, session.user.id)]
    if (status) {
        conditions.push(eq(todos.status, status))
    }

    const data = await db
        .select()
        .from(todos)
        .where(conditions.length > 1 ? and(...conditions) : conditions[0])
        .orderBy(desc(todos.createdAt))

    return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
    const session = await auth.api.getSession({ headers: request.headers }).catch(() => null)

    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const json = await request.json()
    const parsed = createTodoSchema.safeParse(json)

    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const now = new Date()
    const newTodo = {
        id: crypto.randomUUID(),
        title: parsed.data.title,
        description: parsed.data.description,
        status: 'pending' as const,
        userId: session.user.id,
        createdAt: now,
        updatedAt: now,
    }

    const [inserted] = await db.insert(todos).values(newTodo).returning()

    return NextResponse.json({ data: inserted }, { status: 201 })
}
