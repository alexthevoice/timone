"use client";

import { useState } from "react";
import { Spunta } from "@/components/Icone";
import { MODALITA, versione } from "@/lib/modalita";
import { num1 } from "@/lib/numeri";
import { postJson } from "@/lib/useDati";

const GIORNI_CORTI = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"];

/** Il giorno della settimana di una data, senza farsi spostare dal fuso. */
function giornoDellaSettimana(data) {
  const d = new Date(`${data}T12:00:00Z`);
  return GIORNI_CORTI[(d.getUTCDay() + 6) % 7];
}

/** "8 novembre": una data da leggere, non da decifrare. */
function dataLunga(data) {
  return new Date(`${data}T12:00:00Z`).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

function quandoInizia(primo, oggiIso) {
  const a = new Date(`${primo}T12:00:00Z`);
  const b = new Date(`${oggiIso}T12:00:00Z`);
  const giorni = Math.round((a - b) / 86400000);
  if (giorni <= 0) return "oggi";
  if (giorni === 1) return "domani";
  return `fra ${giorni} giorni`;
}

/**
 * Il programma datato: cosa si fa oggi, la settimana in corso, il peso e la curva.
 *
 * Si può spuntare anche un giorno diverso da oggi, e non è una svista: chi si
 * allena la sera si ricorda di segnarlo il giorno dopo, e un sistema che lo
 * impedisce si trasforma in un registro pieno di buchi che non sono buchi.
 *
 * Il peso qui si LEGGE e basta: si scrive nella scheda Salute, che è dove lo si
 * cerca (è una misura di salute, non un pezzo di programma) e dove continuerà a
 * esistere quando il programma sarà finito. Due caselle per
 * lo stesso numero sono due caselle da tenere allineate, e quella di qui era la
 * più facile da riempire sul giorno sbagliato.
 */
export default function Allenamento({ allenamento, profilo, oggiIso, modifica, ricarica, onApriProgramma }) {
  const [scelto, setScelto] = useState(null);

  const settimana = allenamento?.settimana ?? [];
  const riga = settimana.find((r) => r.data === scelto) ?? allenamento?.oggi ?? settimana[0];

  if (!allenamento) return null;

  const { numeroSettimana, fase, fatti, totale, nome, stato, primo, pesi = [] } = allenamento;
  const percentuale = totale ? Math.round((fatti / totale) * 100) : 0;

  /**
   * La spunta con la modalità, gli stessi tre pulsanti della schermata intera.
   *
   * Qui non si duplica il programma: la scheda dice cosa si fa oggi e permette
   * di segnarlo, il resto — le tre versioni per esteso, le settimane,
   * il conto delle modalità — vive nella schermata Allenamento. Due posti che
   * mostrano la stessa cosa in modo diverso sono due posti da tenere allineati.
   */
  const segna = async (modalita) => {
    if (!riga) return;
    const stessa = Boolean(riga.fattoIl) && riga.modalita === modalita;
    const fatto = !stessa;

    await modifica(
      (d) => ({
        ...d,
        allenamento: {
          ...d.allenamento,
          fatti: Math.max(0, d.allenamento.fatti + (fatto ? (riga.fattoIl ? 0 : 1) : -1)),
          oggi:
            d.allenamento.oggi?.id === riga.id
              ? {
                  ...d.allenamento.oggi,
                  fattoIl: fatto ? "adesso" : null,
                  modalita: fatto ? modalita : null,
                }
              : d.allenamento.oggi,
          settimana: d.allenamento.settimana.map((r) =>
            r.id === riga.id
              ? { ...r, fattoIl: fatto ? "adesso" : null, modalita: fatto ? modalita : null }
              : r
          ),
        },
      }),
      () => postJson("/api/allenamento", { id: riga.id, fatto, modalita })
    );
    await ricarica();
  };

  const partenza = pesi[0]?.peso ?? null;
  const ultimo = pesi[pesi.length - 1] ?? null;
  const fatto = partenza !== null && ultimo ? ultimo.peso - partenza : null;
  // Il traguardo non è del programma: è tuo, e sta nel Profilo. Senza, la
  // curva resta una curva e nessuno ti inventa un numero da rincorrere.
  const traguardo = profilo?.pesoObiettivo ?? null;
  const manca = ultimo && traguardo != null ? ultimo.peso - traguardo : null;

  return (
    <section className="card col-8" id="card-allenamento">
      <header>
        <h2>Allenamento</h2>
        <div className="spacer" />
        <span className="hint">
          {nome}
          {stato === "in corso" && allenamento.oggi
            ? ` · giorno ${allenamento.oggi.giorno} di ${totale}`
            : stato === "non iniziato"
              ? ` · si parte ${quandoInizia(primo, oggiIso)}`
              : stato === "finito"
                ? " · finito"
                : ""}
        </span>
      </header>

      <div className="body">
        <div className="allen">
          {/* Cosa si fa */}
          <div className="cosa">
            {riga ? (
              <>
                <div className="focus" style={{ marginTop: 0 }}>
                  <div className="label">
                    Settimana {numeroSettimana} · {fase}
                    {riga.data !== oggiIso
                      ? ` · ${giornoDellaSettimana(riga.data)} ${Number(riga.data.slice(8, 10))}`
                      : ""}
                  </div>
                  <div className="value">{riga.titolo}</div>
                </div>

                <div className="dettaglio">{riga.dettaglio}</div>

                <div className="azioni">
                  {/* Un giorno che deve ancora arrivare si legge, non si
                      spunta: una seduta segnata in anticipo è un dato falso, e
                      il conto delle modalità serve solo se dice la verità.
                      Vale qui come nella schermata intera. */}
                  {riga.data > oggiIso ? (
                    <span style={{ fontSize: 12.5, color: "var(--text-faint)" }}>
                      Si comincia {quandoInizia(riga.data, oggiIso)}.
                    </span>
                  ) : riga.tipo === "riposo" ? (
                    <div
                      className="habit"
                      data-done={Boolean(riga.fattoIl)}
                      onClick={() => segna("standard")}
                      style={{ flex: "0 0 auto" }}
                    >
                      <span className="box">{riga.fattoIl && <Spunta />}</span>
                      <span className="name" style={{ paddingRight: 4 }}>
                        {riga.fattoIl ? "Riposo segnato" : "Segna il riposo"}
                      </span>
                    </div>
                  ) : (
                    <div className="scelte">
                      <span className="lab">
                        {riga.fattoIl ? "Fatto in modalità" : "L'ho fatto in"}
                      </span>
                      {MODALITA.map((m) => (
                        <button
                          key={m.id}
                          className="scelta"
                          data-m={m.id}
                          aria-pressed={Boolean(riga.fattoIl) && riga.modalita === m.id}
                          onClick={() => segna(m.id)}
                          title={`${m.nome} ${m.minuti}' — ${versione(riga, m.id).titolo}`}
                        >
                          {m.sigla}
                          <span className="min">{m.minuti}&apos;</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {(riga.peso || riga.pesata || riga.target) && (
                    <div className="pesata">
                      {riga.peso ? (
                        <>
                          <span className="lab">
                            Peso{" "}
                            {riga.data === oggiIso
                              ? "di oggi"
                              : `del ${Number(riga.data.slice(8, 10))}`}
                          </span>
                          <span className="v num">{num1(riga.peso)} kg</span>
                        </>
                      ) : null}

                      {riga.pesata && <span className="band settimana">giorno di pesata</span>}
                      {riga.target && <span className="band avanti">target {riga.target}</span>}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ color: "var(--text-faint)", fontSize: 13 }}>
                Oggi il programma non prevede niente.
              </div>
            )}
          </div>

          {/* La settimana, la curva e il conto */}
          <div className="conto">
            <div className="week">
              {settimana.map((r) => (
                <div
                  className="day"
                  key={r.id}
                  data-today={r.data === oggiIso || undefined}
                  data-sel={r.id === riga?.id || undefined}
                  onClick={() => setScelto(r.data)}
                  title={r.titolo}
                  style={{ opacity: r.tipo === "riposo" ? 0.6 : 1 }}
                >
                  <div className="dow">{giornoDellaSettimana(r.data)}</div>
                  <div className="dnum">{Number(r.data.slice(8, 10))}</div>
                  <div className="pips">
                    <i
                      style={{
                        background: r.fattoIl
                          ? "var(--ok)"
                          : r.tipo === "riposo"
                            ? "transparent"
                            : "var(--text-faint)",
                      }}
                    />
                    {r.peso ? <i style={{ background: "var(--accent)" }} /> : null}
                  </div>
                </div>
              ))}
            </div>

            <CurvaPeso pesi={pesi} traguardo={traguardo} finoAlGiorno={allenamento.oggi?.giorno ?? null} />
            {pesi.length > 0 && traguardo != null && (
              <div className="legenda-curva">
                <span className="riga90" /> i {num1(traguardo)} kg
              </div>
            )}

            <div className="bilancio">
              <div>
                <span className="k">Oggi</span>
                <span className="v num">{ultimo ? `${num1(ultimo.peso)} kg` : "—"}</span>
              </div>
              <div>
                <span className="k">Da inizio</span>
                <span className={`v num ${fatto === null ? "" : fatto <= 0 ? "pos" : "neg"}`}>
                  {fatto === null ? "—" : `${fatto > 0 ? "+" : ""}${num1(fatto)}`}
                </span>
              </div>
              <div>
                <span className="k">Al traguardo</span>
                <span className="v num">{manca === null ? "—" : `${num1(Math.max(0, manca))}`}</span>
              </div>
              <div>
                <span className="k">Pesate</span>
                <span className="v num">{pesi.length}</span>
              </div>
            </div>

            <div className="kbar">
              <i style={{ width: `${percentuale}%` }} />
            </div>
            <div className="sotto-barra">
              <span>
                <span className="num" style={{ fontWeight: 600 }}>
                  {fatti}
                </span>{" "}
                giorni fatti su {totale}
              </span>
              <span style={{ color: "var(--text-faint)" }}>
                fino a{["8", "11"].includes(String(Number(allenamento.ultimo.slice(8, 10)))) ? "ll'" : "l "}
                {dataLunga(allenamento.ultimo)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="foot">
        <button className="btn" onClick={onApriProgramma}>
          Il programma per intero
        </button>
        <a className="btn" href="/programma" target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
          Stampa ↗
        </a>
        <div style={{ flex: 1 }} />
        <span>Il peso si segna nella scheda Salute, tutti i giorni.</span>
      </div>
    </section>
  );
}

/**
 * La curva del peso.
 *
 * Disegnata a mano in SVG, senza librerie: sono poche decine di punti su un
 * rettangolo, e una libreria di grafici qui peserebbe più del resto della
 * pagina messa insieme.
 *
 * L'asse verticale non parte da zero apposta — su una scala 0-100 dieci chili
 * sono una riga piatta — ma nemmeno si stringe addosso ai dati: se nel
 * Profilo c'è un peso obiettivo, sotto resta sempre la sua riga. Una curva
 * che non mostra il traguardo dice solo se la settimana è andata bene.
 *
 * L'asse orizzontale copre il programma FINO A OGGI, non tutto il
 * calendario. Stendere subito la scala sull'intero programma
 * schiaccia le prime tre settimane in un angolo, dove non si distingue niente:
 * proprio nel periodo in cui guardare la curva serve di più, perché è quando
 * si decide se il metodo funziona. La scala cresce col programma.
 */
function CurvaPeso({ pesi, traguardo, finoAlGiorno }) {
  if (!pesi.length) {
    return (
      <div className="curva-vuota">
        Nessun peso segnato. Il primo numero è quello che rende leggibili tutti gli altri.
      </div>
    );
  }

  const L = 300;
  const A = 68;
  const bordo = 4;

  const valori = pesi.map((p) => p.peso);
  const conTraguardo = traguardo != null ? [...valori, traguardo] : valori;
  const alto = Math.max(...conTraguardo) + 1;
  const basso = Math.min(...conTraguardo) - 1;
  const ultimoGiorno = Math.max(finoAlGiorno ?? 0, ...pesi.map((p) => p.giorno));
  const scalaY = (v) => bordo + ((alto - v) / (alto - basso)) * (A - bordo * 2);
  // Il bordo laterale non e' estetica: senza, il pallino dell'ultimo peso
  // finisce mezzo fuori dal riquadro, proprio quello che si guarda per primo.
  const scalaX = (g) => bordo + ((g - 1) / Math.max(1, ultimoGiorno - 1)) * (L - bordo * 2);

  const punti = pesi.map((p) => `${scalaX(p.giorno).toFixed(1)},${scalaY(p.peso).toFixed(1)}`);
  const ultimo = pesi[pesi.length - 1];

  return (
    <svg className="curva" viewBox={`0 0 ${L} ${A}`} preserveAspectRatio="none" aria-label="Andamento del peso">
      {traguardo != null && (
        <line
          x1="0"
          x2={L}
          y1={scalaY(traguardo)}
          y2={scalaY(traguardo)}
          stroke="var(--ok)"
          strokeWidth="1"
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
        />
      )}
      <polyline
        points={punti.join(" ")}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      {pesi.map((p) => (
        <circle
          key={p.data}
          cx={scalaX(p.giorno)}
          cy={scalaY(p.peso)}
          r="2"
          fill="var(--accent)"
          vectorEffect="non-scaling-stroke"
        >
          <title>{`${p.data}: ${p.peso} kg`}</title>
        </circle>
      ))}
      <circle
        cx={scalaX(ultimo.giorno)}
        cy={scalaY(ultimo.peso)}
        r="3.4"
        fill="var(--surface)"
        stroke="var(--accent)"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
