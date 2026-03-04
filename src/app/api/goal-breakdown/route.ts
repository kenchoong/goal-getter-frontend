import { NextResponse } from "next/server";

type MoneyRow = {
  name?: string;
  amount?: string;
};

type GoalBreakdownRequest = {
  endGoalAmount?: string;
  shortTermDebt?: string;
  purchases?: MoneyRow[];
  trips?: MoneyRow[];
  parentGiftAmount?: string;
};

const parseAmount = (value: string | undefined) => {
  const digits = (value || "").replace(/\D/g, "");
  return digits ? Number(digits) : 0;
};

const sumRows = (rows: MoneyRow[] | undefined) =>
  (rows || []).reduce((total, row) => total + parseAmount(row.amount), 0);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GoalBreakdownRequest;

    const endGoalAmount = parseAmount(body.endGoalAmount);
    const shortTermDebt = parseAmount(body.shortTermDebt);
    const thingsToBuy = sumRows(body.purchases);
    const trips = sumRows(body.trips);
    const parents = parseAmount(body.parentGiftAmount);

    const firstStageTotal = shortTermDebt + thingsToBuy + trips + parents;
    const remainingToEndGoal = Math.max(endGoalAmount - firstStageTotal, 0);
    const overTargetBy = Math.max(firstStageTotal - endGoalAmount, 0);

    const progressToEndGoalPct =
      endGoalAmount > 0 ? Math.min((firstStageTotal / endGoalAmount) * 100, 999) : 0;

    const categories = [
      { key: "shortTermDebt", label: "Short-term debt", amount: shortTermDebt },
      { key: "thingsToBuy", label: "Things to buy", amount: thingsToBuy },
      { key: "trips", label: "Trips", amount: trips },
      { key: "parents", label: "For dad and mum", amount: parents },
    ].map((category) => ({
      ...category,
      stageSharePct:
        firstStageTotal > 0 ? (category.amount / firstStageTotal) * 100 : 0,
      endGoalSharePct:
        endGoalAmount > 0 ? (category.amount / endGoalAmount) * 100 : 0,
    }));

    return NextResponse.json({
      ok: true,
      summary: {
        endGoalAmount,
        firstStageTotal,
        remainingToEndGoal,
        overTargetBy,
        progressToEndGoalPct,
      },
      categories,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Unable to generate goal breakdown.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}
