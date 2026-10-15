import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Benefits finder",
  description: "Find member benefits with a natural-language query.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
