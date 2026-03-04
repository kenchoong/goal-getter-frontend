# Onboarding API Spec

This file summarizes the APIs needed for the onboarding flow.

## 1) Save Onboarding Progress (Implemented)
- Endpoint: `POST /api/onboarding`
- Purpose: Save progress for each onboarding step (currently mocked).

### Input expected
```json
{
  "stage": "signup_completed",
  "payload": {
    "fullName": "Ken",
    "email": "ken@example.com"
  }
}
```

### Output expected
```json
{
  "ok": true,
  "message": "Onboarding data saved (mock).",
  "receivedAt": "2026-03-04T15:42:12.123Z",
  "stage": "signup_completed",
  "payload": {
    "fullName": "Ken",
    "email": "ken@example.com"
  }
}
```

## 2) Calculate End Goal vs Stage 1 Breakdown (Implemented)
- Endpoint: `POST /api/goal-breakdown`
- Purpose: API totals Step 4 amounts and compares against Step 3 end-goal amount.

### Input expected
```json
{
  "endGoalAmount": "120,000",
  "shortTermDebt": "8,000",
  "purchases": [
    { "name": "Laptop", "amount": "3,500" },
    { "name": "Camera", "amount": "2,100" }
  ],
  "trips": [
    { "name": "Japan", "amount": "4,000" }
  ],
  "parentGiftAmount": "5,000"
}
```

### Output expected
```json
{
  "ok": true,
  "summary": {
    "endGoalAmount": 120000,
    "firstStageTotal": 22600,
    "remainingToEndGoal": 97400,
    "overTargetBy": 0,
    "progressToEndGoalPct": 18.8333333333
  },
  "categories": [
    {
      "key": "shortTermDebt",
      "label": "Short-term debt",
      "amount": 8000,
      "stageSharePct": 35.3982300885,
      "endGoalSharePct": 6.6666666667
    }
  ]
}
```

## 3) Create Stripe Checkout Session (Implemented)
- Endpoint: `POST /api/create-checkout-session`
- Purpose: Create Stripe Checkout for monthly or lifetime plan.

### Input expected
```json
{
  "plan": "monthly"
}
```
- `plan` accepted values: `monthly`, `lifetime`.

### Output expected
```json
{
  "url": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

## 4) Stripe Webhook (Needed for Production)
- Endpoint: `POST /api/stripe/webhook`
- Purpose: Confirm real payment status server-side and persist subscription/payment state.

### Input expected
- Raw Stripe event payload + Stripe signature header.

### Output expected
```json
{ "received": true }
```

## 5) Auth: Sign Up (Needed for Production)
- Endpoint: `POST /api/auth/signup`
- Purpose: Create user account and return session/token.

### Input expected
```json
{
  "fullName": "Ken",
  "email": "ken@example.com",
  "password": "strong-password"
}
```

### Output expected
```json
{
  "userId": "usr_123",
  "email": "ken@example.com",
  "token": "jwt-or-session-token"
}
```

## 6) Auth: Login (Needed for Production)
- Endpoint: `POST /api/auth/login`
- Purpose: Authenticate existing user from the "Login instead" path.

### Input expected
```json
{
  "email": "ken@example.com",
  "password": "strong-password"
}
```

### Output expected
```json
{
  "userId": "usr_123",
  "email": "ken@example.com",
  "token": "jwt-or-session-token"
}
```

## 7) Reminder Scheduling (Needed for Production)
- Endpoint: `POST /api/reminders`
- Purpose: Save reminder time and queue email delivery for video follow-up.

### Input expected
```json
{
  "userId": "usr_123",
  "email": "ken@example.com",
  "reminderAt": "2026-03-05T09:00:00+08:00",
  "context": "onboarding_video"
}
```

### Output expected
```json
{
  "ok": true,
  "reminderId": "rem_123",
  "status": "scheduled"
}
```

## Notes
- Amount inputs are sent as formatted strings (example: `"12,500"`) and parsed by API.
- API should store all progress snapshots per `stage` for analytics and drop-off tracking.
- For production, payment completion state should be driven by webhook events, not only redirect query params.
