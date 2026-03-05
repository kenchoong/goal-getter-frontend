import { NextResponse } from "next/server";
import { proxyJsonPost } from "@/lib/backend-api";

type OnboardingPayload = {
  stage?: string;
  payload?: Record<string, unknown>;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OnboardingPayload;
    const proxiedResponse = await proxyJsonPost(
      "/api/onboarding",
      request.url,
      body,
    );
    if (proxiedResponse) {
      return proxiedResponse;
    }

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
