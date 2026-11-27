import { Suspense } from "react";
import { FixtureEditor } from "../../prototypes/sp-01/fixture-editor";

export default function EditorPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-4 px-6 py-12">
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- SP-01 uses full document navigation on a plain static host. */}
      <a className="text-blue-800 underline" href="/">Back to diagram library</a>
      <h1 className="text-3xl font-semibold">Diagram editor</h1>
      <Suspense fallback={<p role="status">Loading sample…</p>}>
        <FixtureEditor />
      </Suspense>
    </main>
  );
}
