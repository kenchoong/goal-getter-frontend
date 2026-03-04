# Goal Getter Frontend

Next.js app scaffolded with Stripe Checkout integration.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create your env file:

```bash
cp .env.example .env.local
```

3. Put your Stripe test secret key into `.env.local`:

```bash
STRIPE_SECRET_KEY=sk_test_...
```

4. Run the app:

```bash
npm run dev
```

The app runs at [http://localhost:4331](http://localhost:4331).

## Included Stripe Flow

- `POST /api/create-checkout-session` creates a Stripe Checkout session
- `/` has a checkout button that redirects to Stripe
- `/success` and `/cancel` are checkout return pages
