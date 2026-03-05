"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Step = 0 | 1 | 2 | 3 | 4 | 5;
type Plan = "monthly" | "lifetime";

type MoneyRow = {
  id: string;
  name: string;
  amount: string;
};

type OnboardingData = {
  fullName: string;
  email: string;
  password: string;
  primaryGoal: string;
  targetAmount: string;
  shortTermDebt: string;
  purchases: MoneyRow[];
  trips: MoneyRow[];
  parentGiftAmount: string;
  reminderAt: string;
};

type GoalBreakdownCategory = {
  key: string;
  label: string;
  amount: number;
  stageSharePct: number;
  endGoalSharePct: number;
};

type GoalBreakdownSummary = {
  endGoalAmount: number;
  firstStageTotal: number;
  remainingToEndGoal: number;
  overTargetBy: number;
  progressToEndGoalPct: number;
};

type GoalBreakdownResponse = {
  ok: boolean;
  summary: GoalBreakdownSummary;
  categories: GoalBreakdownCategory[];
  message?: string;
};

const STORAGE_KEY = "goal-getter-onboarding-v1";
const TOTAL_STEPS = 6;
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
const apiUrl = (path: string) =>
  API_BASE_URL ? new URL(path, API_BASE_URL).toString() : path;

const i18n = {
  appHeader: "Road to 1st step of success (3 mins)",
  stepOf: (current: number, total: number) => `Step ${current} of ${total}`,
  status: {
    paymentSuccess: "Payment successful. Your onboarding is now unlocked.",
    paymentCanceled: "Checkout was canceled. Complete payment to continue.",
    chooseGoal: "Choose your 6-month goal before continuing.",
    addTargetAmount: "Tell us the exact amount you want in the next 6 months.",
    addConcreteReason:
      "Add at least one concrete reason so this goal becomes real.",
    stripeFailed: "Unable to start Stripe checkout. Check your Stripe keys.",
    checkoutUnexpected: "Unexpected checkout error.",
    reminderPickTime: "Pick a reminder time first.",
    reminderNeedEmail: "Add an email so we know where to send the reminder.",
    reminderSet: (time: string) => `Reminder scheduled for ${time} (mock email).`,
    breakdownFailed: "Unable to calculate the stage breakdown right now.",
    loginPlaceholder:
      "Login flow can be connected next. Please continue with sign up for now.",
  },
  actions: {
    createAccount: "Create account",
    saving: "Saving...",
    back: "Back",
    next: "Next",
    continue: "Continue",
    startGoalImmediately: "Start Acheive your goal immediately",
    payWithStripe: "Pay with Stripe",
    redirectingStripe: "Redirecting to Stripe...",
    skipAndRemind: "Skip now and set reminder",
    addRow: "+ Add",
    removeRow: "Remove",
  },
  signup: {
    title: "Before anything else, register your account to kickstart your journey.",
    subtitle:
      "We only ask for the basics first, then we guide you one decision at a time.",
    fullNameLabel: "Full name",
    fullNamePlaceholder: "Your name",
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    passwordLabel: "Password",
    passwordPlaceholder: "Create password",
    loginInstead: "Login instead",
  },
  goal: {
    title: (name: string) =>
      `Congratulations${name ? `, ${name}` : ""}. This is your first step to achieve your goals.`,
    subtitle: "What is the goal you want to achieve in the next 6 months?",
    option: "Make Big Money",
    optionHint: "Only option for now",
  },
  income: {
    title: "I am here to really help you achieve your goals.",
    subtitle:
      "This number is your end goal in 6 months. Set the final amount you are aiming for.",
    label: "End goal amount (6 months)",
    placeholder: "e.g. 50,000",
  },
  details: {
    title: "Now let's define your Stage 1 goals.",
    subtitle: "Turn your goal into real meaning. Fill in the details below.",
    debtLabel: "Short-term debt amount (if any)",
    debtPlaceholder: "e.g. 8,000",
    purchasesTitle: "What do you want to buy?",
    purchasesNamePlaceholder: "Thing",
    purchasesAmountPlaceholder: "Amount",
    tripsTitle: "Any trip you want to go?",
    tripsNamePlaceholder: "Place",
    tripsAmountPlaceholder: "How much",
    parentsLabel: "Give your dad and mum",
    parentsPlaceholder: "How much",
  },
  summary: {
    title: "Your end goal vs Stage 1 goal map",
    subtitle:
      "Stage 3 is your end goal amount. Stage 4 data is your first-stage plan. We total and break it down by category here.",
    loading: "Calculating your Stage 1 totals...",
    metrics: {
      endGoal: "End goal amount",
      firstStageTotal: "Stage 1 total",
      progress: "Progress to end goal",
      gap: "Remaining gap",
      overTarget: "Above end goal",
    },
    labels: {
      mainGoal: "Main goal",
      targetAmount: "End goal for next 6 months",
      shortTermDebt: "Short-term debt",
      thingsToBuy: "Things to buy",
      trips: "Trips",
      parents: "For dad and mum",
    },
    categoryBreakdownTitle: "Stage 1 category breakdown",
    empty: {
      targetAmount: "Not set",
      shortTermDebt: "None",
      list: "None listed",
      parents: "Not set",
    },
  },
  paywall: {
    chip: "Step to unlock",
    title: "Choose your access plan",
    subtitle: "You need to complete payment to proceed.",
    done: "Payment completed. Continue below.",
    monthlyLabel: "Monthly",
    monthlyPrice: "5 USD",
    monthlyTerm: "per month",
    lifetimeLabel: "Lifetime Access",
    lifetimePrice: "49 USD",
    lifetimeTerm: "one-time payment",
  },
  video: {
    title: "Great. Watch this video for 2 hours first.",
    subtitle:
      "Focus on this before taking your next action. If you want to skip now, set a reminder time and we will send a follow-up email (mock).",
    reminderLabel: "Pick a reminder time",
    reminderTo: (email: string) => `Reminder email will go to: ${email || "your email"}`,
  },
} as const;

