"use client";

import { useState } from "react";
import Griglia from "@/components/Griglia";
import { postJson } from "@/lib/useDati";

/**
 * I cicli aperti, in Kanban per settore.
 *
 * Il posto dove un pensiero si scarica a terra nel momento in cui arriva:
 * niente date, niente urgenze, solo la colonna del reparto a cui appartiene.
 * La testa si libera, la parete resta sott'occhio. Quando un ciclo è maturo
 * si promuove: diventa un task vero, con fascia e scadenza, e sparisce da
 * qui lasciando la traccia (PromossoIl e l'id del task, sulla riga).
 *
 * Le colonne sono le scelte del campo Settore su Airtable: scriverne uno
 * nuovo nella casella in fondo crea la colonna (typecast fa il resto). Le
 * quattro predefinite si vedono anche da vuote, così la parete ha una forma
 * dal primo giorno; una colonna nuova vive finché ha almeno un ciclo dentro.
 */

const SETTORI_PREDEFINITI = ["Amministrazione", "Personale", "IT", "Vendite"];
const SENZA = "__senza__";

export default function Cicli({ attiva, dati, modifica, ricarica }) {
  const [inVolo, setInVolo] = useState(null);
  const [bozze, setBozze] = useState({});
  const [inPromozione, setInPromozione] = useState(null);
  const [colonneNuove, setColonneNuove] = useState([]);
  const [nomeNuova, setNomeNuova] = useState("");

  if (!dati) {
    return (
      <Griglia id="cicli" attiva={attiva}>
        <section className="card col-12">
          <div className="body" style={{ padding: 16, color: "var(--text-faint)" }}>
            Sto leggendo i tuoi dati…
          </div>
        </section>
      </Griglia>
    );
  }

  const cicli = dati.cicli ?? [];

  // Le colonne: le predefinite sempre, poi quelle che esistono nei dati,
  // poi quelle appena aggiunte a mano. "Senza settore" compare solo se
  // qualcosa ci è finito dentro (una cattura al volo da Telegram).
  const daiDati = [...new Set(cicli.map((c) => c.settore).filter(Boolean))];
  const colonne = [
    ...SETTORI_PREDEFINITI,
    ...daiDati.filter((s) => !SETTORI_PREDEFINITI.includes(s)).sort((a, b) => a.localeCompare(b, "it")),
    ...colonneNuove.filter((s) => !daiDati.includes(s) && !SETTORI_PREDEFINITI.includes(s)),
  ];
  const senzaSettore = cicli.filter((c) => !c.settore);

  const aggiungi = async (settore) => {
    const titolo = (bozze[settore] ?? "").trim();
    if (!titolo) return;
    setBozze((b) => ({ ...b, [settore]: "" }));
    await modifica(
      (d) => ({
        ...d,
        cicli: [
          { id: `nuovo-${titolo}`, titolo, nota: "", settore: settore === SENZA ? null : settore, posizione: -999 },
          ...(d.cicli ?? []),
        ],
      }),
      () => postJson("/api/cicli", { titolo, settore: settore === SENZA ? undefined : settore })
    );
    await ricarica();
  };

  const spostaInSettore = async (id, settore) => {
    const vero = settore === SENZA ? null : settore;
    const dentro = cicli.filter((c) => (c.settore ?? null) === vero && c.id !== id).map((c) => c.id);
    await modifica(
      (d) => ({
        ...d,
        cicli: (d.cicli ?? []).map((c) => (c.id === id ? { ...c, settore: vero, posizione: -999 } : c)),
      }),
      () => postJson("/api/cicli", { settore: vero ?? "", ordine: [id, ...dentro] }, "PATCH")
    );
    await ricarica();
  };

  const promuovi = async (id, fascia, scadenza) => {
    setInPromozione(null);
    await modifica(
      (d) => ({ ...d, cicli: (d.cicli ?? []).filter((c) => c.id !== id) }),
      () => postJson(`/api/cicli/${id}`, { fascia, scadenza: scadenza || undefined })
    );
    await ricarica();
  };

  const elimina = async (id) => {
    await modifica(
      (d) => ({ ...d, cicli: (d.cicli ?? []).filter((c) => c.id !== id) }),
      () => postJson(`/api/cicli/${id}`, {}, "DELETE")
    );
    await ricarica();
  };

  const colonna = (settore, righe) => (
    <div
      className="col"
      key={settore}
      onDragOver={(ev) => ev.preventDefault()}
      onDrop={(ev) => {
        ev.preventDefault();
        const id = ev.dataTransfer.getData("text/plain") || inVolo;
        if (id) spostaInSettore(id, settore);
        setInVolo(null);
      }}
    >
      <h3>
        {settore === SENZA ? "Da smistare" : settore}
        <span className="n">{righe.length}</span>
      </h3>
      <div className="cards">
        {righe.map((c) => (
          <div
            className="tcard"
            key={c.id}
            draggable
            onDragStart={(ev) => {
              ev.dataTransfer.setData("text/plain", c.id);
              setInVolo(c.id);
            }}
          >
            <div className="t">{c.titolo}</div>
            {c.nota ? <div className="p" style={{ marginTop: 4 }}>{c.nota}</div> : null}
            {inPromozione === c.id ? (
              <FormPromozione onVia={(fascia, scadenza) => promuovi(c.id, fascia, scadenza)} onAnnulla={() => setInPromozione(null)} />
            ) : (
              <div className="row">
                <button className="mini" onClick={() => setInPromozione(c.id)} title="Diventa un task, con fascia e scadenza">
                  → task
                </button>
                <div style={{ flex: 1 }} />
                <span
                  className="x"
                  onClick={() => elimina(c.id)}
                  title="Questo pensiero non serve più"
                  style={{ cursor: "pointer", color: "var(--text-faint)" }}
                >
                  ×
                </span>
              </div>
            )}
          </div>
        ))}
        <div className="add">
          <input
            value={bozze[settore] ?? ""}
            onChange={(e) => setBozze((b) => ({ ...b, [settore]: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && aggiungi(settore)}
            placeholder="+ scarica a terra, poi Invio"
            style={{ background: "none", border: "none", outline: "none", width: "100%", font: "inherit", color: "inherit", fontSize: 12.5, padding: "6px 2px" }}
          />
        </div>
      </div>
    </div>
  );

  return (
    <Griglia id="cicli" attiva={attiva}>
      <section className="card col-12" id="card-cicli">
        <header>
          <h2>Cicli aperti</h2>
          <div className="spacer" />
          <span className="hint">
            quello che ti gira in testa, parcheggiato per settore: si promuove a task quando è il momento
          </span>
        </header>
        <div className="body">
          <div className="kanban cicli">
            {colonne.map((s) => colonna(s, cicli.filter((c) => c.settore === s)))}
            {senzaSettore.length > 0 && colonna(SENZA, senzaSettore)}
          </div>
          <div className="nuova-colonna">
            <input
              value={nomeNuova}
              onChange={(e) => setNomeNuova(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                const nome = nomeNuova.trim();
                if (!nome) return;
                setColonneNuove((c) => [...c, nome]);
                setNomeNuova("");
              }}
              placeholder="+ nuovo settore, poi Invio"
            />
            <span className="hint">
              la colonna resta finché ha almeno un ciclo dentro; da Telegram: «ciclo IT: ordinare il toner»
            </span>
          </div>
        </div>
      </section>
    </Griglia>
  );
}

/** Fascia e scadenza, il minimo che serve per diventare un impegno vero. */
function FormPromozione({ onVia, onAnnulla }) {
  const [fascia, setFascia] = useState("settimana");
  const [scadenza, setScadenza] = useState("");

  return (
    <div className="promozione">
      <select value={fascia} onChange={(e) => setFascia(e.target.value)}>
        <option value="oggi">Oggi</option>
        <option value="settimana">Questa settimana</option>
        <option value="avanti">Più avanti</option>
      </select>
      <input type="date" value={scadenza} onChange={(e) => setScadenza(e.target.value)} />
      <button className="mini" onClick={() => onVia(fascia, scadenza)}>
        promuovi
      </button>
      <button className="mini" onClick={onAnnulla}>
        annulla
      </button>
    </div>
  );
}
