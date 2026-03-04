"use client";

import { useState } from "react";

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleCheckout = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        throw new Error(data.message || "Checkout failed.");
      }

      const data = (await response.json()) as { url?: string };
      if (!data.url) {
        throw new Error("Checkout URL was not returned.");
      }

      window.location.href = data.url;
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unexpected error.",
      );
      setIsLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-6">
      <div className="w-full rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Goal Getter + Stripe Checkout
        </h1>
        <p className="mt-3 text-zinc-600">
          Click below to create a Stripe Checkout session from your Next.js API.
        </p>

        <button
          type="button"
          onClick={handleCheckout}
          disabled={isLoading}
          className="mt-8 w-full rounded-lg bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {isLoading ? "Redirecting to Stripe..." : "Pay $10"}
        </button>

        {errorMessage ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </main>
  );
}
