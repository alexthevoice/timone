import { NextResponse } from "next/server";
import { creaObiettivo, leggiObiettivi } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await leggiObiettivi());
}

export async function POST(richiesta) {
  const { nome, periodo, valore, target } = await richiesta.json().catch(() => ({}));
  if (!nome?.trim()) {
    return NextResponse.json({ errore: "Manca il nome" }, { status: 400 });
  }
  const creato = await creaObiettivo({ nome: nome.trim(), periodo, valore, target });
  return NextResponse.json({ id: creato.id });
}
