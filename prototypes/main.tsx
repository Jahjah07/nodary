import { createRoot } from "react-dom/client";
import "@xyflow/react/dist/style.css";
import "./style.css";

const prototypes = import.meta.glob<{ default: React.ComponentType }>("./sp-*/view.tsx");
const id = new URLSearchParams(location.search).get("sp");
const load = prototypes[`./${id}/view.tsx`];
const root = createRoot(document.getElementById("root")!);

if (load) {
  void load().then(({ default: Prototype }) => root.render(<Prototype />));
} else {
  root.render(<h1>Nodary technical prototypes</h1>);
}
/// <reference types="vite/client" />

