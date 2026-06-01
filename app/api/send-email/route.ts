import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET() {

  try {

    const data = await resend.emails.send({

      from: 'onboarding@resend.dev',

      to: 'crystalb8384@icloud.com',

      subject: 'DealHaus AI Outreach Test',

     html: `
  <div style="background:black;color:white;padding:40px;font-family:sans-serif">

    <h1 style="font-size:32px;margin-bottom:20px;">
      DealHaus Acquisition Opportunity
    </h1>

    <p style="font-size:18px;line-height:1.7;color:#d4d4d4;">

      Our AI acquisition system identified exceptionally strong buyer demand
      for inventory matching your listing profile.

    </p>

    <div style="margin-top:30px;padding:25px;border:1px solid #333;border-radius:20px;background:#111;">

      <p style="color:#22d3ee;font-size:14px;">
        AI MARKET SIGNAL
      </p>

      <h2 style="font-size:28px;margin-top:10px;">
        High Probability Acquisition Match
      </h2>

      <p style="margin-top:15px;color:#aaa;line-height:1.7;">
        DealHaus currently has active buyer demand and acquisition capital
        available for fast-moving inventory opportunities.
      </p>

    </div>

    <p style="margin-top:35px;color:#999;line-height:1.7;">

      If interested, reply directly to begin AI-assisted negotiations and accelerated closing analysis.

    </p>

  </div>
`,

    })

    return Response.json(data)

  } catch (error) {

    return Response.json({ error })

  }

}