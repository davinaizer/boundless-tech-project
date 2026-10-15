"use client";

import Link from "next/link";
import { StatePanel, actionClass, linkClass } from "./_components/StatePanel";

// Fixed text only: the error's message and digest can carry internals, so
// neither is shown (architecture: errors).
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <StatePanel
      heading="Something went wrong"
      action={
        <>
          <button type="button" onClick={reset} className={actionClass}>
            Try again
          </button>
          <Link href="/" className={linkClass}>
            Back to the finder
          </Link>
        </>
      }
    >
      We could not show this page. Please try again.
    </StatePanel>
  );
}
