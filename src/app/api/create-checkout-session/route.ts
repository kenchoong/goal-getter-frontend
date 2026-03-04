import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const stripe = getStripeClient();
    const origin =
      process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Goal Getter Pro",
              description: "One-time checkout example with Stripe",
            },
            unit_amount: 1000,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel`,
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
