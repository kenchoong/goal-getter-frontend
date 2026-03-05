import { NextResponse } from "next/server";

const backendBaseUrl =
  process.env.API_URL?.trim() || process.env.NEXT_PUBLIC_API_URL?.trim() || "";

const toJsonResponse = (body: string, status: number, contentType: string | null) =>
  new NextResponse(body, {
    status,
    headers: {
      "Content-Type": contentType || "application/json; charset=utf-8",
    },
  });

export const getBackendUrl = (path: string, requestUrl?: string) => {
  if (!backendBaseUrl) {
    return null;
  }

  const backendUrl = new URL(path, backendBaseUrl);

  // Prevent accidental self-calls when backend URL points to the same origin.
  if (requestUrl) {
    const requestOrigin = new URL(requestUrl).origin;
    if (backendUrl.origin === requestOrigin) {
      return null;
    }
  }

  return backendUrl.toString();
};

export const proxyJsonPost = async (
  path: string,
  requestUrl: string,
  payload: unknown,
) => {
  const targetUrl = getBackendUrl(path, requestUrl);
  if (!targetUrl) {
    return null;
  }

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const bodyText = await response.text();
    return toJsonResponse(
      bodyText,
      response.status,
      response.headers.get("content-type"),
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Failed to reach backend API.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 },
    );
  }
};
