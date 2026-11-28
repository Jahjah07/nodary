import flowchart from "../../tests/fixtures/templates/DGS-06_Template_Basic_Flowchart_v1.json";
import architecture from "../../tests/fixtures/templates/DGS-06_Template_IT_Architecture_v1.json";

export const starterTemplates = {
  flowchart: { name: "Basic process flowchart", source: flowchart, icon: "flow.decision" },
  architecture: { name: "IT architecture", source: architecture, icon: "arch.application" },
} as const;
export type StartPoint = "blank" | keyof typeof starterTemplates;
