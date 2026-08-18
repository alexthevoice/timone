import { NextResponse } from "next/server";
import { oggi } from "@/lib/data";
import { leggiReview } from "@/lib/review";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await leggiReview(oggi()));
  } catch (errore) {
    console.error("[review]", errore.message);
    return NextResponse.json({ errore: errore.message }, { status: 500 });
  }
}
