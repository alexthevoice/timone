"use client";

import { useEffect, useState } from "react";
import Griglia from "@/components/Griglia";
import { num } from "@/lib/numeri";

/**
 * La review della settimana, con i dati veri.
 *
 * Prima era tutta inventata, con in cima un riquadro che lo dichiarava: una
 * review finta si guarda per tre giorni e poi si impara a non guardarla più.
 *
 * La finestra è la settimana di calendario, lunedì-domenica, e non gli ultimi
 * sette giorni: serve a chiudere qualcosa, e "gli ultimi sette giorni" non si
 * chiudono mai. Accanto a ogni numero c'è la settimana prima, perché un numero
 * da solo non dice se sta andando bene.
 *
 * Si legge quando la apri, non a ogni caricamento della Home: è l'unica
 * schermata che rilegge tutti i task, completati compresi.
 */
const MESI = ["gen","feb","mar","apr","mag","giu","lug","ago","set","ott","nov","dic"];
const giorno = (iso) => (iso ? `${Number(iso.slice(8, 10))} ${MESI[Number(iso.slice(5, 7)) - 1]}` : "");

export default function Review({ attiva }) {
  const [r, setR] = useState(null);
  const [errore, setErrore] = useState(null);

  useEffect(() => {
    if (!attiva || r) return;
    let vivo = true;
    fetch("/api/review", { cache: "no-store" })
      .then((x) => x.json())
      .then((d) => vivo && (d.errore ? setErrore(d.errore) : setR(d)))
      .catch(() => vivo && setErrore("non raggiungibile"));
    return () => {
      vivo = false;
    };
  }, [attiva, r]);

  if (!attiva) return <Griglia id="review" attiva={false} />;

  if (errore || !r) {
    return (
      <Griglia id="review" attiva>
        <section className="card col-12">
          <div className="body" style={{ padding: 16, color: "var(--text-faint)" }}>
            {errore ? `Non riesco a leggere la settimana: ${errore}` : "Sto guardando la settimana…"}
          </div>
        </section>
      </Griglia>
    );
  }

  const n = r.numeri;

  return (
    <Griglia id="review" attiva>
      <section className="card col-12" id="card-review-stat">
        <header>
          <h2>La settimana che si chiude</h2>
          <div className="spacer" />
          <span className="hint">
            {giorno(r.settimana.dal)} – {giorno(r.settimana.al)} · accanto, la settimana prima
          </span>
        </header>
        <div className="body">
          <div className="rstat">
            <Numero k="Chiuse" v={n.chiusi.ora} prima={n.chiusi.prima} versoBuono="su" />
            <Numero k="Entrate" v={n.aperti.ora} prima={n.aperti.prima} versoBuono="giu" coda="cose nuove" />
            <Numero
              k="Abitudini"
              v={n.abitudini.ora}
              prima={n.abitudini.prima}
              suffisso="%"
              versoBuono="su"
              coda="media dei giorni passati"
            />
            <Numero
              k="Formazione"
              v={n.formazione.ora}
              prima={n.formazione.prima}
              suffisso="′"
              versoBuono="su"
            />
          </div>
        </div>
      </section>

      <section className="card col-4" id="card-review-chiusi">
        <header>
          <h2>Cosa è andato</h2>
          <div className="spacer" />
          <span className="hint">{r.chiusi.length === 0 ? "niente" : `${r.chiusi.length} chius${r.chiusi.length === 1 ? "a" : "e"}`}</span>
        </header>
        <div className="body">
          {r.chiusi.length === 0 ? (
            <Vuoto testo="Questa settimana non hai chiuso niente. Se è stata una settimana di lavoro lungo va bene, se non lo è stata te lo sta dicendo." />
          ) : (
            <ul className="rlist">
              {r.chiusi.map((t) => (
                <li key={t.id}>
                  <span className="temp" style={{ background: "var(--ok)" }} />
                  {t.titolo}
                  <span className="p">{t.persone.join(" · ") || giorno(t.quando)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="card col-4" id="card-review-slittati">
        <header>
          <h2>Cosa è slittato</h2>
          <div className="spacer" />
          <span className="hint">scaduto o fermo da dieci giorni</span>
        </header>
        <div className="body">
          {r.slittati.length === 0 ? (
            <Vuoto testo="Niente di impantanato. Buon segno." />
          ) : (
            <ul className="rlist">
              {r.slittati.map((t) => (
                <li key={t.id}>
                  <span className={`temp ${t.temperatura}`} />
                  {t.titolo}
                  <span className="p">
                    {t.scadenza && t.scadenza < r.settimana.al
                      ? `scaduta il ${giorno(t.scadenza)}`
                      : `ferma da ${t.giorni} g`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="card col-4" id="card-review-persone">
        <header>
          <h2>Chi non senti da troppo</h2>
        </header>
        <div className="body">
          {r.silenzio.length === 0 ? (
            <Vuoto testo="La rubrica è vuota: i nomi nascono da soli quando li attacchi a una cosa da fare." />
          ) : (
            <ul className="rlist">
              {r.silenzio.map((p) => (
                <li key={p.nome}>
                  <span className={`temp ${p.giorni === null || p.giorni > 60 ? "hot" : p.giorni > 30 ? "warm" : "cold"}`} />
                  {p.nome}
                  <span className="p">{p.giorni === null ? "mai sentito" : `${p.giorni} g`}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="card col-12" id="card-review-prossima">
        <header>
          <h2>Le tre della prossima</h2>
          <div className="spacer" />
          <span className="hint">quello che scade entro la settimana, per priorità</span>
        </header>
        <div className="body">
          {r.inArrivo.length === 0 ? (
            <Vuoto testo="Non c'è niente con una scadenza nei prossimi giorni. O sei avanti, o le scadenze non le hai messe: la seconda è più probabile della prima." />
          ) : (
            <ul className="prio">
              {r.inArrivo.map((t, i) => (
                <li key={t.id}>
                  <span className="r">{i + 1}</span>
                  <span className="t">
                    {t.titolo}
                    <span className="p" style={{ marginLeft: 10 }}>
                      entro il {giorno(t.scadenza)}
                      {t.persone.length > 0 && ` · ${t.persone.join(" · ")}`}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </Griglia>
  );
}

/** Un numero della settimana, con quello di sette giorni prima accanto. */
function Numero({ k, v, prima, suffisso = "", versoBuono = "su", coda }) {
  const vuoto = v === null || v === undefined;
  const differenza = vuoto || prima === null || prima === undefined ? null : v - prima;
  const bene = differenza === null || differenza === 0 ? "" : (versoBuono === "su") === differenza > 0 ? "pos" : "neg";

  return (
    <div className="b">
      <div className="k">{k}</div>
      <div className="v">{vuoto ? "—" : `${num(v)}${suffisso}`}</div>
      <div className={`s ${bene}`}>
        {differenza === null
          ? (coda ?? "prima settimana")
          : differenza === 0
            ? `come la settimana prima${coda ? ` · ${coda}` : ""}`
            : `${differenza > 0 ? "+" : "−"}${num(Math.abs(differenza))}${suffisso} sulla settimana prima`}
      </div>
    </div>
  );
}

function Vuoto({ testo }) {
  return <div style={{ fontSize: 12.5, color: "var(--text-faint)", lineHeight: 1.5 }}>{testo}</div>;
}
