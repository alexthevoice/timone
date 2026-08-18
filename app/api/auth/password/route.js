import { NextResponse } from "next/server";
import { confrontoATempoCostante, fabbricaHashPassword, passwordCombacia } from "@/lib/auth";
import { impostaPasswordHash, leggiPasswordHash, scriviRegistro } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Il cambio password, da Config.
 *
 * Sta dietro il cancello (serve la sessione), e in più richiede la password
 * attuale: un browser lasciato aperto non deve bastare a chiudere fuori il
 * padrone di casa. La nuova si salva come hash su Airtable e da quel momento
 * vince sulla DASHBOARD_PASSWORD delle variabili d'ambiente, che resta la
 * via di recupero: svuota il campo PasswordHash sul Profilo e torna valida.
 */
export async function POST(richiesta) {
  const { attuale, nuova } = await richiesta.json().catch(() => ({}));

  if (String(nuova ?? "").length < 12) {
    return NextResponse.json(
      { errore: "La nuova password deve avere almeno 12 caratteri. Una frase lunga vale più di otto simboli." },
      { status: 400 }
    );
  }

  const salvata = await leggiPasswordHash().catch(() => null);
  const buona = salvata
    ? await passwordCombacia(String(attuale ?? ""), salvata)
    : confrontoATempoCostante(String(attuale ?? ""), process.env.DASHBOARD_PASSWORD ?? "");

  if (!buona) {
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ errore: "La password attuale non è giusta." }, { status: 401 });
  }

  await impostaPasswordHash(await fabbricaHashPassword(String(nuova)));
  await scriviRegistro("password-cambiata", "dalla pagina Config").catch(() => {});
  return NextResponse.json({ ok: true });
}
