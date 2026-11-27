import { fixtureEditorHref } from "../prototypes/sp-01/fixture";

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-12">
      <h1 className="text-3xl font-semibold">Nodary diagram library</h1>
      <section aria-labelledby="sample" className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 id="sample" className="text-lg font-medium">Static shell prototype</h2>
        <a className="mt-3 inline-block text-blue-800 underline" href={fixtureEditorHref}>
          Open sample diagram
        </a>
      </section>
    </main>
  );
}
