"use client";


import PromptPronto from "@/components/PromptPronto";
import { promptSalute } from "@/lib/prompts";
import { useEffect, useState } from "react";
import { Battito, Passo } from "@/components/Icone";
import { num, num1 } from "@/lib/numeri";
import { postJson } from "@/lib/useDati";

/**
 * I numeri dell'orologio.
 *
 * Apple non pubblica Salute su internet, e non è una dimenticanza: quei dati
 * stanno sul telefono e ci restano. Quindi qui non si va a prendere niente —
 * è il telefono che una volta al giorno manda i suoi numeri a /api/salute, con
 * un'automazione di Comandi Rapidi.
 *
 * Da cui la regola di questa scheda: **non inventa mai un numero che non è
 * arrivato**. Un trattino è un'informazione onesta ("il telefono non l'ha
 * mandato"), uno zero è una bugia ("non hai fatto un passo"). E se non è
 * arrivato niente lo dice chiaramente, invece di mostrare una scheda vuota che
 * sembra un guasto.
 */

/**
 * Le misure, in ordine di quanto contano per lui.
 *
 * I passi vengono per primi e grandi: il programma è dodici settimane di
 * walking pad, quindi sono LA misura, non una delle sei. Il resto sta sotto,
 * più piccolo, perché una scheda in cui sei numeri hanno la stessa dimensione
 * è una scheda che non ha deciso niente e la si smette di guardare.
 *
 * `versoBuono` dice da che parte è il miglioramento: per i passi salire, per
 * il battito a riposo scendere — è l'unica misura qui che migliora calando, e
 * colorarla come le altre vorrebbe dire dipingere di rosso il progresso.
 */
const MISURE = [
  { id: "passi", nome: "Passi", formato: num, versoBuono: "su", principale: true },
  { id: "calorieAttive", nome: "Calorie attive", formato: num, versoBuono: "su" },
  { id: "esercizioMinuti", nome: "Esercizio", formato: (v) => `${num(v)} min`, versoBuono: "su" },
  { id: "distanzaKm", nome: "Distanza", formato: (v) => `${num1(v)} km`, versoBuono: "su" },
  { id: "frequenzaRiposo", nome: "Battito a riposo", formato: num, versoBuono: "giu" },
  { id: "sonnoMinuti", nome: "Sonno", formato: oreMinuti, versoBuono: "su" },
  { id: "inPiediOre", nome: "Ore in piedi", formato: (v) => `${num(v)} h`, versoBuono: "su" },
];

/**
 * Quanti giorni pieni servono prima di dire "media".
 *
 * Con due giorni la media è il secondo giorno travestito: sembra un
 * riferimento e non lo è. Meglio dire che manca ancora qualche giorno.
 */
const MINIMO_PER_MEDIA = 4;

