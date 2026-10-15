import Link from "next/link";
import { StatePanel, linkClass } from "./_components/StatePanel";

export default function NotFound() {
  return (
    <StatePanel
      heading="That page does not exist"
      action={
        <Link href="/" className={linkClass}>
          Back to the finder
        </Link>
      }
    >
      The address may be mistyped, or the page may have moved.
    </StatePanel>
  );
}
