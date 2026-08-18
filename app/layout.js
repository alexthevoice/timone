import { NOME } from "@/lib/app";
import { DM_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = DM_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Il titolo della finestra segue il nome scelto da Config, con la rete. */
export async function generateMetadata() {
  const { leggiProfilo } = await import("@/lib/store");
  const nome = await leggiProfilo()
    .then((p) => p.nomeSistema || NOME)
    .catch(() => NOME);
  return { title: nome };
}

export default function RootLayout({ children }) {
  return (
    <html lang="it" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        {/* La scelta del tema va applicata prima che si veda qualsiasi cosa:
            questo script gira per primo e mette data-tema su <html>. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{var t=localStorage.getItem("tema");if(t==="chiaro"||t==="scuro"){document.documentElement.dataset.tema=t}var s=localStorage.getItem("schema");if(s&&s!=="navy"){document.documentElement.dataset.schema=s}}catch(e){}',
          }}
        />{children}</body>
    </html>
  );
}
