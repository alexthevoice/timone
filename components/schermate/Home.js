"use client";

import Griglia from "@/components/Griglia";
import { Avviso } from "@/components/Icone";
import Abitudini from "@/components/schede/Abitudini";
import Adesso from "@/components/schede/Adesso";
import Allenamento from "@/components/schede/Allenamento";
import Calendario from "@/components/schede/Calendario";
import DaFare from "@/components/schede/DaFare";
import Formazione from "@/components/schede/Formazione";
import Frase from "@/components/schede/Frase";
import Obiettivi from "@/components/schede/Obiettivi";
import Persone from "@/components/schede/Persone";
import Salute from "@/components/schede/Salute";
import { useCalendario } from "@/lib/useDati";

/**
 * La Home.
 *
 * L'ordine delle schede non è casuale, ed è l'unica cosa che questo file
 * decide. Dall'alto in basso si scende dal minuto all'anno, e ogni fascia
 * risponde a una domanda sola:
 *
 *   1. OGGI          cosa faccio adesso, cosa scade, come sto tenendo le abitudini
 *   2. LA FRASE      l'unica riga che non chiede niente
 *   3. DIREZIONE     dove sto andando, su cinque orizzonti
 *   4. LAVORO        il tempo che sto investendo per imparare
 *   5. TEMPO E GENTE cosa mi aspetta questa settimana, e chi sto perdendo per silenzio
 *   6. CORPO         il programma e i numeri dell'orologio
 *   7. CONTROLLO     cosa è fermo, e dove è finito quello che ho buttato dentro
 *
 * In cima non c'è nessun nome e nessuna faccia. Questa dashboard ha un utente
 * solo, che il proprio nome lo sa: il posto migliore dello schermo va alla data
 * e a quello che scade oggi.
 */
export default function Home({ attiva, dati, modifica, ricarica, onApriTask, onApriProgramma }) {
  const cal = useCalendario();

  if (!dati) {
    return (
      <Griglia id="home" attiva={attiva}>
        <section className="card col-12">
          <div className="body" style={{ padding: 16, color: "var(--text-faint)" }}>
            Sto leggendo i tuoi dati…
          </div>
        </section>
      </Griglia>
    );
  }

  const { profilo, task, logOggi, obiettivi, blocchi, striscia, catture, salute } = dati;

  return (
    <Griglia id="home" attiva={attiva}>
      {/* Adesso: che giorno è, che ore sono, le tre cose */}
      <Adesso
        task={task}
        oggiIso={dati.oggi}
        focus={profilo.focus}
        modifica={modifica}
        onApriTask={onApriTask}
      />

      <DaFare
        task={task}
        persone={dati.persone ?? []}
        oggiIso={dati.oggi}
        modifica={modifica}
        ricarica={ricarica}
        onApriTask={onApriTask}
      />

      <Abitudini
        profilo={profilo}
        logOggi={logOggi}
        striscia={striscia}
        modifica={modifica}
      />

      {/* Una riga che non chiede niente e non misura niente. Sta fra le cose di
          oggi e la direzione, che è il punto in cui serve. */}
      <Frase oggiIso={dati.oggi} />

      {/* Dove sto andando: cinque orizzonti, sempre sotto gli occhi */}
      <Obiettivi obiettivi={obiettivi} oggiIso={dati.oggi} modifica={modifica} />

      {/* 4. Il lavoro: il tempo che stai investendo per imparare */}
      <Formazione
        sessioni={dati.formazione ?? []}
        obiettivoSettimana={profilo.minutiFormazione ?? 150}
        oggiIso={dati.oggi}
        ricarica={ricarica}
      />

      {/* 5. Il tempo che arriva, e le persone che si perdono per silenzio */}
      <Calendario cal={cal} />
      <Persone persone={dati.persone ?? []} oggiIso={dati.oggi} ricarica={ricarica} />

      {/* 6. Il corpo: il programma e i numeri dell'orologio, uno accanto all'altro */}
      <Allenamento
        allenamento={dati.allenamento}
        profilo={profilo}
        oggiIso={dati.oggi}
        modifica={modifica}
        ricarica={ricarica}
        onApriProgramma={onApriProgramma}
      />

      <Salute
        salute={salute}
        oggiIso={dati.oggi}
        modifica={modifica}
        ricarica={ricarica}
      />

      {/* 7. Controllo: cosa si è impantanato, e dove è finito quello che
             detti alla barra */}
      {/* Cosa è fermo */}
      <section className="card col-4" id="card-blocchi">
        <header>
          <Avviso />
          <h2>Cosa è fermo</h2>
          <div className="spacer" />
          <span className="hint">scaduto, o aperto da più di dieci giorni</span>
        </header>
        <div className="body">
          {blocchi.length === 0 ? (
            <div style={{ color: "var(--text-faint)", fontSize: 13, padding: "8px 0" }}>
              Niente di fermo: nessuna scadenza saltata e niente che aspetti da più di dieci
              giorni. Buon segno.
            </div>
          ) : (
            blocchi.map((b) => (
              <div
                className="block"
                key={b.id}
                onClick={() => onApriTask(b.id)}
                style={{ cursor: "pointer" }}
              >
                <span className={`temp ${b.temperatura}`} />
                <span className="t">{b.titolo}</span>
                {b.persona && <span className="p">{b.persona}</span>}
                <span className="age num">{b.giorni} g</span>
              </div>
            ))
          )}
        </div>
      </section>



      {/* Catture recenti: la via di classificazione, in modo discreto */}
      <section className="card col-4" id="card-catture">
        <header>
          <h2>Ultime cose buttate dentro</h2>
          <div className="spacer" />
          <span className="hint">dalla barra qui sotto, e dove sono finite</span>
        </header>
        <div className="body">
          {catture.length === 0 ? (
            <div style={{ color: "var(--text-faint)", fontSize: 13, lineHeight: 1.5 }}>
              Ancora niente. La barra in fondo alla pagina prende quello che scrivi o detti
              — &quot;chiamare Giulia per il preventivo&quot; — e lo mette da solo dove va: fra
              le cose da fare, le persone, gli obiettivi o la memoria. Qui compaiono le ultime
              sei, per controllare che sia finito nel posto giusto.
            </div>
          ) : (
            catture.map((c) => (
              <div className="block" key={c.id}>
                <span className={`temp ${c.via === "modello" ? "warm" : "cold"}`} />
                <span className="t">{c.titolo || c.testo}</span>
                <span className="tag">{c.destinazione ?? "—"}</span>
                <span className="p" style={{ opacity: c.via === "modello" ? 0.55 : 1 }}>
                  {c.via ?? "—"}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </Griglia>
  );
}
