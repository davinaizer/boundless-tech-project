import { StatePanel } from "./_components/StatePanel";

// Shown while a route segment suspends. The finder page is static and loads its
// results on the client, so this is rarely visible; it is here because
// ADR-009 rule 12 asks for the route states. The status role is on the text,
// not on the landmark that wraps it.
export default function Loading() {
  return (
    <StatePanel heading="Loading…">
      <span role="status">Please wait while the page loads.</span>
    </StatePanel>
  );
}
