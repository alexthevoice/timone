import { NOME } from "@/lib/app";
import { VERSIONE } from "@/lib/versione";

export const dynamic = "force-dynamic";

export const metadata = { title: NOME };

/**
 * La pagina di login.
 *
 * È un form vero, che invia al server e riceve indietro un redirect col cookie
 * già dentro. Nessun fetch, nessuno stato da tenere: il browser fa quello che
 * sa fare da trent'anni. Funziona anche col JavaScript spento, e soprattutto
 * non c'è nessun punto in cui il cookie possa non attecchire.
 */
export default async function Login({ searchParams }) {
  const p = await searchParams;
  const errore = p?.errore;
  const da = typeof p?.da === "string" && p.da.startsWith("/") && !p.da.startsWith("//") ? p.da : "/";

  return (
    <main className="gate">
      <form className="gate-card" method="POST" action="/api/auth/login">
        <div className="brand">
          <span className="dot" /> {NOME}
          <span className="versione num">{VERSIONE}</span>
        </div>
        <p className="gate-hint">Questa dashboard sa parecchie cose di te.</p>

        <input type="hidden" name="da" value={da} />
        <input
          type="password"
          name="password"
          autoFocus
          autoComplete="current-password"
          placeholder="Password"
          required
        />

        {errore === "1" && <div className="gate-err">Password sbagliata.</div>}
        {errore === "configurazione" && (
          <div className="gate-err">
            Manca DASHBOARD_PASSWORD sul server: il cancello non può funzionare.
          </div>
        )}

        <button className="btn primary" type="submit">
          Entra
        </button>
      </form>
    </main>
  );
}
