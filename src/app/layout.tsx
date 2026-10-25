import type { Metadata } from "next";
import { Carlito, Inter } from "next/font/google";
import { APP_VERSION } from "@/lib/version";
import { DebugPanel } from "./_components/DebugPanel";
import "./globals.css";

// Stand-ins for the public site's Korto and Aller (DESIGN.md).
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const carlito = Carlito({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-carlito",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Benefits finder",
  description: "Find member benefits with a natural-language query.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${carlito.variable}`}>
      <body className="flex min-h-screen flex-col">
        <header className="bg-white shadow-sm">
          <div className="mx-auto max-w-[1200px] px-5 py-4 sm:px-10">
            <span className="font-heading text-2xl font-bold text-blue">Benefits Finder</span>
          </div>
        </header>
        <div className="flex-1">{children}</div>
        <footer className="mx-auto w-full max-w-[1200px] px-5 py-8 text-base text-muted sm:px-10">
          <p>
            A concept, not an official Boundless design. All offers and figures are fictional sample
            data.
          </p>
          <p className="mt-1 text-sm">{APP_VERSION}</p>
        </footer>
        <DebugPanel />
      </body>
    </html>
  );
}