function oreMinuti(minuti) {
  const m = Math.round(Number(minuti) || 0);
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}`;
}

const somma = (righe, campo) =>
  righe.map((r) => r[campo]).filter(Number.isFinite).reduce((s, v) => s + v, 0);

function media(righe, campo) {
  const valori = righe.map((r) => r[campo]).filter(Number.isFinite);
  if (valori.length < MINIMO_PER_MEDIA) return null;
  return valori.reduce((s, v) => s + v, 0) / valori.length;
}

export default function Salute({ salute, oggiIso, modifica, ricarica }) {
  const oggi = salute?.oggi ?? {};
  const storia = salute?.storia ?? [];

  /**
   * Oggi non entra mai nelle medie, e non è un dettaglio.
   *
   * Alle nove di mattina hai ottocento passi. Confrontarli con una media di
   * giornate intere dice "sei indietro del novanta per cento", che è falso:
   * la giornata è appena cominciata. Le medie si fanno sui giorni finiti, e
   * il numero di oggi si mostra per quello che è — un parziale.
   */
  const pieni = storia.filter((s) => s.data !== oggiIso);
  const ultimi14 = storia.slice(-14);

  // Il confronto che conta davvero: sette giorni contro i sette prima. Una
  // giornata storta non vuol dire niente, due settimane di fila sì.
  const settimana = pieni.slice(-7);
  const settimanaPrima = pieni.slice(-14, -7);
  const confrontoPronto = settimana.length >= 5 && settimanaPrima.length >= 5;

  const arrivato = MISURE.some((m) => Number.isFinite(oggi[m.id]));
  const visibili = MISURE.filter(
    (m) => Number.isFinite(oggi[m.id]) || storia.some((s) => Number.isFinite(s[m.id]))
  );
  const principale = visibili.find((m) => m.principale) ?? visibili[0];
  const secondarie = visibili.filter((m) => m !== principale);

  return (
    <section className="card col-4" id="card-salute">
      <header>
        <Battito />
        <h2>Salute</h2>
        <div className="spacer" />
        <span className="hint">
          {pieni.length
            ? `${pieni.length} ${pieni.length === 1 ? "giorno pieno" : "giorni pieni"} in memoria`
            : "dall'orologio"}
        </span>
      </header>

      <div className="body">
        <Peso
          valore={oggi.peso ?? null}
          storia={storia}
          oggiIso={oggiIso}
          modifica={modifica}
          ricarica={ricarica}
        />

        {!arrivato && storia.length === 0 ? (
          <div className="note" style={{ marginTop: 0 }}>
            Non è ancora arrivato niente dall&apos;orologio. È il tuo iPhone che, una
            volta al giorno, manda qui i numeri di Salute: si prepara una volta
            sola con <b>Comandi Rapidi</b>. Intanto il peso lo puoi già segnare
            qui sopra, a mano.
            <div style={{ marginTop: 10 }}>
              <PromptPronto
                titolo="Fatti guidare dalla tua AI a collegare l&apos;orologio"
                testo={promptSalute(typeof window === "undefined" ? "https://IL-TUO-INDIRIZZO" : window.location.origin)}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="oggi-lab">
              Oggi, finora
              {!arrivato && <span className="niente"> · non è ancora arrivato niente</span>}
            </div>

            {principale && (
              <Principale misura={principale} oggi={oggi} pieni={pieni} />
            )}

            {secondarie.length > 0 && (
              <div className="misure">
                {secondarie.map((m) => (
                  <Secondaria key={m.id} misura={m} oggi={oggi} pieni={pieni} />
                ))}
              </div>
            )}

            {ultimi14.length > 1 && principale && (
              <Barrette
                righe={ultimi14}
                campo={principale.id}
                nome={principale.nome.toLowerCase()}
                oggiIso={oggiIso}
              />
            )}
          </>
        )}

        <UltimoInvio oggi={oggi} />
      </div>

      <div className="foot">
        <Passo />
        <Settimana
          pronto={confrontoPronto}
          settimana={settimana}
          prima={settimanaPrima}
          pieni={pieni}
          misura={principale}
        />
      </div>
    </section>
  );
}

/**
 * Cosa portava l'ultimo invio, e cosa no.
 *
 * Serve a un guasto vero e già capitato: nel comando che manda tutto insieme, il
 * blocco dei minuti di esercizio si era agganciato a quello sopra ed era
 * diventato un "Filtra", quindi arrivava vuoto. Il server fa la cosa giusta e
 * tiene il valore di prima — un invio parziale non deve cancellare niente — ma
 * sullo schermo restava il numero di stamattina con l'aria di essere quello di
 * adesso, e non c'era modo di accorgersene se non conoscendo il proprio corpo.
 *
 * Una riga sola, e quel guasto si vede: "non c'era esercizio".
 */
function UltimoInvio({ oggi }) {
  if (!oggi?.aggiornatoIl) return null;

  const ora = new Date(oggi.aggiornatoIl).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const ultimi = Array.isArray(oggi.ultimiCampi) ? oggi.ultimiCampi : null;
  // I dati scritti prima di questa versione non sanno cosa portavano: si dice
  // l'ora e basta, invece di far credere che non fosse arrivato niente.
  if (!ultimi) return <div className="invio">ultimo invio dal telefono alle {ora}</div>;

  const nome = (id) =>
    id === "peso" ? "peso" : (MISURE.find((m) => m.id === id)?.nome ?? id).toLowerCase();
  const portati = ultimi.map(nome);
  const rimasti = MISURE.filter(
    (m) => Number.isFinite(oggi[m.id]) && !ultimi.includes(m.id)
  ).map((m) => m.nome.toLowerCase());

  return (
    <div className="invio">
      Ultimo invio alle {ora}: {portati.length ? portati.join(", ") : "niente di leggibile"}.
      {rimasti.length > 0 && (
        <>
          {" "}
          Non c&apos;{rimasti.length === 1 ? "era" : "erano"} <b>{rimasti.join(", ")}</b>: quello che
          vedi è il numero dell&apos;invio prima.
        </>
      )}
    </div>
  );
}

/** La misura che conta: grande, con accanto il riferimento dei giorni pieni. */
function Principale({ misura, oggi, pieni }) {
  const valore = oggi[misura.id];
  const riferimento = media(pieni, misura.id);
  const quanti = pieni.filter((s) => Number.isFinite(s[misura.id])).length;

  return (
    <div className="principale">
      <div className="k">{misura.nome}</div>
      <div className="v num">{Number.isFinite(valore) ? misura.formato(valore) : "—"}</div>
      <div className="rif">
        {riferimento !== null ? (
          <>
            di solito <b className="num">{misura.formato(riferimento)}</b> al giorno
          </>
        ) : quanti > 0 ? (
          `servono ${MINIMO_PER_MEDIA - quanti} ${MINIMO_PER_MEDIA - quanti === 1 ? "giorno" : "giorni"} in più per un riferimento`
        ) : (
          "il riferimento compare dopo qualche giorno"
        )}
      </div>
    </div>
  );
}

function Secondaria({ misura, oggi, pieni }) {
  const valore = oggi[misura.id];
  const riferimento = media(pieni, misura.id);

  return (
    <div className="misura">
      <span className="k">{misura.nome}</span>
      <span className="v num">{Number.isFinite(valore) ? misura.formato(valore) : "—"}</span>
      <span className="avg">
        {riferimento !== null ? `di solito ${misura.formato(riferimento)}` : ""}
      </span>
    </div>
  );
}

/**
 * Sette giorni contro i sette prima.
 *
 * È l'unica frase di questa scheda che risponde alla domanda vera — "sto
 * migliorando?" — e per rispondere servono due settimane. Prima di allora lo
 * dice, invece di calcolare una percentuale su tre giorni e farla sembrare una
 * tendenza.
 */
function Settimana({ pronto, settimana, prima, pieni, misura }) {
  if (!misura) return <span>i numeri compaiono quando il telefono comincia a mandarli</span>;

  if (!pronto) {
    const mancano = Math.max(0, 10 - pieni.length);
    return (
      <span>
        {pieni.length === 0
          ? "i numeri compaiono quando il telefono comincia a mandarli"
          : `il confronto fra settimane arriva fra ${mancano} ${mancano === 1 ? "giorno" : "giorni"}`}
      </span>
    );
  }

  const ora = somma(settimana, misura.id) / settimana.length;
  const allora = somma(prima, misura.id) / prima.length;
  const variazione = allora ? Math.round(((ora - allora) / allora) * 100) : 0;
  const bene = misura.versoBuono === "giu" ? variazione < 0 : variazione > 0;

  return (
    <span>
      Ultimi 7 giorni: <b className="num">{misura.formato(ora)}</b> al giorno,{" "}
      {variazione === 0 ? (
        "come i sette prima"
      ) : (
        <b className={bene ? "pos" : "neg"}>
          {variazione > 0 ? "+" : ""}
          {variazione}%
        </b>
      )}
      {variazione !== 0 ? " rispetto ai sette prima" : ""}
    </span>
  );
}

/**
 * Il peso di oggi, sempre a portata di mano.
 *
 * Sta qui e non solo nella scheda dell'allenamento per due motivi. Il primo è
 * dove lo si cerca: il peso è una misura di salute, non un pezzo di programma.
 * Il secondo è che il programma finisce l'8 novembre e la bilancia no — se
 * l'unico posto per scriverlo fosse dentro le dodici settimane, quel giorno
 * sparirebbe.
 *
 * Passa dalla stessa rotta della scheda Allenamento, quindi i due punti non
 * possono dire numeri diversi: c'è una funzione sola che tiene allineate la
 * riga del programma e il log della salute.
 */
function Peso({ valore, storia, oggiIso, modifica, ricarica }) {
  const [testo, setTesto] = useState("");
  const [aperto, setAperto] = useState(false);
  const [errore, setErrore] = useState(null);

  useEffect(() => {
    setAperto(false);
    setTesto("");
  }, [valore, oggiIso]);

  const pesate = storia.filter((s) => Number.isFinite(s.peso));
  // Il confronto è con l'ultima pesata PRECEDENTE, non con quella di oggi:
  // altrimenti il giorno che scrivi il peso la differenza è sempre zero.
  const prima = pesate.filter((s) => s.data !== oggiIso).slice(-1)[0] ?? null;
  const differenza = valore !== null && prima ? valore - prima.peso : null;

  const salva = async () => {
    const pulito = testo.trim();
    if (!pulito) {
      setAperto(false);
      return;
    }
    setErrore(null);
    try {
      await postJson("/api/peso", { data: oggiIso, peso: pulito });
      setTesto("");
      setAperto(false);
      await ricarica();
    } catch (e) {
      setErrore(e.message);
    }
  };

  const togli = async () => {
    await postJson("/api/peso", { data: oggiIso, peso: "" }).catch(() => {});
    await ricarica();
  };

  return (
    <div className="peso-oggi">
      <div className="testa">
        <span className="k">Peso di oggi</span>
        {prima && (
          <span className="prima">
            ultima pesata {num1(prima.peso)} kg il {Number(prima.data.slice(8, 10))}/
            {Number(prima.data.slice(5, 7))}
          </span>
        )}
      </div>

      {valore !== null && !aperto ? (
        <div className="riga">
          <span className="v num">{num1(valore)}</span>
          <span className="u">kg</span>
          {differenza !== null && differenza !== 0 && (
            <span className={`delta num ${differenza < 0 ? "pos" : "neg"}`}>
              {differenza > 0 ? "+" : ""}
              {num1(differenza)}
            </span>
          )}
          <div style={{ flex: 1 }} />
          <button className="mini" onClick={() => setAperto(true)}>
            correggi
          </button>
          <button className="mini" onClick={togli}>
            togli
          </button>
        </div>
      ) : (
        <div className="riga">
          <input
            className="in-peso"
            autoFocus={aperto}
            value={testo}
            onChange={(e) => setTesto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") salva();
              if (e.key === "Escape") {
                setAperto(false);
                setTesto("");
              }
            }}
            placeholder={valore !== null ? num1(valore) : "__,_"}
            inputMode="decimal"
          />
          <span className="u">kg</span>
          <button className="btn primary" onClick={salva} disabled={!testo.trim()}>
            Segna
          </button>
        </div>
      )}

      {errore && <div className="gate-err" style={{ marginTop: 8 }}>{errore}</div>}
    </div>
  );
}

/**
 * Gli ultimi quattordici giorni, a barrette.
 *
 * A barrette e non a curva: i passi di un giorno non "diventano" quelli del
 * giorno dopo, sono quantità separate. Una linea che li unisce suggerisce una
 * continuità che non esiste, e fa sembrare una domenica ferma una discesa.
 *
 * La barra di oggi è rigata apposta: è l'unica che non ha ancora finito, e
 * confonderla con le altre vuol dire vedere un crollo tutte le mattine.
 */
function Barrette({ righe, campo, nome, oggiIso }) {
  const conDato = righe.filter((r) => Number.isFinite(r[campo]));
  if (conDato.length < 2) return null;

  const massimo = Math.max(...conDato.map((r) => r[campo]), 1);
  const pieni = conDato.filter((r) => r.data !== oggiIso);
  const riferimento = pieni.length >= MINIMO_PER_MEDIA
    ? pieni.reduce((s, r) => s + r[campo], 0) / pieni.length
    : null;

  return (
    <div className="storico">
      <div className="barrette" role="img" aria-label={`Ultimi giorni: ${campo}`}>
        {riferimento !== null && (
          <span
            className="riga-media"
            style={{ bottom: `${(riferimento / massimo) * 100}%` }}
            title={`media dei giorni pieni: ${Math.round(riferimento)}`}
          />
        )}
        {conDato.map((r) => (
          <span
            className="b"
            key={r.data}
            data-oggi={r.data === oggiIso || undefined}
            title={`${r.data}: ${num(r[campo])}`}
            style={{ height: `${Math.max(4, (r[campo] / massimo) * 100)}%` }}
          />
        ))}
      </div>
      {/* Cosa misurano queste barre va scritto qui sotto. Un istogramma senza
          il nome della misura è un disegno: si guarda, si intuisce, e ogni
          tanto si intuisce la cosa sbagliata. */}
      <div className="didascalia">
        {nome ? `${nome}, ` : ""}ultimi {conDato.length}{" "}
        {conDato.length === 1 ? "giorno" : "giorni"}
        {riferimento !== null ? " · la riga è la tua media" : ""}
        {conDato.some((r) => r.data === oggiIso) ? " · oggi è la barra rigata" : ""}
      </div>
    </div>
  );
}
