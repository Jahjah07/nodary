"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { isSampleFixture } from "./fixture";

const FixturePreview = dynamic(() => import("./fixture-preview"), {
  ssr: false,
  loading: () => <p role="status">Loading preview…</p>,
});

export function FixtureEditor() {
  const params = useSearchParams();

  if (!isSampleFixture(params.get("id"))) {
    return <p role="status">Sample diagram not found.</p>;
  }

  return <FixturePreview />;
}
