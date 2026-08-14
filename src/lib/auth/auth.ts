import { db } from '@/db'
import * as schema from '@/db/schema/auth'
import { config } from '@/lib/config/server'
import { getURL } from '@/lib/utils/utils'
import { betterAuth } from 'better-auth'
import { APIError } from 'better-auth/api'
import { emailHarmony } from 'better-auth-harmony'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { sendEmail } from './email'

export const auth = betterAuth({
    appName: config.app.name,
    baseURL: getURL(),
    database: drizzleAdapter(db, {
        provider: 'pg',
        schema: schema,
        usePlural: true,
    }),
    session: {
        freshAge: 0,
        cookieCache: {
            enabled: true,
            maxAge: 60 * 5,
        },
    },
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
        sendResetPassword: async ({ user, url }) => {
            await sendEmail({
                to: user.email,
                subject: 'Reset your password',
                html: `
              <h1>Reset Your Password</h1>
              <p>Click the link below to reset your password:</p>
              <a href="${url}" style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 6px;">Reset Password</a>
              <p>If you didn't request this password reset, you can safely ignore this email.</p>
            `,
                text: `Click the link to reset your password: ${url}`,
            })
        },
    },
    user: {
        changeEmail: {
            enabled: true,
            sendChangeEmailVerification: async ({ newEmail, url }) => {
                await sendEmail({
                    to: newEmail,
                    subject: 'Verify your new email address',
                    html: `
                  <h1>Verify your new email address</h1>
                  <p>Please click the link below to verify your new email address:</p>
                  <a href="${url}" style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 6px;">Verify Email</a>
                  <p>If you didn't request this verification, you can safely ignore this email.</p>
                `,
                    text: `Click the link to verify your new email: ${url}`,
                })
            },
        },
        deleteUser: {
            enabled: true,
            sendDeleteAccountVerification: async ({ user, url }) => {
                await sendEmail({
                    to: user.email,
                    subject: 'Confirm Account Deletion',
                    html: `
                  <h1>Account Deletion Confirmation</h1>
                  <p>We received a request to delete your ${config.app.name} account. This action cannot be undone.</p>
                  <p>Click the link below to permanently delete your account:</p>
                  <a href="${url}" style="display: inline-block; padding: 12px 24px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 6px;">Delete Account</a>
                  <p>If you didn't request this deletion, you can safely ignore this email.</p>
                  <p>This link will expire in 1 hour.</p>
                `,
                    text: `Click the link to delete your account: ${url}. This action cannot be undone.`,
                })
            },
            beforeDelete: async (user) => {
                if (user.email.includes('admin')) {
                    throw new APIError('BAD_REQUEST', {
                        message: "Admin accounts can't be deleted",
                    })
                }
            },
            afterDelete: async (user) => {
                // You could add cleanup logic here if needed
                console.log(`User ${user.id} has been deleted`)
            },
        },
    },
    account: {
        accountLinking: {
            // enabled: true,
            // trustedProviders: ['google'],
            allowDifferentEmails: true,
        },
    },
    plugins: [nextCookies(), emailHarmony()],
})

export type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>
