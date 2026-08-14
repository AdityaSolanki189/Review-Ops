import { pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { users } from './auth'

export const todoStatusEnum = pgEnum('todo_status', ['pending', 'in_progress', 'completed'])

export const todos = pgTable('todos', {
    id: text().primaryKey(),
    title: text().notNull(),
    description: text(),
    status: todoStatusEnum().notNull().default('pending'),
    userId: text()
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp().notNull(),
    updatedAt: timestamp().notNull(),
})
