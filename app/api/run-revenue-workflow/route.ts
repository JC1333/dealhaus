import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runRevenueWorkflow } from "@/app/components/workflows/RevenueWorkflow";

export const runtime = "nodejs";

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Supabase server credentials are missing.",
        },
        { status: 500 }
      );
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey
    );

    const result = await runRevenueWorkflow(supabase);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Revenue workflow failed.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
