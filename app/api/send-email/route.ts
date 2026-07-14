import { NextResponse } from "next/server";
import { Resend } from "resend";

type SendEmailBody = {
  to?: string;
  subject?: string;
  message?: string;
  html?: string;
};

export async function POST(req: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "RESEND_API_KEY is missing." },
        { status: 500 }
      );
    }

    const body = (await req.json()) as SendEmailBody;

    const to = body.to?.trim();
    const subject = body.subject?.trim();
    const message = body.message?.trim();
    const html = body.html?.trim();

    if (!to || !subject || (!message && !html)) {
      return NextResponse.json(
        {
          error:
            "Recipient, subject, and either an HTML or plain-text message are required.",
        },
        { status: 400 }
      );
    }

    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from: "DealHaus <invoices@dealhaus.us>",
      to,
      subject,
      text: message || "Your DealHaus commission invoice is attached below.",
      html,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Email send failed." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Email send failed.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}