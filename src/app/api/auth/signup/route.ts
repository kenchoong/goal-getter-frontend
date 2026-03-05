import { NextResponse } from "next/server";
import { proxyJsonPost } from "@/lib/backend-api";

type SignUpPayload = {
  fullName?: string;
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SignUpPayload;
    const proxiedResponse = await proxyJsonPost(
      "/api/auth/signup",
      request.url,
      body,
    );
    if (proxiedResponse) {
      return proxiedResponse;
    }

    if (!body.fullName || !body.email || !body.password) {
      return NextResponse.json(
        {
          ok: false,
          message: "fullName, email and password are required.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      userId: "usr_mock",
      email: body.email,
      token: "mock-token",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Unable to sign up.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}
