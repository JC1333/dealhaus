import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const title = body.title

    const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    {
      role: 'system',
      content:
        'You are an expert luxury marketplace listing generator. Return structured JSON only.',
    },
    {
      role: 'user',
      content: `Generate a marketplace listing for: ${title}`,
    },
  ],
})

let aiData

try {
  aiData = JSON.parse(
    response.choices[0].message.content || '{}'
  )
} catch {
  aiData = {}
}

const generated = {
  title,
  description:
    aiData.description ||
    `High-quality ${title} in excellent condition.`,
  category: aiData.category || 'General',
  condition: aiData.condition || 'Good',
  ai_score: aiData.ai_score || 85,
  featured: aiData.featured || false,
  price: aiData.price || 1000,
}

    return NextResponse.json(generated)
  } catch (error) {
    console.log(error)

    return NextResponse.json(
      {
        error: 'Generation failed',
      },
      {
        status: 500,
      }
    )
  }
}