import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const stripe = getStripeClient();
    const origin =
      process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const body = (await request.json().catch(() => ({}))) as {
      plan?: "monthly" | "lifetime";
    };

    const plan = body.plan === "lifetime" ? "lifetime" : "monthly";
    const isMonthly = plan === "monthly";

    const session = await stripe.checkout.sessions.create({
      mode: isMonthly ? "subscription" : "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: isMonthly ? "Goal Getter Monthly" : "Goal Getter Lifetime",
              description: isMonthly
                ? "Coaching and accountability, billed monthly"
                : "One-time lifetime access",
            },
            unit_amount: isMonthly ? 500 : 4900,
            ...(isMonthly ? { recurring: { interval: "month" } } : {}),
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/?checkout=success&plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=cancel&plan=${plan}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to create Stripe checkout session.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
