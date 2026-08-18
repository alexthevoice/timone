"use client";

import { useState } from "react";
import Griglia from "@/components/Griglia";
import { Spunta } from "@/components/Icone";
import { leggiBlocco } from "@/lib/incolla";
import { postJson } from "@/lib/useDati";
import { CONVERSIONI, MODALITA, REGOLA_ANTI_SALTO, versioni } from "@/lib/modalita";

const GIORNI_CORTI = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"];

/** Il tipo di giornata, per il colore della casella. */
const COLORE = {
  tapis: "camminata",
  camminata: "camminata",
  circuito: "circuito",
  intervalli: "intervalli",
  piscina: "piscina",
  riposo: "riposo",
};

function giornoDellaSettimana(data) {
  const d = new Date(`${data}T12:00:00Z`);
  return GIORNI_CORTI[(d.getUTCDay() + 6) % 7];
}

/**
 * Il testo corto della casella: quello che c'è sul foglio stampato.
 *
 * Il titolo per esteso non ci sta in due centimetri, e il calendario serve a
 * colpo d'occhio: qui basta sapere quanto dura e se c'è il circuito.
 */
function breve(r) {
  if (r.tipo === "riposo") return "Riposo";
  const minuti = r.titolo.match(/(\d+)'/)?.[1];
  const giri = r.titolo.match(/×(\d)/)?.[1];
  if (r.tipo === "intervalli") return giri ? `INT ${minuti}' + C×${giri}` : `INT ${minuti}'`;
  if (giri) return `WP ${minuti}' · C×${giri}`;
  if (r.tipo === "piscina") return `WP ${minuti}' + piscina`;
  return `WP ${minuti}'`;
}

/**
 * Il programma per intero, in una schermata dove si segna invece di stampare.
 *
 * Il foglio A4 resta e serve ancora — appeso davanti al tapis è più comodo di
 * un telefono — ma il foglio non sa cosa hai fatto ieri, e soprattutto non sa
 * contare quante volte hai dovuto ripiegare sui venti minuti. Quel conto è il
 * motivo per cui questa pagina esiste: se le C e le E sono la maggioranza, il
 * problema non è la volontà, è l'orario in cui provi ad allenarti.
 */
export default function Allenamento({ attiva, dati, modifica, ricarica }) {
  const [aperto, setAperto] = useState(null);

  const allenamento = dati?.allenamento;

  if (!dati || !allenamento) {
    return (
      <Griglia id="allenamento" attiva={attiva}>
        {dati ? (
          <CaricaProgramma ricarica={ricarica} />
        ) : (
          <section className="card col-12">
            <div className="body" style={{ padding: 16, color: "var(--text-faint)" }}>
              Sto leggendo i tuoi dati…
            </div>
          </section>
        )}
      </Griglia>
    );
  }

  const oggiIso = dati.oggi;
  const settimane = allenamento.settimane ?? [];
  const totali = allenamento.conteggio ?? { standard: 0, cliente: 0, emergenza: 0, fatti: 0 };
  const rigaAperta = settimane.flatMap((s) => s.giorni).find((r) => r.id === aperto) ?? null;

  /**
   * La spunta con la modalità.
   *
   * Ricliccare la modalità già segnata toglie la spunta: è il gesto per
   * correggere senza dover cercare un secondo comando da qualche altra parte.
   */
  const segna = async (r, modalita) => {
    const stessa = Boolean(r.fattoIl) && r.modalita === modalita;
    const fatto = !stessa;

    await modifica(
      (d) => ({
        ...d,
        allenamento: {
          ...d.allenamento,
          fatti: Math.max(0, d.allenamento.fatti + (fatto ? (r.fattoIl ? 0 : 1) : -1)),
          settimane: d.allenamento.settimane.map((s) => ({
            ...s,
            giorni: s.giorni.map((x) =>
              x.id === r.id
                ? { ...x, fattoIl: fatto ? "adesso" : null, modalita: fatto ? modalita : null }
                : x
            ),
          })),
        },
      }),
      () => postJson("/api/allenamento", { id: r.id, fatto, modalita })
    );
    // I conteggi li fa il server: ricalcolarli qui vorrebbe dire due formule
    // che prima o poi non dicono la stessa cosa.
    await ricarica();
  };

  return (
    <>
      <Griglia id="allenamento" attiva={attiva}>
        {/* Le tre modalità e la regola che tiene in piedi tutto */}
        <section className="card col-7" id="card-modalita">
          <header>
            <h2>Ogni giorno scegli una modalità</h2>
            <div className="spacer" />
            <span className="hint">tre versioni della stessa giornata, non tre programmi</span>
          </header>
          <div className="body">
            <div className="modalita">
              {MODALITA.map((m) => (
                <div className="mod" key={m.id} data-m={m.id}>
                  <div className="quando">{m.quando}</div>
                  <div className="nome">
                    <span className="sigla">{m.sigla}</span> {m.nome.toUpperCase()}{" "}
                    <span className="min num">{m.minuti}&apos;</span>
                  </div>
                  <div className="spiega">{m.spiega}</div>
                </div>
              ))}
            </div>
            <div className="focus" style={{ marginTop: 14 }}>
              <div className="label">La regola che tiene in piedi tutto</div>
              <div className="value" style={{ fontSize: 13, fontWeight: 400, lineHeight: 1.5 }}>
                {REGOLA_ANTI_SALTO}
              </div>
            </div>
          </div>
        </section>

        {/* La tabella di conversione */}
        <section className="card col-5" id="card-conversioni">
          <header>
            <h2>Come si accorcia la giornata</h2>
            <div className="spacer" />
            <span className="hint">nel calendario c&apos;è la versione standard</span>
          </header>
          <div className="body">
            <table className="tbl conv">
              <thead>
                <tr>
                  <th>Tipo di giornata</th>
                  <th>Cliente 40&apos;</th>
                  <th>Emergenza 20&apos;</th>
                </tr>
              </thead>
              <tbody>
                {CONVERSIONI.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span className={`pastiglia t-${c.id}`} />
                      {c.nome}
                    </td>
                    <td>{c.cliente.titolo}</td>
                    <td>{c.emergenza.titolo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Le settimane */}
        <section className="card col-12" id="card-84">
          <header>
            <h2>84 giorni</h2>
            <div className="spacer" />
            <span className="hint">
              clicca un giorno per le tre versioni · S, C, E per spuntarlo
            </span>
          </header>
          <div className="body">
            {settimane.map((s) => (
              <div className="sett" key={s.numero}>
                <div className="barra">
                  <span className="n">SETTIMANA {s.numero}</span>
                  <span className="fase">{s.fase}</span>
                  <div style={{ flex: 1 }} />
                  {s.target && (
                    <span className="tg">
                      target <b>{s.target}</b>
                    </span>
                  )}
                  <ContoModalita c={s.conteggio} compatto />
                </div>
                <div className="sette">
                  {s.giorni.map((r) => (
                    <Casella
                      key={r.id}
                      r={r}
                      oggiIso={oggiIso}
                      onApri={() => setAperto(r.id)}
                      onSegna={segna}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="foot">
            <span>
              <b className="num">{totali.fatti}</b> giorni fatti su {totali.totale}
            </span>
            {/* Il foglio da stampare stava in cima alla barra, fra gli attrezzi
                di sistema, dove non c'entrava niente: è un pezzo del programma
                e vive qui, in fondo alle settimane. */}
            <a
              className="btn"
              href="/programma"
              target="_blank"
              rel="noreferrer"
              title="Le due facciate A4 da appendere"
              style={{ textDecoration: "none" }}
            >
              Il foglio da stampare ↗
            </a>
            <div style={{ flex: 1 }} />
            <ContoModalita c={totali} />
          </div>
        </section>

        <section className="card col-12" id="card-lettura">
          <div className="body" style={{ paddingTop: 14 }}>
            <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--text-dim)" }}>
              A fine settimana guarda quante <b>C</b> e quante <b>E</b> hai segnato. Se sono la
              maggioranza il problema non è la tua volontà, è l&apos;orario in cui provi ad
              allenarti: sposta la seduta al mattino invece di aggiungere disciplina.
            </div>
          </div>
        </section>
      </Griglia>

      {attiva && rigaAperta && (
        <Dettaglio r={rigaAperta} oggiIso={oggiIso} onSegna={segna} onChiudi={() => setAperto(null)} />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ casella */

function Casella({ r, oggiIso, onApri, onSegna }) {
  const futuro = r.data > oggiIso;
  const riposo = r.tipo === "riposo";

  return (
    <div
      className="cas"
      data-t={COLORE[r.tipo] ?? "camminata"}
      data-oggi={r.data === oggiIso || undefined}
      data-fatto={Boolean(r.fattoIl) || undefined}
      data-futuro={futuro || undefined}
    >
      <div className="testa" onClick={onApri}>
        <span className="dow">{giornoDellaSettimana(r.data)}</span>
        <span className="num n">{r.giorno}</span>
        {r.pesata && <span className="bilancia" title="Giorno di pesata" />}
      </div>

      <div className="testo" onClick={onApri}>
        {breve(r)}
      </div>

      {futuro ? (
        // I giorni futuri si vedono ma non si spuntano: una seduta segnata in
        // anticipo è un dato falso, e il conteggio delle modalità serve solo
        // se dice la verità.
        <div className="sce vuota">{new Date(`${r.data}T12:00:00Z`).getUTCDate()}/{Number(r.data.slice(5, 7))}</div>
      ) : riposo ? (
        <div className="sce">
          <button
            className="scelta unica"
            aria-pressed={Boolean(r.fattoIl)}
            onClick={() => onSegna(r, "standard")}
            title="Riposo, uguale in tutte e tre le modalità"
          >
            {r.fattoIl ? <Spunta /> : "—"}
          </button>
        </div>
      ) : (
        <div className="sce">
          {MODALITA.map((m) => (
            <button
              key={m.id}
              className="scelta"
              data-m={m.id}
              aria-pressed={r.fattoIl && r.modalita === m.id}
              onClick={() => onSegna(r, m.id)}
              title={`${m.nome} ${m.minuti}'`}
            >
              {m.sigla}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- conteggio */

function ContoModalita({ c, compatto }) {
  if (!c) return null;
  return (
    <span className={`contomod${compatto ? " compatto" : ""}`}>
      {MODALITA.map((m) => (
        <span className="voce" key={m.id} data-m={m.id} title={`${m.nome} ${m.minuti}'`}>
          {m.sigla}
          <b className="num">{c[m.id] ?? 0}</b>
        </span>
      ))}
    </span>
  );
}

/* ----------------------------------------------------------------- dettaglio */

function Dettaglio({ r, oggiIso, onSegna, onChiudi }) {
  const v = versioni(r);
  const futuro = r.data > oggiIso;

  return (
    <aside className="panel" id="panel-seduta">
      <header>
        <h2>
          Giorno {r.giorno} · {giornoDellaSettimana(r.data)}{" "}
          {new Date(`${r.data}T12:00:00Z`).getUTCDate()}
        </h2>
        <div className="spacer" style={{ flex: 1 }} />
        <button className="btn" onClick={onChiudi}>
          Esc
        </button>
      </header>

      <div className="body">
        {MODALITA.map((m) => {
          const parte = v[m.id];
          const scelta = Boolean(r.fattoIl) && r.modalita === m.id;
          return (
            <div className="versione" key={m.id} data-m={m.id} data-scelta={scelta || undefined}>
              <div className="cima">
                <span className="sigla">{m.sigla}</span>
                <span className="nome">
                  {m.nome} {m.minuti}&apos;
                </span>
                <div style={{ flex: 1 }} />
                {!futuro && (
                  <button className="btn" onClick={() => onSegna(r, m.id)}>
                    {scelta ? "Tolgo la spunta" : "L'ho fatto così"}
                  </button>
                )}
              </div>
              <div className="titolo">{parte.titolo}</div>
              <div className="dett">{parte.dettaglio}</div>
            </div>
          );
        })}

        {futuro && (
          <div className="note" style={{ marginTop: 0 }}>
            È un giorno che deve ancora arrivare: si legge, non si spunta.
          </div>
        )}

        {r.target && (
          <div className="field">
            <div className="k">Target di fine settimana</div>
            <div className="in num">{r.target}</div>
          </div>
        )}
      </div>
    </aside>
  );
}

/* ------------------------------------------------- il primo caricamento */

/**
 * Il programma non è nel codice: lo scrivi tu, o meglio te lo fai scrivere
 * dalla tua intelligenza artificiale, quella che usi già. Nella guida c'è il
 * prompt pronto: glielo incolli, rispondi alle sue domande, e lei ti
 * restituisce il blocco. Il blocco si incolla qui, si sceglie il giorno di
 * partenza, e la parete si riempie. Se il blocco è storto, l'errore dice
 * cosa non va: si rincolla all'AI e si fa correggere.
 */
function CaricaProgramma({ ricarica }) {
  const [testo, setTesto] = useState("");
  const [inizio, setInizio] = useState("");
  const [esito, setEsito] = useState(null);
  const [caricando, setCaricando] = useState(false);

  const carica = async () => {
    setEsito(null);
    const { valore, errore } = leggiBlocco(testo);
    if (errore) return setEsito({ ok: false, testo: errore });
    // Si accetta sia il blocco nudo {nome, giorni} sia quello vestito
    // {programma: {...}}: le AI producono l'uno o l'altro, pazienza.
    const programma = valore?.programma ?? valore;
    if (!programma?.nome || !Array.isArray(programma?.giorni) || !programma.giorni.length) {
      return setEsito({ ok: false, testo: 'Il blocco deve avere "nome" e un elenco "giorni" non vuoto. Rincolla questo messaggio alla tua AI.' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(inizio)) {
      return setEsito({ ok: false, testo: "Scegli il giorno di partenza." });
    }
    setCaricando(true);
    try {
      const r = await postJson("/api/allenamento/importa", { inizio, programma });
      setEsito({ ok: true, testo: `Caricato: ${r.programma}, dal ${r.dal} al ${r.al}.` });
      await ricarica();
    } catch (e) {
      setEsito({ ok: false, testo: e.message });
      setCaricando(false);
    }
  };

  return (
    <section className="card col-12">
      <header>
        <h2>Nessun programma caricato</h2>
        <div className="spacer" />
        <span className="hint">il prompt per fartelo scrivere dalla tua AI è nella guida</span>
      </header>
      <div className="body">
        <div className="modulo-config" style={{ maxWidth: 640 }}>
          <div style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.55 }}>
            Chiedi alla tua intelligenza artificiale (quella che usi già: Claude,
            ChatGPT, Gemini) di prepararti un programma col prompt pronto della
            guida. Copia il blocco che ti risponde e incollalo qui sotto.
          </div>
          <textarea
            value={testo}
            onChange={(e) => setTesto(e.target.value)}
            placeholder={'{ "nome": "Il mio programma", "giorni": [ ... ] }'}
            rows={8}
            style={{
              width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 12.5,
              fontFamily: "var(--font-mono)", background: "var(--surface-2)",
              border: "1px solid var(--border)", outline: "none", color: "var(--text)", resize: "vertical",
            }}
          />
          <label>
            Il giorno 1 del programma
            <input type="date" value={inizio} onChange={(e) => setInizio(e.target.value)} />
          </label>
          <button className="btn-salva" disabled={caricando} onClick={carica}>
            {caricando ? "Carico…" : "Carica il programma"}
          </button>
          {esito && <span className={`esito ${esito.ok ? "ok" : "male"}`}>{esito.testo}</span>}
        </div>
      </div>
    </section>
  );
}
