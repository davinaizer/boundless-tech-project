import type { ReactNode } from "react";

// The card used by the route-state files (loading, error, not found). Plain
// text and one action; it never shows an error message or digest.
export function StatePanel({
  heading,
  children,
  action,
}: {
  heading: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-[1200px] px-5 py-16 sm:px-10">
      <div className="max-w-[40em] rounded-tile border border-line bg-white px-6 py-6">
        <h1 className="font-heading text-[26px] font-bold leading-tight text-blue">{heading}</h1>
        {children && <p className="mt-2">{children}</p>}
        {action && <div className="mt-4 flex flex-wrap gap-3">{action}</div>}
      </div>
    </main>
  );
}

export const actionClass =
  "rounded-full bg-red px-[34px] py-[15px] font-heading text-base font-bold text-white";
export const linkClass =
  "rounded-full border border-blue px-[34px] py-[15px] font-heading text-base font-bold text-blue";
