import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { neon } from "@neondatabase/serverless";
import { isValidOutcomeStatus } from "@/lib/slot-outcome";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { outcome_status } = await req.json();

  if (!outcome_status || !isValidOutcomeStatus(outcome_status)) {
    return NextResponse.json(
      { error: "Invalid outcome status" },
      { status: 400 }
    );
  }

  const rows = await sql`
    SELECT id FROM slots WHERE id = ${params.id}
  `;

  if (!rows[0]) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  // No ownership or "has it ended" check — admin can override anytime
  await sql`
    UPDATE slots
    SET outcome_status = ${outcome_status},
        outcome_set_by = 'admin',
        outcome_set_at = now()
    WHERE id = ${params.id}
  `;

  return NextResponse.json({ success: true });
}
