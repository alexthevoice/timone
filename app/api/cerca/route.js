import { NextResponse } from "next/server";
import { chiediJson, chiaveConfigurata, modelloSmistamento } from "@/lib/claude";
import { leggiTask, scriviRegistro } from "@/lib/store";

export const dynamic = "force-dynamic";

const SISTEMA = `Ti do l'elenco degli impegni aperti di una persona e una sua domanda in italiano.
Rispondi con gli identificativi degli impegni che rispondono alla domanda, dal più pertinente al meno.
Se nessuno c'entra, torna una lista vuota. Non inventare identificativi: usa solo quelli che ti ho dato.`;

const SCHEMA = {
  type: "object",
  properties: {
    id: { type: "array", items: { type: "string" } },
  },
  required: ["id"],
  additionalProperties: false,
};

export async function POST(richiesta) {
  const { domanda } = await richiesta.json().catch(() => ({}));
  const q = String(domanda ?? "").trim();
  if (!q) return NextResponse.json({ errore: "Manca la domanda" }, { status: 400 });

  const task = await leggiTask();
  if (!chiaveConfigurata()) {
    return NextResponse.json({ errore: "Chiave assente", id: null }, { status: 503 });
  }

  // Al modello va una lista compatta: identificativo, titolo, fascia, persona, tag.
  const elenco = task
    .map((t) =>
      [t.id, t.titolo, t.fascia, t.persona ?? "-", (t.tag ?? []).join("/") || "-"].join(" | ")
    )
    .join("\n");

  try {
    const risposta = await chiediJson({
      sistema: SISTEMA,
      domanda: `Impegni aperti (id | titolo | fascia | persona | tag):\n${elenco}\n\nDomanda: ${q}`,
      effort: "low",
      senzaRagionamento: true,
      schema: SCHEMA,
      maxTokens: 1000,
      // Filtrare titoli in cinque fasce è lo stesso mestiere dello smistamento:
      // il modello grosso qui pagava cinque volte tanto per lo stesso risultato.
      modello: modelloSmistamento(),
    });

    // Ogni tanto il modello inventa un identificativo. Se il codice se lo beve,
    // la scheda mostra un elemento vuoto e tu passi mezz'ora a cercare un bug
    // che sta in una risposta, non nel codice.
    const validi = new Set(task.map((t) => t.id));
    const id = (risposta.id ?? []).filter((x) => validi.has(x));

    // Il conto delle chiamate al modello si tiene nel Registro: senza, il costo
    // API resta una stima a occhio. Parte e non si aspetta.
    scriviRegistro("ricerca", `${q.slice(0, 120)} · ${modelloSmistamento()}`).catch(() => {});

    return NextResponse.json({ id, scartati: (risposta.id ?? []).length - id.length });
  } catch (errore) {
    console.error("[cerca]", errore.message);
    // Il client ripiega da solo su un filtro testuale: la ricerca non si rompe
    // mai, al massimo diventa meno intelligente.
    return NextResponse.json({ errore: errore.message, id: null }, { status: 503 });
  }
}
