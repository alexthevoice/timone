import { NextResponse } from "next/server";
import { chiediJson, chiaveConfigurata, modelloSmistamento } from "@/lib/claude";
import { oggi } from "@/lib/data";
import { ID_QUADRANTI, normalizzaPriorita, prioritaConRegole, quadranteConRegole } from "@/lib/quadranti";
import { aggiornaTask, leggiTask, scriviRegistro } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Assegna il quadrante e la priorità a chi non ce l'ha.
 *
 * È un pulsante, non un automatismo: la regola di casa dice che il caricamento
 * di una pagina non chiama mai il modello. Qui il modello parte perché l'hai
 * premuto tu, e tocca solo le righe scoperte — ripremerlo dieci volte non
 * rifà dieci volte lo stesso lavoro né riscrive le tue correzioni.
 *
 * Se il modello non risponde, assegna la regola stupida di lib/quadranti.js.
 * Vale la stessa promessa della cattura: meglio un quadrante approssimativo
 * che una croce piena di buchi.
 */

const SCHEMA = {
  type: "object",
  properties: {
    task: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          quadrante: { type: "string", enum: ID_QUADRANTI },
          // Elenco esplicito e non "intero fra 1 e 5": l'output strutturato
          // rifiuta minimum/maximum su un intero, e la richiesta torna 400.
          // Un errore che non si vede, perché il codice ripiega sulle regole e
          // sembra funzionare — solo, il modello non ci ha mai messo becco.
          priorita: { type: "string", enum: ["1", "2", "3", "4", "5"] },
          motivo: { type: "string", description: "Massimo dieci parole" },
        },
        required: ["id", "quadrante", "priorita", "motivo"],
        additionalProperties: false,
      },
    },
  },
  required: ["task"],
  additionalProperties: false,
};

const SISTEMA = `Assegni a ogni cosa da fare un quadrante di Eisenhower e una priorità.

I quadranti, e non ce ne sono altri:
- Q1: urgente E importante. Scadenze vere, cose che se saltano fanno un danno oggi.
- Q2: importante ma NON urgente. Costruire, imparare, preparare, curarsi, sistemare le cose prima che si rompano. È il quadrante che vale.
- Q3: urgente ma NON importante. Richieste altrui, interruzioni, cose che sembrano correre solo perché qualcuno le ha chieste adesso.
- Q4: né urgente né importante. Se resta lì un mese non succede niente.

Attenzione al riflesso sbagliato: "urgente" non vuol dire "importante detto più forte". Chiediti se fra un mese si vedrà la differenza. La maggior parte delle cose che urlano sta in Q3, non in Q1.

La priorità va da 1 (fallo per primo) a 5 (può aspettare). Q1 sta di solito fra 1 e 2, Q2 fra 2 e 3, Q3 fra 3 e 4, Q4 a 5. Non mettere tutto a 1: una lista di dieci priorità 1 non è una lista di priorità.

Rispondi per OGNI task che ti viene passato, riportando il suo id esatto.
Non includere tag XML interni o di sistema nella risposta.`;

export async function POST(richiesta) {
  const { tutti = false } = await richiesta.json().catch(() => ({}));
  const giorno = oggi();

  const task = await leggiTask();
  // Senza "tutti", non si tocca quello che hai già deciso: un pulsante che
  // riscrive le tue correzioni è un pulsante che non premi mai più.
  const daFare = tutti ? task : task.filter((t) => !t.quadrante || t.priorita === null);

  if (!daFare.length) {
    return NextResponse.json({ ok: true, aggiornati: 0, via: "niente-da-fare" });
  }

  const { proposte, via } = await proponi(daFare, giorno);

  const perId = new Map(task.map((t) => [t.id, t]));
  let aggiornati = 0;

  for (const p of proposte) {
    const originale = perId.get(p.id);
    if (!originale) continue;
    await aggiornaTask(p.id, { quadrante: p.quadrante, priorita: p.priorita });
    aggiornati += 1;
  }

  await scriviRegistro("quadranti-assegnati", `${aggiornati} task, via ${via}`);
  return NextResponse.json({ ok: true, aggiornati, via, proposte });
}

async function proponi(daFare, giorno) {
  const diRiserva = () => ({
    proposte: daFare.map((t) => {
      const quadrante = quadranteConRegole(t, giorno);
      return { id: t.id, quadrante, priorita: prioritaConRegole(t, quadrante), motivo: "regole" };
    }),
    via: "regole",
  });

  if (!chiaveConfigurata()) return diRiserva();

  const elenco = daFare.map((t) => ({
    id: t.id,
    titolo: t.titolo,
    nota: (t.nota ?? "").slice(0, 200),
    fascia: t.fascia,
    temperatura: t.temperatura,
    persona: t.persona,
    tag: t.tag,
    scadenza: t.scadenza,
  }));

  try {
    const grezzo = await chiediJson({
      sistema: SISTEMA,
      domanda: `Oggi è il ${giorno}. Ecco le cose da fare:\n\n${JSON.stringify(elenco, null, 2)}`,
      effort: "low",
      senzaRagionamento: true,
      schema: SCHEMA,
      // Un tetto largo: qui la risposta è lunga quanto la lista, e un tetto
      // stretto la taglia a metà senza dire quali task ha saltato.
      maxTokens: 200 + daFare.length * 120,
      modello: modelloSmistamento(),
    });

    const buone = (grezzo?.task ?? [])
      .filter((p) => ID_QUADRANTI.includes(p.quadrante) && normalizzaPriorita(p.priorita))
      .map((p) => ({ ...p, priorita: normalizzaPriorita(p.priorita) }));

    // Un modello che risponde a metà lascia dei buchi: quelli li chiudono le
    // regole. Mezza croce assegnata è comunque una croce bucata.
    const coperti = new Set(buone.map((p) => p.id));
    const mancanti = daFare
      .filter((t) => !coperti.has(t.id))
      .map((t) => {
        const quadrante = quadranteConRegole(t, giorno);
        return { id: t.id, quadrante, priorita: prioritaConRegole(t, quadrante), motivo: "regole" };
      });

    if (!buone.length) return diRiserva();
    return { proposte: [...buone, ...mancanti], via: mancanti.length ? "modello-parziale" : "modello" };
  } catch (errore) {
    console.error("[quadranti] il modello non ha risposto, passo alle regole:", errore.message);
    return diRiserva();
  }
}
