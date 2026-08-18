import { NextResponse } from "next/server";
import { oggi } from "@/lib/data";
import { aggiornaLog, leggiAllenamento, leggiProfilo, segnaAllenamento } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Un clic su un'abitudine.
 *
 * La data la calcola il server, ma con la funzione unica nel fuso dell'utente:
 * mai `new Date()` al volo, altrimenti la spunta di mezzanotte e mezza finisce
 * sul giorno di ieri.
 *
 * Un contatore accetta due gesti diversi, e la differenza conta.
 *
 * Senza `valore` fa un passo avanti, e arrivato in fondo riparte da zero: è il
 * clic veloce. Con `valore` si va al numero esatto, ed è quello che serve
 * davvero — se l'unico modo di correggere "sei bicchieri" battuto per sbaglio
 * è cliccare altre due volte per azzerare e poi cinque per risalire, dopo tre
 * giorni non sai più a che punto sei e smetti di segnare. Sapere di preciso
 * dove sei arrivato è tutto il motivo per cui si segna.
 */
export async function POST(richiesta) {
  const { id, valore } = await richiesta.json().catch(() => ({}));
  if (!id) return NextResponse.json({ errore: "Manca l'abitudine" }, { status: 400 });

  const profilo = await leggiProfilo();
  const abitudine = (profilo.abitudini ?? []).find((a) => a.id === id);
  if (!abitudine) {
    return NextResponse.json(
      { errore: `L'abitudine "${id}" non esiste nel profilo` },
      { status: 404 }
    );
  }

  const giorno = oggi();
  const log = await aggiornaLog(giorno, (attuale) => {
    const stato = { ...(attuale.abitudini ?? {}) };

    if (abitudine.tipo === "contatore") {
      const obiettivo = Number(abitudine.obiettivo) || 1;
      if (valore !== undefined && valore !== null) {
        const n = Number(valore);
        stato[id] = Number.isFinite(n) ? Math.min(obiettivo, Math.max(0, Math.round(n))) : 0;
      } else {
        const adesso = Number(stato[id]) || 0;
        stato[id] = adesso >= obiettivo ? 0 : adesso + 1;
      }
    } else {
      stato[id] = valore !== undefined && valore !== null ? Boolean(valore) : !stato[id];
    }

    return { ...attuale, abitudini: stato };
  });

  // L'abitudine "allenamento" e l'allenamento del programma sono la stessa
  // cosa vista da due schede. Due caselle che raccontano storie diverse sono
  // il modo più veloce per non fidarsi più di nessuna delle due, quindi la
  // spunta viaggia anche nell'altro senso.
  if (id === "allenamento") {
    try {
      const seduta = await leggiAllenamento(giorno);
      const acceso = Boolean(log.abitudini?.allenamento);
      if (seduta && Boolean(seduta.fattoIl) !== acceso) {
        // Spuntando dall'abitudine non si dice quale modalità: vale standard.
        // È l'ipotesi giusta — chi passa di qui sta segnando "l'ho fatto" senza
        // pensarci — e resta correggibile dai tre pulsanti della scheda.
        await segnaAllenamento(seduta.id, { fatto: acceso, modalita: "standard" });
      }
    } catch (errore) {
      // La spunta dell'abitudine è già salvata: questo è un allineamento, non
      // un motivo per far fallire il clic.
      console.error("[abitudini] allenamento non allineato:", errore.message);
    }
  }

  return NextResponse.json({ data: giorno, abitudini: log.abitudini });
}
