"use client";

import { useSyncExternalStore, type MouseEvent } from "react";

const navigationEvent = "nodary:navigation";
const locationSnapshot = () => window.location.pathname + window.location.search;
function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(navigationEvent, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(navigationEvent, onChange);
  };
}

export function useWorkspaceLocation(initial: "/" | "/editor/") {
  return useSyncExternalStore(subscribe, locationSnapshot, () => initial);
}

export function navigate(href: string) {
  if (href === locationSnapshot()) return;
  // Both destinations have static entry pages. Keep the active workspace and its in-memory repository mounted.
  window.history.pushState(null, "", href);
  window.dispatchEvent(new Event(navigationEvent));
}

export function follow(event: MouseEvent<HTMLAnchorElement>) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  navigate(event.currentTarget.getAttribute("href")!);
}

export const editorHref = (id: string) => `/editor/?id=${encodeURIComponent(id)}`;
