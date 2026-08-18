"use client";

import { useState } from "react";
import { INTERFACCIA_PREDEFINITA, MODULI, SCHEMI, normalizzaInterfaccia } from "@/lib/moduli";
import { postJson } from "@/lib/useDati";

/**
 * Il wizard del primo accesso.
 *
 * Tre domande, nell'ordine in cui servono: come si chiama questa dashboard
 * (e chi sei tu), quali moduli accendere, di che colore la vuoi. Scrive
 * tutto nel Profilo e si toglie di torno; da Config si può rifare quando
 * si vuole, coi valori già compilati.
 *
 * Il nome del sistema si sceglie QUI e non in Config: è una decisione da
 * giorno uno, non un interruttore da toccare ogni settimana.
 */
export default function Wizard({ profilo, ricarica }) {
  const base = normalizzaInterfaccia(profilo?.interfaccia);

  const [passo, setPasso] = useState(0);
  const [nomeSistema, setNomeSistema] = useState(profilo?.nomeSistema ?? "");
  const [nome, setNome] = useState(profilo?.nome ?? "");
  const [cognome, setCognome] = useState(profilo?.cognome ?? "");
  const [moduli, setModuli] = useState(base.moduli);
  const [schema, setSchema] = useState(base.tema.schema);
  const [tema, setTema] = useState("sistema");
  const [salvando, setSalvando] = useState(false);
  const [errore, setErrore] = useState(null);

  const applicaAspetto = (s, t) => {
    if (s === "navy") {
      delete document.documentElement.dataset.schema;
      localStorage.removeItem("schema");
    } else {
      document.documentElement.dataset.schema = s;
      localStorage.setItem("schema", s);
    }
    if (t === "sistema") {
      localStorage.removeItem("tema");
      delete document.documentElement.dataset.tema;
    } else {
      localStorage.setItem("tema", t);
      document.documentElement.dataset.tema = t;
    }
  };

  const fine = async () => {
    setSalvando(true);
    setErrore(null);
    try {
      await postJson(
        "/api/profilo",
        {
          nome: nome.trim(),
          cognome: cognome.trim(),
          nomeSistema: nomeSistema.trim(),
          interfaccia: { ...base, moduli, tema: { schema } },
          configurato: true,
        },
        "PATCH"
      );
      applicaAspetto(schema, tema);
      await ricarica();
    } catch (e) {
      setErrore(e.message);
      setSalvando(false);
    }
  };

  const PASSI = [
    {
      titolo: "Benvenuto. Come si chiama questa dashboard?",
      sotto:
        "Il nome comparirà nella barra, nel menu e sulla schermata di accesso. È tua: chiamala come vuoi. E dicci chi sei, per il profilo.",
      corpo: (
        <div className="modulo-config">
          <label>
            Nome della dashboard
            <input
              autoFocus
              value={nomeSistema}
              onChange={(e) => setNomeSistema(e.target.value)}
              placeholder="vuoto = quello di partenza"
            />
          </label>
          <label>
            Il tuo nome
            <input value={nome} onChange={(e) => setNome(e.target.value)} />
          </label>
          <label>
            Il tuo cognome
            <input value={cognome} onChange={(e) => setCognome(e.target.value)} />
          </label>
        </div>
      ),
    },
    {
      titolo: "Cosa vuoi tenere acceso?",
      sotto:
        "Il cuore (la cattura, le cose da fare, gli obiettivi, le abitudini) è sempre acceso. Il resto è a scelta, e si può riaccendere in qualsiasi momento da Config: spegnere non cancella niente.",
      corpo: (
        <div className="scelta-moduli">
          {MODULI.map((m) => (
            <label key={m.id}>
              <input
                type="checkbox"
                checked={moduli[m.id] !== false}
                onChange={(e) => setModuli((v) => ({ ...v, [m.id]: e.target.checked }))}
              />
              {m.nome}
            </label>
          ))}
        </div>
      ),
    },
    {
      titolo: "Di che colore la vuoi?",
      sotto: "Uno schema per i colori, e chiaro o scuro per la luce. Si cambiano quando vuoi, da Config.",
      corpo: (
        <>
          <div className="scelta-schemi">
            {SCHEMI.map((s) => (
              <button
                key={s.id}
                aria-pressed={schema === s.id}
                onClick={() => {
                  setSchema(s.id);
                  applicaAspetto(s.id, tema);
                }}
              >
                <span className="pallini">
                  {s.pallini.map((c) => (
                    <i key={c} style={{ background: c }} />
                  ))}
                </span>
                {s.nome}
              </button>
            ))}
          </div>
          <div className="scelte-tema" style={{ marginTop: 12 }}>
            {[
              { id: "chiaro", nome: "Chiaro" },
              { id: "scuro", nome: "Scuro" },
              { id: "sistema", nome: "Come il sistema" },
            ].map((t) => (
              <button
                key={t.id}
                aria-pressed={tema === t.id}
                onClick={() => {
                  setTema(t.id);
                  applicaAspetto(schema, t.id);
                }}
              >
                {t.nome}
              </button>
            ))}
          </div>
        </>
      ),
    },
  ];

  const attuale = PASSI[passo];

  return (
    <div className="velo-wizard">
      <div className="wizard">
        <div className="passi">
          {PASSI.map((_, i) => (
            <i key={i} data-fatto={i <= passo} />
          ))}
        </div>
        <h1>{attuale.titolo}</h1>
        <div className="sotto">{attuale.sotto}</div>
        <section className="card">
          <div className="body">{attuale.corpo}</div>
        </section>
        <div style={{ display: "flex", gap: 8 }}>
          {passo > 0 && (
            <button className="btn" onClick={() => setPasso(passo - 1)}>
              Indietro
            </button>
          )}
          <div style={{ flex: 1 }} />
          {passo < PASSI.length - 1 ? (
            <button className="btn primary" onClick={() => setPasso(passo + 1)}>
              Avanti
            </button>
          ) : (
            <button className="btn primary" disabled={salvando} onClick={fine}>
              {salvando ? "Salvo…" : "Fine: si comincia"}
            </button>
          )}
        </div>
        {errore && <div className="gate-err">{errore}</div>}
      </div>
    </div>
  );
}
