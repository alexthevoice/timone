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

export const metadata = {
  title: NOME,
  description: "La dashboard che tiene insieme le mie cose",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        {/* La scelta del tema va applicata prima che si veda qualsiasi cosa:
            questo script gira per primo e mette data-tema su <html>. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{var t=localStorage.getItem("tema");if(t==="chiaro"||t==="scuro"){document.documentElement.dataset.tema=t}}catch(e){}',
          }}
        />{children}</body>
    </html>
  );
}
