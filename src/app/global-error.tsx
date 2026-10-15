"use client";

import "./globals.css";

// Replaces the root layout, so it renders its own <html> and <body>. No
// next/font here: the system font stack is the fallback. Fixed text only.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-5 py-16 sm:px-10">
          <div className="max-w-[40em] rounded-tile border border-line bg-white px-6 py-6">
            <h1 className="font-heading text-[26px] font-bold leading-tight text-blue">
              Something went wrong
            </h1>
            <p className="mt-2">The finder could not load. Please try again.</p>
            <button
              type="button"
              onClick={reset}
              className="mt-4 rounded-full bg-red px-[34px] py-[15px] font-heading text-base font-bold text-white"
            >
              Try again
            </button>
          </div>
        </main>
        <footer className="mx-auto w-full max-w-[1200px] px-5 py-8 text-base text-muted sm:px-10">
          A concept, not an official Boundless design. All offers and figures are fictional sample
          data.
        </footer>
      </body>
    </html>
  );
}
