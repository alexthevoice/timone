import { NextResponse } from "next/server";
import { allineaProgramma } from "@/lib/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Riallinea le righe già in tabella al contenuto nuovo di un programma.
 *
 * È il fratello prudente di /importa: quello srotola il programma da capo e,
 * se gli si dice di sostituire, cancella anche le spunte e i pesi. Questo
 * aggancia per numero di giorno e riscrive solo i testi e le classificazioni,
 * lasciando stare tutto quello che hai segnato tu.
 *
 * Serve ogni volta che il contenuto del programma cambia a metà strada: un
 * testo riscritto, un campo nuovo. Senza, l'unico modo di aggiornare sarebbe
 * ributtare dentro tutto e ricominciare a spuntare da zero.
 *
 * Il corpo è lo stesso di /importa, senza "inizio" (le date restano quelle
 * già scritte): { "programma": { "nome", "giorni": [...] }, "scrivi": true }.
 * Di suo mostra cosa cambierebbe senza scrivere niente: per scrivere davvero
 * serve dirlo, con "scrivi": true.
 */
export async function POST(richiesta) {
  const { programma, scrivi = false } = await richiesta.json().catch(() => ({}));

  const nome = String(programma?.nome ?? "").trim();
  const giorni = Array.isArray(programma?.giorni) ? programma.giorni : [];
  if (!nome || !giorni.length) {
    return NextResponse.json(
      { errore: 'Serve "programma" con un "nome" e un elenco "giorni" non vuoto.' },
      { status: 400 }
    );
  }

  try {
    const righe = giorni.map((g) => ({
      programma: nome,
      giorno: g.giorno,
      settimana: g.settimana ?? Math.ceil(g.giorno / 7),
      fase: g.fase ?? "",
      tipo: g.tipo ?? null,
      conversione: g.conversione ?? g.tipo ?? null,
      titolo: g.titolo ?? "",
      dettaglio: g.dettaglio ?? "",
    }));

    const esito = await allineaProgramma(righe, { nome, scrivi: Boolean(scrivi) });

    return NextResponse.json({
      ok: true,
      programma: nome,
      ...esito,
      ...(scrivi
        ? {}
        : { nota: 'Non ho scritto niente. Ripeti con "scrivi": true per applicare.' }),
    });
  } catch (errore) {
    console.error("[allinea programma]", errore.message);
    return NextResponse.json({ errore: errore.message }, { status: 500 });
  }
}
