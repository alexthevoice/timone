import { NextResponse } from "next/server";
import { giorniFa, oggi } from "@/lib/data";
import { creaFormazione, leggiFormazione } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(richiesta) {
  const giorni = Math.min(365, Math.max(7, Number(new URL(richiesta.url).searchParams.get("giorni")) || 60));
  return NextResponse.json({
    sessioni: await leggiFormazione(giorniFa(giorni), giorniFa(-1)),
    oggi: oggi(),
  });
}

export async function POST(richiesta) {
  const corpo = await richiesta.json().catch(() => ({}));
  try {
    const creata = await creaFormazione(corpo);
    return NextResponse.json({ id: creata.id });
  } catch (errore) {
    return NextResponse.json({ errore: errore.message }, { status: 400 });
  }
}
