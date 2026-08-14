import { config } from '@/lib/config/server'
import { Resend } from 'resend'

const resend = new Resend(config.email.resendApiKey)

export async function sendEmail({
    to,
    subject,
    text,
    html,
    react,
}: {
    to: string
    subject: string
    text?: string
    html?: string
    react?: React.ReactElement
}) {
    try {
        return await resend.emails.send({
            from: config.email.from,
            to,
            subject,
            text,
            html,
            react,
        })
    } catch (error) {
        console.error('Error sending email:', error)
        throw error
    }
}
