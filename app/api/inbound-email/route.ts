import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log("DealHaus inbound email webhook received:", body);

    return NextResponse.json({
      success: true,
      message: "DealHaus inbound email webhook received.",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Inbound email webhook failed.";

    console.error("DealHaus inbound email webhook error:", error);

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}