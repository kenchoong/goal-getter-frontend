import { NextResponse } from "next/server";

type OnboardingPayload = {
  stage?: string;
  payload?: Record<string, unknown>;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OnboardingPayload;

    return NextResponse.json({
      ok: true,
      message: "Onboarding data saved (mock).",
      receivedAt: new Date().toISOString(),
      stage: body.stage || "unknown",
      payload: body.payload || {},
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Unable to save onboarding data.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}
