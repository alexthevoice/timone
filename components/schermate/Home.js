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
import { schedaVisibile } from "@/lib/moduli";
import { useCalendario } from "@/lib/useDati";

/**
 * La Home, guidata dai dati.
 *
 * L'ordine delle schede non lo decide più questo file: lo decide l'utente
 * (wizard e Config), e vive nel Profilo dentro il campo Interfaccia. Qui
 * c'è solo il dizionario: per ogni scheda, come si disegna. L'ordine
 * predefinito resta quello di sempre, dal minuto all'anno: oggi, la frase,
 * la direzione, il lavoro, il tempo e la gente, il corpo, il controllo.
 *
 * In cima non c'è nessun nome e nessuna faccia. Questa dashboard ha un utente
 * solo, che il proprio nome lo sa: il posto migliore dello schermo va alla data
 * e a quello che scade oggi.
 */
export default function Home({ attiva, dati, interfaccia, modifica, ricarica, onApriTask, onApriProgramma }) {
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

  /** Il dizionario: ogni scheda sa disegnarsi, l'ordine arriva da fuori. */
  const SCHEDE = {
    adesso: () => (
      <Adesso task={task} oggiIso={dati.oggi} focus={profilo.focus} modifica={modifica} onApriTask={onApriTask} />
    ),
    dafare: () => (
      <DaFare
        task={task}
        persone={dati.persone ?? []}
        oggiIso={dati.oggi}
        modifica={modifica}
        ricarica={ricarica}
        onApriTask={onApriTask}
      />
    ),
    abitudini: () => <Abitudini profilo={profilo} logOggi={logOggi} striscia={striscia} modifica={modifica} />,
    frase: () => <Frase oggiIso={dati.oggi} />,
    obiettivi: () => <Obiettivi obiettivi={obiettivi} oggiIso={dati.oggi} modifica={modifica} />,
    formazione: () => (
      <Formazione
        sessioni={dati.formazione ?? []}
        obiettivoSettimana={profilo.minutiFormazione ?? 150}
        oggiIso={dati.oggi}
        ricarica={ricarica}
      />
    ),
    calendario: () => <Calendario cal={cal} />,
    persone: () => <Persone persone={dati.persone ?? []} oggiIso={dati.oggi} ricarica={ricarica} />,
    allenamento: () => (
      <Allenamento
        allenamento={dati.allenamento}
        profilo={profilo}
        oggiIso={dati.oggi}
        modifica={modifica}
        ricarica={ricarica}
        onApriProgramma={onApriProgramma}
      />
    ),
    salute: () => <Salute salute={salute} oggiIso={dati.oggi} modifica={modifica} ricarica={ricarica} />,
    blocchi: () => <SchedaBlocchi blocchi={blocchi} onApriTask={onApriTask} />,
    catture: () => <SchedaCatture catture={catture} />,
  };

  const ordine = interfaccia?.home ?? Object.keys(SCHEDE);

  return (
    <Griglia id="home" attiva={attiva}>
      {ordine
        .filter((id) => SCHEDE[id] && schedaVisibile(id, interfaccia))
        .map((id) => (
          <Fragmento key={id}>{SCHEDE[id]()}</Fragmento>
        ))}
    </Griglia>
  );
}

/** Un frammento con chiave, per non inventare wrapper che sporcano la griglia. */
function Fragmento({ children }) {
  return children;
}

/* ------------------------------------------------------------ cosa è fermo */

function SchedaBlocchi({ blocchi, onApriTask }) {
  return (
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
            <div className="block" key={b.id} onClick={() => onApriTask(b.id)} style={{ cursor: "pointer" }}>
              <span className={`temp ${b.temperatura}`} />
              <span className="t">{b.titolo}</span>
              {b.persona && <span className="p">{b.persona}</span>}
              <span className="age num">{b.giorni} g</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

/* --------------------------------------------------------- catture recenti */

function SchedaCatture({ catture }) {
  return (
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
  );
}
