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

3. Set your env values in `.env.local`:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:4331
API_URL=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_...
```

4. Run the app:

```bash
npm run dev
```

The app runs at [http://localhost:4331](http://localhost:4331).

`NEXT_PUBLIC_APP_URL` is your frontend app URL (used for Stripe checkout redirect
URLs). `API_URL` is the backend API base URL used by Next.js route handlers.
Client calls go to `/api/*` on this frontend and are proxied server-side to
`API_URL` when configured.

## Included Stripe Flow

- `POST /api/create-checkout-session` creates a Stripe Checkout session
- `/` has a checkout button that redirects to Stripe
- `/success` and `/cancel` are checkout return pages
