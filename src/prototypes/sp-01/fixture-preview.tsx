"use client";

import { ReactFlow, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const nodes: Node[] = [{
  id: "sample",
  position: { x: 48, y: 48 },
  data: { label: "Sample service" },
}];

export default function FixturePreview() {
  return (
    <section aria-labelledby="sample-title" className="space-y-3">
      <h2 id="sample-title" className="text-xl font-medium">Read-only sample diagram</h2>
      <div className="h-64 rounded-lg border border-slate-200 bg-white">
        <ReactFlow
          nodes={nodes}
          edges={[]}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          deleteKeyCode={null}
        />
      </div>
    </section>
  );
}
