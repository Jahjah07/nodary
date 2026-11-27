// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import Home from "../../src/app/page";
import { isSampleFixture } from "../../src/prototypes/sp-01/fixture";

afterEach(cleanup);

test("SP-01: the library links to the static editor with the fixture UUID", () => {
  render(<Home />);

  const href = screen.getByRole("link", { name: "Open sample diagram" }).getAttribute("href");
  const url = new URL(href ?? "/", "http://localhost");

  expect(url.pathname).toBe("/editor/");
  expect(url.searchParams.get("id")).toMatch(/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/);
  expect(isSampleFixture(url.searchParams.get("id"))).toBe(true);
});

test.each([null, "", "missing", "00000000-0000-4000-8000-000000000002"])(
  "SP-01: the sample resolver rejects %s",
  (id) => expect(isSampleFixture(id)).toBe(false),
);
