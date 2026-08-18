"use client";

import { useState } from "react";
import { Calendario as IconaCalendario, Destra, Sinistra } from "@/components/Icone";
import { settimanaDi } from "@/lib/data";

const GIORNI_CORTI = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"];

const MESI = [
  "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre",
];

/** Sposta una data di N giorni, senza passare dal fuso. */
function piu(data, n) {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * "oggi", "domani", oppure "mar 18 ago".
 *
 * Il controllo su oggiIso non è difensivismo: finché la rotta non ha risposto,
 * la scheda non sa che giorno è, e `piu(null, 1)` produce una data non valida
 * che fa esplodere l'intera pagina — non solo il calendario. Una scheda che
 * sta ancora caricando non deve poter buttare giù il resto.
 */
function etichettaGiorno(giorno, oggiIso) {
  if (oggiIso) {
    if (giorno === oggiIso) return "oggi";
    if (giorno === piu(oggiIso, 1)) return "domani";
    if (giorno === piu(oggiIso, -1)) return "ieri";
  }
  const d = new Date(`${giorno}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return "";
  return `${GIORNI_CORTI[(d.getUTCDay() + 6) % 7]} ${d.getUTCDate()} ${MESI[d.getUTCMonth()].slice(0, 3)}`;
}

function intestazioneSettimana(settimana) {
  const a = new Date(`${settimana[0]}T12:00:00Z`);
  const b = new Date(`${settimana[6]}T12:00:00Z`);
  const stessoMese = a.getUTCMonth() === b.getUTCMonth();
  return stessoMese
    ? `${a.getUTCDate()}–${b.getUTCDate()} ${MESI[a.getUTCMonth()]}`
    : `${a.getUTCDate()} ${MESI[a.getUTCMonth()].slice(0, 3)} – ${b.getUTCDate()} ${MESI[b.getUTCMonth()].slice(0, 3)}`;
}

/**
 * Il calendario: tre agende, quattro mesi avanti, e la possibilità di guardarci.
 *
 * La versione di prima mostrava sette giorni fissi di una sola agenda e non
 * aveva nessun modo di andare avanti: era, di fatto, un'immagine della
 * settimana in corso. Un calendario in cui non puoi vedere la settimana
 * prossima non è un calendario, è un promemoria di quello che stai già vivendo.
 *
 * Le settimane si sfogliano senza tornare al server: la finestra di quattro
 * mesi è già stata caricata tutta in una volta. Chi sfoglia avanti e indietro
 * lo fa in fretta, e una chiamata di rete a ogni freccia si sente.
 */
export default function Calendario({ cal }) {
  const oggiIso = cal?.oggiIso ?? null;
  const [ancora, setAncora] = useState(null);
  const [scelto, setScelto] = useState(null);
  const [vista, setVista] = useState("settimana");

  const eventi = cal?.eventi ?? [];
  const settimana = settimanaDi(ancora ?? oggiIso ?? "1970-01-01");
  const giornoAttivo = scelto && settimana.includes(scelto) ? scelto : (settimana.includes(oggiIso) ? oggiIso : settimana[0]);
  const delGiorno = eventi.filter((e) => e.giorno === giornoAttivo);

  // I prossimi impegni non si fermano alla settimana mostrata: è la domanda
  // "cosa mi aspetta", non "cosa c'è in questi sette giorni".
  const prossimi = eventi.filter((e) => e.giorno >= (oggiIso ?? "")).slice(0, 12);

  const sorgenti = cal?.sorgenti ?? [];
  const rotte = sorgenti.filter((s) => s.errore);

  const muovi = (n) => {
    const nuova = piu(settimana[0], n * 7);
    setAncora(nuova);
    setScelto(null);
  };

  const stato = () => {
    if (cal == null) return "carico…";
    if (cal.configurato === false) return "nessuna agenda collegata";
    if (!sorgenti.length) return "nessuna agenda";
    // Il conto e non i nomi: i nomi stanno nella legenda due righe sotto, e
    // ripeterli qui e' rumore che ruba il posto all'informazione vera.
    const quante = `${sorgenti.length} ${sorgenti.length === 1 ? "agenda" : "agende"}`;
    return rotte.length ? `${quante}, ${rotte.length} non risponde` : `${quante} · sola lettura`;
  };

  return (
    <section className="card col-8" id="card-calendario">
      <header>
        <IconaCalendario />
        <h2>Calendario</h2>
        <div className="spacer" />
        <span className="hint">{stato()}</span>
        <div className="views">
          <button aria-current={vista === "settimana"} onClick={() => setVista("settimana")}>
            Settimana
          </button>
          <button aria-current={vista === "prossimi"} onClick={() => setVista("prossimi")}>
            Prossimi
          </button>
        </div>
      </header>

      <div className="body">
        {cal == null ? (
          <div style={{ color: "var(--text-faint)", fontSize: 13, padding: "8px 0" }}>
            Sto leggendo le agende…
          </div>
        ) : cal.configurato === false ? (
          <div className="note" style={{ marginTop: 0 }}>
            Nessuna agenda collegata. Serve <b>GOOGLE_CALENDAR_ICAL_URLS</b>, con una riga per
            agenda: <code>Lavoro = https://…/basic.ics</code>. L&apos;indirizzo è quello segreto in
            formato iCal nelle impostazioni del calendario, non quello pubblico.
          </div>
        ) : (
          <>
            {sorgenti.length > 0 && (
              <div className="agende">
                {sorgenti.map((s) => (
                  <span className="ag" key={s.nome} data-rotta={Boolean(s.errore) || undefined}>
                    <i style={{ background: s.colore }} />
                    {s.nome}
                    {s.errore ? " · non risponde" : ""}
                  </span>
                ))}
              </div>
            )}

            {vista === "settimana" ? (
              <>
                <div className="navsett">
                  <button className="frec" onClick={() => muovi(-1)} aria-label="Settimana prima">
                    <Sinistra />
                  </button>
                  <span className="titolo">{intestazioneSettimana(settimana)}</span>
                  {!settimana.includes(oggiIso) && (
                    <button
                      className="mini"
                      onClick={() => {
                        setAncora(null);
                        setScelto(null);
                      }}
                    >
                      torna a oggi
                    </button>
                  )}
                  <div style={{ flex: 1 }} />
                  <button className="frec" onClick={() => muovi(1)} aria-label="Settimana dopo">
                    <Destra />
                  </button>
                </div>

                <div className="week">
                  {settimana.map((g, i) => {
                    const dentro = eventi.filter((e) => e.giorno === g);
                    return (
                      <div
                        className="day"
                        key={g}
                        data-today={g === oggiIso || undefined}
                        data-sel={g === giornoAttivo || undefined}
                        onClick={() => setScelto(g)}
                      >
                        <div className="dow">{GIORNI_CORTI[i]}</div>
                        <div className="dnum">{Number(g.slice(8, 10))}</div>
                        <div className="pips">
                          {dentro.slice(0, 4).map((e, k) => (
                            <i key={k} style={{ background: e.colore }} />
                          ))}
                          {dentro.length > 4 && <span className="piu">+{dentro.length - 4}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="agenda">
                  {delGiorno.length === 0 ? (
                    <div style={{ color: "var(--text-faint)", fontSize: 13, paddingTop: 8 }}>
                      Niente in agenda {etichettaGiorno(giornoAttivo, oggiIso)}.
                    </div>
                  ) : (
                    delGiorno.map((e, i) => (
                      <div className="ev" key={`${e.inizio}-${i}`}>
                        <span className="h num">
                          {e.tuttoIlGiorno ? "tutto il giorno" : `${e.ora} – ${e.oraFine}`}
                        </span>
                        <span className="pallino" style={{ background: e.colore }} />
                        <span className="t">{e.titolo}</span>
                        {e.luogo && <span className="src">{e.luogo}</span>}
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="agenda prossimi">
                {prossimi.length === 0 ? (
                  <div style={{ color: "var(--text-faint)", fontSize: 13, paddingTop: 8 }}>
                    Niente in vista nei prossimi mesi.
                  </div>
                ) : (
                  prossimi.map((e, i) => (
                    <div className="ev" key={`${e.inizio}-${i}`}>
                      <span className="g">{etichettaGiorno(e.giorno, oggiIso)}</span>
                      <span className="h num">{e.tuttoIlGiorno ? "—" : e.ora}</span>
                      <span className="pallino" style={{ background: e.colore }} />
                      <span className="t">{e.titolo}</span>
                      {e.luogo && <span className="src">{e.luogo}</span>}
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      {rotte.length > 0 && (
        <div className="foot" style={{ color: "var(--bad)" }}>
          {rotte.map((s) => `${s.nome}: ${s.errore}`).join(" · ")}
        </div>
      )}
    </section>
  );
}