const initialData: OnboardingData = {
  fullName: "",
  email: "",
  password: "",
  primaryGoal: "",
  targetAmount: "",
  shortTermDebt: "",
  purchases: [],
  trips: [],
  parentGiftAmount: "",
  reminderAt: "",
};

const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const formatAmountInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) {
    return "";
  }
  const normalized = digits.replace(/^0+(?=\d)/, "");
  return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const formatUsd = (amount: number) => `${amount.toLocaleString("en-US")} USD`;
const formatPercent = (value: number) => `${value.toFixed(1)}%`;

export default function HomePage() {
  const [step, setStep] = useState<Step>(0);
  const [form, setForm] = useState<OnboardingData>(initialData);
  const [pendingPurchase, setPendingPurchase] = useState({
    name: "",
    amount: "",
  });
  const [pendingTrip, setPendingTrip] = useState({
    name: "",
    amount: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState<Plan | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"unpaid" | "paid">(
    "unpaid",
  );
  const [goalBreakdown, setGoalBreakdown] = useState<GoalBreakdownResponse | null>(
    null,
  );
  const [isBreakdownLoading, setIsBreakdownLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const progressValue = useMemo(
    () => ((step + 1) / TOTAL_STEPS) * 100,
    [step],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const savedDataRaw = window.localStorage.getItem(STORAGE_KEY);
    if (savedDataRaw) {
      try {
        const savedData = JSON.parse(savedDataRaw) as Partial<OnboardingData> & {
          step?: number;
          paymentStatus?: "paid" | "unpaid";
        };
        setForm((prev) => ({
          ...prev,
          ...savedData,
          password: "",
        }));
        if (typeof savedData.step === "number" && savedData.step >= 0) {
          setStep(Math.min(savedData.step, 5) as Step);
        }
        if (savedData.paymentStatus === "paid") {
          setPaymentStatus("paid");
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }

    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (checkout === "success") {
      setPaymentStatus("paid");
      setStep(5);
      setStatusMessage(i18n.status.paymentSuccess);
      void fetch(apiUrl("/api/onboarding"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: "checkout_completed",
          payload: {
            plan: params.get("plan") || "unknown",
            sessionId: params.get("session_id") || null,
          },
        }),
      });
    } else if (checkout === "cancel") {
      setStep(5);
      setStatusMessage(i18n.status.paymentCanceled);
    }

    if (checkout) {
      params.delete("checkout");
      params.delete("plan");
      params.delete("session_id");
      const query = params.toString();
      window.history.replaceState({}, "", query ? `/?${query}` : "/");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...form,
        password: "",
        step,
        paymentStatus,
      }),
    );
  }, [form, step, paymentStatus]);

  useEffect(() => {
    if (step !== 4) {
      return;
    }
    void loadGoalBreakdown();
    // Keep this summary reactive to Step 3 + Step 4 data changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    step,
    form.targetAmount,
    form.shortTermDebt,
    form.parentGiftAmount,
    form.purchases,
    form.trips,
  ]);

  const saveProgress = async (stage: string, payload: Record<string, unknown>) => {
    try {
      await fetch(apiUrl("/api/onboarding"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stage,
          payload,
        }),
      });
    } catch (error) {
      console.error(error);
    }
  };

  const loadGoalBreakdown = async () => {
    setIsBreakdownLoading(true);
    try {
      const response = await fetch(apiUrl("/api/goal-breakdown"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endGoalAmount: form.targetAmount,
          shortTermDebt: form.shortTermDebt,
          purchases: form.purchases,
          trips: form.trips,
          parentGiftAmount: form.parentGiftAmount,
        }),
      });

      const data = (await response.json()) as GoalBreakdownResponse;
      if (!response.ok || !data.ok) {
        throw new Error(data.message || i18n.status.breakdownFailed);
      }

      setGoalBreakdown(data);
    } catch (error) {
      setGoalBreakdown(null);
      setStatusMessage(
        error instanceof Error ? error.message : i18n.status.breakdownFailed,
      );
    } finally {
      setIsBreakdownLoading(false);
    }
  };

  const goToStep = async (nextStep: Step, stage: string) => {
    setIsSaving(true);
    setStatusMessage("");
    try {
      await saveProgress(stage, form);
      setStep(nextStep);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await goToStep(1, "signup_completed");
  };

  const handleGoalContinue = async () => {
    if (!form.primaryGoal) {
      setStatusMessage(i18n.status.chooseGoal);
      return;
    }
    await goToStep(2, "goal_selected");
  };

  const handleIncomeContinue = async () => {
    if (!form.targetAmount.trim()) {
      setStatusMessage(i18n.status.addTargetAmount);
      return;
    }
    await goToStep(3, "income_target_set");
  };

  const handleDetailsContinue = async () => {
    const hasDetails =
      Boolean(form.shortTermDebt.trim()) ||
      form.purchases.length > 0 ||
      form.trips.length > 0 ||
      Boolean(form.parentGiftAmount.trim());

    if (!hasDetails) {
      setStatusMessage(i18n.status.addConcreteReason);
      return;
    }
    await goToStep(4, "goal_details_completed");
  };

  const addPurchase = () => {
    if (!pendingPurchase.name.trim() || !pendingPurchase.amount.trim()) {
      return;
    }
    setForm((prev) => ({
      ...prev,
      purchases: [
        ...prev.purchases,
        {
          id: makeId(),
          name: pendingPurchase.name.trim(),
          amount: pendingPurchase.amount.trim(),
        },
      ],
    }));
    setPendingPurchase({ name: "", amount: "" });
  };

  const addTrip = () => {
    if (!pendingTrip.name.trim() || !pendingTrip.amount.trim()) {
      return;
    }
    setForm((prev) => ({
      ...prev,
      trips: [
        ...prev.trips,
        {
          id: makeId(),
          name: pendingTrip.name.trim(),
          amount: pendingTrip.amount.trim(),
        },
      ],
    }));
    setPendingTrip({ name: "", amount: "" });
  };

  const handleCheckout = async (plan: Plan) => {
    setStatusMessage("");
    setIsCheckingOut(plan);
    try {
      await saveProgress("checkout_started", { ...form, plan });
      const response = await fetch(apiUrl("/api/create-checkout-session"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan }),
      });

      const data = (await response.json()) as {
        url?: string;
        message?: string;
      };

      if (!response.ok || !data.url) {
        throw new Error(data.message || i18n.status.stripeFailed);
      }

      window.location.href = data.url;
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : i18n.status.checkoutUnexpected,
      );
      setIsCheckingOut(null);
    }
  };

  const handleSetReminder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.reminderAt) {
      setStatusMessage(i18n.status.reminderPickTime);
      return;
    }
    if (!form.email) {
      setStatusMessage(i18n.status.reminderNeedEmail);
      return;
    }

    setIsSaving(true);
    setStatusMessage("");
    try {
      await saveProgress("video_reminder_set", {
        email: form.email,
        reminderAt: form.reminderAt,
      });
      const formattedTime = new Date(form.reminderAt).toLocaleString();
      setStatusMessage(i18n.status.reminderSet(formattedTime));
    } finally {
      setIsSaving(false);
    }
  };

  const goBack = () => {
    setStatusMessage("");
    setStep((prevStep) => Math.max(prevStep - 1, 0) as Step);
  };

  const renderStep = () => {
    if (step === 0) {
      return (
        <form onSubmit={handleSignUp} className="space-y-6">
          <div>
            <p className="chip">{i18n.stepOf(1, TOTAL_STEPS)}</p>
            <h1 className="mt-4 text-3xl font-semibold leading-tight text-slate-900">
              {i18n.signup.title}
            </h1>
            <p className="mt-3 text-slate-700">{i18n.signup.subtitle}</p>
          </div>

          <div className="grid gap-4">
            <label className="field-label" htmlFor="fullName">
              {i18n.signup.fullNameLabel}
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={form.fullName}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, fullName: event.target.value }))
              }
              className="field-input"
              placeholder={i18n.signup.fullNamePlaceholder}
            />
            <label className="field-label" htmlFor="email">
              {i18n.signup.emailLabel}
            </label>
            <input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, email: event.target.value }))
              }
              className="field-input"
              placeholder={i18n.signup.emailPlaceholder}
            />
            <label className="field-label" htmlFor="password">
              {i18n.signup.passwordLabel}
            </label>
            <input
              id="password"
              type="password"
              required
              value={form.password}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, password: event.target.value }))
              }
              className="field-input"
              placeholder={i18n.signup.passwordPlaceholder}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <a
              href="#"
              onClick={(event) => {
                event.preventDefault();
                setStatusMessage(i18n.status.loginPlaceholder);
              }}
              className="text-sm font-medium text-teal-700 underline underline-offset-4"
            >
              {i18n.signup.loginInstead}
            </a>
            <button
              type="submit"
              disabled={isSaving}
              className="action-button"
            >
              {isSaving ? i18n.actions.saving : i18n.actions.createAccount}
            </button>
          </div>
        </form>
      );
    }

    if (step === 1) {
      return (
        <div className="space-y-6">
          <div>
            <p className="chip">{i18n.stepOf(2, TOTAL_STEPS)}</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight text-slate-900">
              {i18n.goal.title(form.fullName)}
            </h2>
            <p className="mt-3 text-slate-700">{i18n.goal.subtitle}</p>
          </div>

          <button
            type="button"
            onClick={() =>
              setForm((prev) => ({ ...prev, primaryGoal: i18n.goal.option }))
            }
            className={`goal-option ${
              form.primaryGoal === i18n.goal.option ? "goal-option-active" : ""
            }`}
          >
            <span>{i18n.goal.option}</span>
            <span className="text-xs uppercase tracking-wide text-slate-500">
              {i18n.goal.optionHint}
            </span>
          </button>

          <div className="flex justify-between gap-3">
            <button type="button" onClick={goBack} className="secondary-button">
              {i18n.actions.back}
            </button>
            <button
              type="button"
              onClick={() => void handleGoalContinue()}
              disabled={isSaving}
              className="action-button"
            >
              {isSaving ? i18n.actions.saving : i18n.actions.next}
            </button>
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="space-y-6">
          <div>
            <p className="chip">{i18n.stepOf(3, TOTAL_STEPS)}</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight text-slate-900">
              {i18n.income.title}
            </h2>
            <p className="mt-3 text-slate-700">{i18n.income.subtitle}</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="targetAmount" className="field-label">
              {i18n.income.label}
            </label>
            <input
              id="targetAmount"
              type="text"
              value={form.targetAmount}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  targetAmount: formatAmountInput(event.target.value),
                }))
              }
              className="field-input"
              placeholder={i18n.income.placeholder}
            />
          </div>

          <div className="flex justify-between gap-3">
            <button type="button" onClick={goBack} className="secondary-button">
              {i18n.actions.back}
            </button>
            <button
              type="button"
              onClick={() => void handleIncomeContinue()}
              disabled={isSaving}
              className="action-button"
            >
              {isSaving ? i18n.actions.saving : i18n.actions.next}
            </button>
          </div>
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="space-y-6">
          <div>
            <p className="chip">{i18n.stepOf(4, TOTAL_STEPS)}</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight text-slate-900">
              {i18n.details.title}
            </h2>
            <p className="mt-3 text-slate-700">{i18n.details.subtitle}</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="shortTermDebt" className="field-label">
              {i18n.details.debtLabel}
            </label>
            <input
              id="shortTermDebt"
              type="text"
              value={form.shortTermDebt}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  shortTermDebt: formatAmountInput(event.target.value),
                }))
              }
              className="field-input"
              placeholder={i18n.details.debtPlaceholder}
            />
          </div>

          <div className="space-y-3">
            <p className="field-label">{i18n.details.purchasesTitle}</p>
            <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
              <input
                type="text"
                value={pendingPurchase.name}
                onChange={(event) =>
                  setPendingPurchase((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                className="field-input"
                placeholder={i18n.details.purchasesNamePlaceholder}
              />
              <input
                type="text"
                value={pendingPurchase.amount}
                onChange={(event) =>
                  setPendingPurchase((prev) => ({
                    ...prev,
                    amount: formatAmountInput(event.target.value),
                  }))
                }
                className="field-input"
                placeholder={i18n.details.purchasesAmountPlaceholder}
              />
              <button type="button" onClick={addPurchase} className="small-button">
                {i18n.actions.addRow}
              </button>
            </div>
            {form.purchases.length > 0 ? (
              <ul className="space-y-2">
                {form.purchases.map((purchase) => (
                  <li
                    key={purchase.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2"
                  >
                    <span className="text-sm text-slate-700">
                      {purchase.name} - {purchase.amount}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          purchases: prev.purchases.filter(
                            (row) => row.id !== purchase.id,
                          ),
                        }))
                      }
                      className="text-xs font-semibold uppercase tracking-wide text-red-600"
                    >
                      {i18n.actions.removeRow}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="space-y-3">
            <p className="field-label">{i18n.details.tripsTitle}</p>
            <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
              <input
                type="text"
                value={pendingTrip.name}
                onChange={(event) =>
                  setPendingTrip((prev) => ({ ...prev, name: event.target.value }))
                }
                className="field-input"
                placeholder={i18n.details.tripsNamePlaceholder}
              />
              <input
                type="text"
                value={pendingTrip.amount}
                onChange={(event) =>
                  setPendingTrip((prev) => ({
                    ...prev,
                    amount: formatAmountInput(event.target.value),
                  }))
                }
                className="field-input"
                placeholder={i18n.details.tripsAmountPlaceholder}
              />
              <button type="button" onClick={addTrip} className="small-button">
                {i18n.actions.addRow}
              </button>
            </div>
            {form.trips.length > 0 ? (
              <ul className="space-y-2">
                {form.trips.map((trip) => (
                  <li
                    key={trip.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2"
                  >
                    <span className="text-sm text-slate-700">
                      {trip.name} - {trip.amount}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          trips: prev.trips.filter((row) => row.id !== trip.id),
                        }))
                      }
                      className="text-xs font-semibold uppercase tracking-wide text-red-600"
                    >
                      {i18n.actions.removeRow}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="parentGiftAmount" className="field-label">
              {i18n.details.parentsLabel}
            </label>
            <input
              id="parentGiftAmount"
              type="text"
              value={form.parentGiftAmount}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  parentGiftAmount: formatAmountInput(event.target.value),
                }))
              }
              className="field-input"
              placeholder={i18n.details.parentsPlaceholder}
            />
          </div>

          <div className="flex justify-between gap-3">
            <button type="button" onClick={goBack} className="secondary-button">
              {i18n.actions.back}
            </button>
            <button
              type="button"
              onClick={() => void handleDetailsContinue()}
              disabled={isSaving}
              className="action-button"
            >
              {isSaving ? i18n.actions.saving : i18n.actions.next}
            </button>
          </div>
        </div>
      );
    }

    if (step === 4) {
      return (
        <div className="space-y-6">
          <div>
            <p className="chip">{i18n.stepOf(5, TOTAL_STEPS)}</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight text-slate-900">
              {i18n.summary.title}
            </h2>
            <p className="mt-3 text-slate-700">{i18n.summary.subtitle}</p>
          </div>

          {isBreakdownLoading ? (
            <p className="rounded-2xl border border-slate-200 bg-white/70 p-4 text-sm text-slate-700">
              {i18n.summary.loading}
            </p>
          ) : null}

          {goalBreakdown ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
                  <p className="summary-title">{i18n.summary.metrics.endGoal}</p>
                  <p className="summary-value">
                    {formatUsd(goalBreakdown.summary.endGoalAmount)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
                  <p className="summary-title">
                    {i18n.summary.metrics.firstStageTotal}
                  </p>
                  <p className="summary-value">
                    {formatUsd(goalBreakdown.summary.firstStageTotal)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
                  <p className="summary-title">{i18n.summary.metrics.progress}</p>
                  <p className="summary-value">
                    {formatPercent(goalBreakdown.summary.progressToEndGoalPct)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
                  <p className="summary-title">
                    {goalBreakdown.summary.overTargetBy > 0
                      ? i18n.summary.metrics.overTarget
                      : i18n.summary.metrics.gap}
                  </p>
                  <p className="summary-value">
                    {goalBreakdown.summary.overTargetBy > 0
                      ? formatUsd(goalBreakdown.summary.overTargetBy)
                      : formatUsd(goalBreakdown.summary.remainingToEndGoal)}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
                <div className="mb-2 flex items-center justify-between text-sm text-slate-700">
                  <span>{i18n.summary.metrics.progress}</span>
                  <span>{formatPercent(goalBreakdown.summary.progressToEndGoalPct)}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-teal-600 transition-all duration-700"
                    style={{
                      width: `${Math.min(
                        goalBreakdown.summary.progressToEndGoalPct,
                        100,
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
                <p className="summary-title">{i18n.summary.categoryBreakdownTitle}</p>
                <div className="mt-3 space-y-3">
                  {goalBreakdown.categories.map((category) => (
                    <div key={category.key} className="space-y-1">
                      <div className="flex items-center justify-between text-sm text-slate-700">
                        <span>{category.label}</span>
                        <span>
                          {formatUsd(category.amount)} (
                          {formatPercent(category.stageSharePct)})
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                          style={{ width: `${Math.min(category.stageSharePct, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white/70 p-5">
            <div>
              <p className="summary-title">{i18n.summary.labels.mainGoal}</p>
              <p className="summary-value">{form.primaryGoal || i18n.goal.option}</p>
            </div>
            <div>
              <p className="summary-title">{i18n.summary.labels.targetAmount}</p>
              <p className="summary-value">
                {form.targetAmount
                  ? `${form.targetAmount} USD`
                  : i18n.summary.empty.targetAmount}
              </p>
            </div>
            <div>
              <p className="summary-title">{i18n.summary.labels.shortTermDebt}</p>
              <p className="summary-value">
                {form.shortTermDebt
                  ? `${form.shortTermDebt} USD`
                  : i18n.summary.empty.shortTermDebt}
              </p>
            </div>
            <div>
              <p className="summary-title">{i18n.summary.labels.thingsToBuy}</p>
              <p className="summary-value">
                {form.purchases.length > 0
                  ? form.purchases
                      .map((purchase) => `${purchase.name} (${purchase.amount} USD)`)
                      .join(", ")
                  : i18n.summary.empty.list}
              </p>
            </div>
            <div>
              <p className="summary-title">{i18n.summary.labels.trips}</p>
              <p className="summary-value">
                {form.trips.length > 0
                  ? form.trips
                      .map((trip) => `${trip.name} (${trip.amount} USD)`)
                      .join(", ")
                  : i18n.summary.empty.list}
              </p>
            </div>
            <div>
              <p className="summary-title">{i18n.summary.labels.parents}</p>
              <p className="summary-value">
                {form.parentGiftAmount
                  ? `${form.parentGiftAmount} USD`
                  : i18n.summary.empty.parents}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap justify-between gap-3">
            <button type="button" onClick={goBack} className="secondary-button">
              {i18n.actions.back}
            </button>
            <button
              type="button"
              onClick={() => void goToStep(5, "summary_reviewed")}
              className="action-button"
              disabled={isSaving}
            >
              {isSaving ? i18n.actions.saving : i18n.actions.startGoalImmediately}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <p className="chip">{i18n.stepOf(6, TOTAL_STEPS)}</p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight text-slate-900">
            {i18n.paywall.title}
          </h2>
          <p className="mt-3 text-slate-700">{i18n.paywall.subtitle}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => void handleCheckout("monthly")}
            disabled={Boolean(isCheckingOut)}
            className="plan-card border-teal-300 bg-teal-50 text-left"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
              {i18n.paywall.monthlyLabel}
            </p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {i18n.paywall.monthlyPrice}
            </p>
            <p className="mt-1 text-sm text-slate-600">{i18n.paywall.monthlyTerm}</p>
            <p className="mt-4 text-sm font-medium text-teal-700">
              {isCheckingOut === "monthly"
                ? i18n.actions.redirectingStripe
                : i18n.actions.payWithStripe}
            </p>
          </button>

          <button
            type="button"
            onClick={() => void handleCheckout("lifetime")}
            disabled={Boolean(isCheckingOut)}
            className="plan-card border-slate-300 bg-slate-50 text-left"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
              {i18n.paywall.lifetimeLabel}
            </p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {i18n.paywall.lifetimePrice}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {i18n.paywall.lifetimeTerm}
            </p>
            <p className="mt-4 text-sm font-medium text-slate-700">
              {isCheckingOut === "lifetime"
                ? i18n.actions.redirectingStripe
                : i18n.actions.payWithStripe}
            </p>
          </button>
        </div>

        <div className="flex justify-between">
          <button type="button" onClick={goBack} className="secondary-button">
            {i18n.actions.back}
          </button>
          {paymentStatus === "paid" ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800">
              {i18n.paywall.done}
            </p>
          ) : null}
        </div>

        {paymentStatus === "paid" ? (
          <div className="space-y-6 rounded-2xl border border-slate-200 bg-white/70 p-4">
            <div>
              <h3 className="text-3xl font-semibold leading-tight text-slate-900">
                {i18n.video.title}
              </h3>
              <p className="mt-3 text-slate-700">{i18n.video.subtitle}</p>
            </div>

            <div className="video-shell">
              <iframe
                src="https://www.youtube.com/embed/UUiMaSbr79w?si=OlGh3BwaKsLC6EL4"
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className="h-full w-full"
              />
            </div>

            <form
              onSubmit={handleSetReminder}
              className="grid gap-3 rounded-2xl border border-slate-200 bg-white/70 p-4"
            >
              <label htmlFor="reminderAt" className="field-label">
                {i18n.video.reminderLabel}
              </label>
              <input
                id="reminderAt"
                type="datetime-local"
                value={form.reminderAt}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, reminderAt: event.target.value }))
                }
                className="field-input"
              />
              <p className="text-sm text-slate-600">
                {i18n.video.reminderTo(form.email)}
              </p>
              <div className="flex justify-end">
                <button type="submit" className="action-button" disabled={isSaving}>
                  {isSaving ? i18n.actions.saving : i18n.actions.skipAndRemind}
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 text-slate-900">
      <div className="background-aurora" aria-hidden="true" />
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
            {i18n.appHeader}
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/70">
            <div
              className="h-full rounded-full bg-teal-600 transition-all duration-500"
              style={{ width: `${progressValue}%` }}
            />
          </div>
        </header>

        <section key={step} className="story-card step-reveal">
          {renderStep()}
        </section>

        {statusMessage ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {statusMessage}
          </p>
        ) : null}
      </div>
    </main>
  );
}
