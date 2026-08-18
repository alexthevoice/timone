import { NextResponse } from "next/server";
import { chiediAClaude, chiaveConfigurata, modelloInUso } from "@/lib/claude";
import { giornoDaIso, oggi, ultimiGiorni } from "@/lib/data";
import {
  leggiCatture,
  leggiLogIntervallo,
  leggiMemoria,
  leggiObiettivi,
  leggiPersone,
  leggiProfilo,
  leggiTask,
  scriviRegistro,
} from "@/lib/store";

export const dynamic = "force-dynamic";

const SISTEMA = `Rispondi a domande su un sistema personale, in italiano, parlando alla persona a cui appartengono questi dati.

Regole, in ordine di importanza:

1. Cita sempre da dove viene quello che dici. Ogni voce che ti do ha un'etichetta tra parentesi quadre, tipo [memoria 3] o [task 7]: mettila accanto all'affermazione che ne deriva.
2. Se un dato non c'è, dillo. "Non lo so" e "non c'è niente qui dentro su questo" sono risposte giuste. Non inventare, non dedurre, non riempire i buchi con quello che ti sembra plausibile.
3. Rispondi corto. Due o tre frasi se bastano. Chi legge sta guardando una barra in fondo allo schermo, non un documento.
4. Niente convenevoli, niente "ottima domanda", niente riepilogo di quello che ti ho chiesto.`;

export async function POST(richiesta) {
  const { domanda } = await richiesta.json().catch(() => ({}));
  const q = String(domanda ?? "").trim();
  if (!q) return NextResponse.json({ errore: "Manca la domanda" }, { status: 400 });

  if (!chiaveConfigurata()) {
    return NextResponse.json(
      { errore: "Senza chiave Anthropic non posso rispondere alle domande." },
      { status: 503 }
    );
  }

  const giorno = oggi();
  const [profilo, memoria, catture, task, persone, obiettivi, log] = await Promise.all([
    leggiProfilo(),
    leggiMemoria(300),
    leggiCatture(60),
    leggiTask({ includiCompletati: true }),
    leggiPersone(),
    leggiObiettivi(),
    leggiLogIntervallo(ultimiGiorni(30)[0], giorno),
  ]);

  const contesto = componiContesto({
    profilo,
    memoria,
    catture,
    task,
    persone,
    obiettivi,
    log,
    giorno,
  });

  try {
    // Tetto alto: il tetto vale per ragionamento PIÙ testo, e con un tetto
    // basso il ragionamento se lo mangia tutto e la risposta arriva vuota.
    const { testo, motivoStop, risposta } = await chiediAClaude({
      sistema: SISTEMA,
      domanda: `${contesto}\n\n---\n\nDomanda: ${q}`,
      maxTokens: 16000,
      effort: "high",
    });

    if (motivoStop === "refusal") {
      return NextResponse.json({ risposta: "Su questo non me la sento di rispondere." });
    }
    if (!testo.trim()) {
      return NextResponse.json(
        { errore: "Il modello non ha prodotto testo. Se capita spesso, alza il tetto dei token." },
        { status: 502 }
      );
    }

    // La domanda è la chiamata più cara del sistema, e prima non lasciava
    // traccia: il costo del mese era una stima a occhio. Coi token nel
    // Registro il conto si fa con i numeri veri. Parte e non si aspetta.
    scriviRegistro(
      "domanda",
      `${q.slice(0, 120)} · ${modelloInUso()} · ${risposta.usage?.input_tokens ?? "?"} token dentro, ${risposta.usage?.output_tokens ?? "?"} fuori`
    ).catch(() => {});

    return NextResponse.json({ risposta: testo.trim(), voci: contaVoci({ memoria, catture, task }) });
  } catch (errore) {
    console.error("[domande]", errore.message);
    return NextResponse.json({ errore: errore.message }, { status: 502 });
  }
}

/**
 * Tutto il contesto passa al modello.
 *
 * Non è una scorciatoia in attesa della ricerca per somiglianza: con qualche
 * centinaio di voci è spesso meglio, perché il modello vede il quadro intero
 * invece di venti frammenti scelti da un algoritmo che non sa cosa gli stai
 * chiedendo. Il giorno in cui le voci diventano migliaia, questa funzione è
 * l'unico punto da cambiare.
 */
function componiContesto({ profilo, memoria, catture, task, persone, obiettivi, log, giorno }) {
  const pezzi = [];

  pezzi.push(
    `Oggi è ${giorno}. Chi ti parla: ${profilo.nome || "senza nome"}` +
      (profilo.ruolo ? `, ${profilo.ruolo}` : "") +
      (profilo.citta ? `, ${profilo.citta}` : "") +
      (profilo.focus ? `. Il suo focus di oggi: ${profilo.focus}` : "")
  );

  if (task.length) {
    pezzi.push(
      "IMPEGNI:\n" +
        task
          .map(
            (t, i) =>
              `[task ${i + 1}] ${t.completatoIl ? "CHIUSO" : t.fascia} · ${t.titolo}` +
              (t.persona ? ` · con ${t.persona}` : "") +
              (t.nota ? ` · nota: ${t.nota}` : "")
          )
          .join("\n")
    );
  }

  if (memoria.length) {
    pezzi.push(
      "MEMORIA (dalla più recente):\n" +
        memoria
          .map((m, i) => `[memoria ${i + 1}] ${giornoDaIso(m.creatoIl) ?? "senza data"} · ${m.testo}`)
          .join("\n")
    );
  }

  if (catture.length) {
    pezzi.push(
      "CATTURE RECENTI:\n" +
        catture
          .map(
            (c, i) =>
              `[cattura ${i + 1}] ${giornoDaIso(c.creatoIl) ?? "senza data"} · verso ${c.destinazione} · ${c.testo}`
          )
          .join("\n")
    );
  }

  // Tutti gli orizzonti, non solo settimana e mese: una domanda sul "perché
  // sto facendo questa cosa" si risponde con le mete a cinque anni, e se non
  // entrano nel contesto il modello non le può nemmeno citare.
  const tuttiObiettivi = Object.values(obiettivi).flat();
  if (tuttiObiettivi.length) {
    pezzi.push(
      "OBIETTIVI:\n" +
        tuttiObiettivi
          .map(
            (o, i) =>
              `[obiettivo ${i + 1}] ${o.periodo} · ${o.fatto ? "fatto" : "da fare"} · ${o.nome}`
          )
          .join("\n")
    );
  }

  if (persone.length) {
    pezzi.push(
      "PERSONE:\n" +
        persone
          .map(
            (p, i) =>
              `[persona ${i + 1}] ${p.nome}` +
              (p.organizzazione ? ` (${p.organizzazione})` : "") +
              (p.ultimoContatto ? ` · ultimo contatto ${p.ultimoContatto}` : "")
          )
          .join("\n")
    );
  }

  const conAbitudini = log.filter((l) => Object.keys(l.abitudini ?? {}).length);
  if (conAbitudini.length) {
    pezzi.push(
      "ABITUDINI, ULTIMI 30 GIORNI:\n" +
        conAbitudini.map((l) => `${l.data}: ${JSON.stringify(l.abitudini)}`).join("\n")
    );
  }

  return pezzi.join("\n\n");
}

const contaVoci = ({ memoria, catture, task }) => memoria.length + catture.length + task.length;
