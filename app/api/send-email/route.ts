import { NextResponse } from "next/server";
import { Resend } from "resend";

type SendEmailBody = {
  to?: string;
  subject?: string;
  message?: string;
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

    if (!to || !subject || !message) {
      return NextResponse.json(
        {
          error:
            "Email recipient, subject, and message are all required.",
        },
        { status: 400 }
      );
    }

    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from: "DealHaus <onboarding@resend.dev>",
      to,
      subject,
      text: message,
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