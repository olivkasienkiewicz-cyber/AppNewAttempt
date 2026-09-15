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

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { outcome_status } = await req.json();

  if (!outcome_status || !isValidOutcomeStatus(outcome_status)) {
    return NextResponse.json(
      { error: "Invalid outcome status" },
      { status: 400 }
    );
  }

  // Confirm this slot belongs to the logged-in tutor and has actually ended
  const rows = await sql`
    SELECT id, date, start_time, duration_minutes, tutor_id
    FROM slots
    WHERE id = ${params.id}
  `;

  const slot = rows[0];

  if (!slot) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  if (slot.tutor_id !== session.user.id) {
    return NextResponse.json({ error: "Not your slot" }, { status: 403 });
  }

  const slotEnd = new Date(`${slot.date}T${slot.start_time}`);
  slotEnd.setMinutes(slotEnd.getMinutes() + slot.duration_minutes);

  if (slotEnd > new Date()) {
    return NextResponse.json(
      { error: "This class hasn't ended yet" },
      { status: 400 }
    );
  }

  await sql`
    UPDATE slots
    SET outcome_status = ${outcome_status},
        outcome_set_by = 'tutor',
        outcome_set_at = now()
    WHERE id = ${params.id}
  `;

  return NextResponse.json({ success: true });
}
