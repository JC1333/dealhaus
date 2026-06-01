import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(req: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'RESEND_API_KEY is missing' },
        { status: 500 }
      )
    }

    const resend = new Resend(apiKey)
    const body = await req.json()

    const { to, subject, message } = body

    const data = await resend.emails.send({
      from: 'DealHaus <onboarding@resend.dev>',
      to,
      subject,
      text: message,
    })

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Email send failed' },
      { status: 500 }
    )
  }
}