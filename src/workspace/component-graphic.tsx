import { createElement } from "react";
import { makeComponent, type ComponentType } from "../core/component-edits";
import { approximate, diagramFont, iconVectors, labelLayout, visualOf, type Measure } from "../core/visual";

let context: CanvasRenderingContext2D | null | undefined;
export const measureLabel: Measure = (text, size) => {
  if (typeof document === "undefined") return approximate(text, size);
  context ??= document.createElement("canvas").getContext("2d");
  if (!context) return approximate(text, size);
  context.font = `${size}px ${diagramFont}`;
  return context.measureText(text).width;
};

export function ComponentGraphic({ item, selected, tile }: {
  item: Parameters<typeof visualOf>[0]; selected?: boolean; tile?: boolean;
}) {
  const shape = visualOf(item);
  const { width, height } = item.size;
  const { style } = item;
  const { outline, decoration, icon, status, dash, bounds } = shape;
  const layout = labelLayout(item, measureLabel);
  const frame = "title" in item;
  const tileBox = icon ? `${icon.box.x - 3} ${icon.box.y - 3} 30 30` :
    `${bounds.x - 2} ${bounds.y - 2} ${bounds.width + 4} ${bounds.height + 4}`;
  const paint = { fill: style.fill, fillOpacity: "fillOpacity" in style ? style.fillOpacity : 1,
    stroke: style.stroke, strokeWidth: tile ? 1 : style.strokeWidth, strokeDasharray: tile && dash ? "3 2" : dash?.join(" "),
    vectorEffect: tile ? "non-scaling-stroke" : undefined,
    strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  return <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true"
    className={tile ? "component-preview" : frame ? "diagram-frame" : "diagram-node"}
    data-component={item.type} data-selected={selected} data-label-fits={layout.fits}
    viewBox={tile ? tileBox : `0 0 ${width} ${height}`}>
    {(!tile || !icon) && <>
      {outline.kind === "rect" && <rect {...paint} width={width} height={height} rx={outline.radius} />}
      {outline.kind === "ellipse" && <ellipse {...paint} cx={width / 2} cy={height / 2} rx={width / 2} ry={height / 2} />}
      {outline.kind === "path" && <path {...paint} d={outline.d} />}
      {decoration && <path {...paint} fill="none" d={decoration} />}
    </>}
    {icon && <g data-icon={icon.key} transform={`translate(${icon.box.x} ${icon.box.y})`} fill="none"
      color={style.text.color} stroke={style.text.color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      {iconVectors[icon.key].map(([tag, props], index) => createElement(tag as string, { ...(props as object), key: index }))}
    </g>}
    {tile && outline.kind === "none" && <text x={width / 2} y={height / 2} dominantBaseline="central"
      fontFamily={diagramFont} fontSize={height * .65} textAnchor="middle" fill={style.text.color}>T</text>}
    {!tile && layout.lines.length > 0 && <text className={frame ? "frame-title" : "diagram-label"} fill={style.text.color}
      textAnchor={layout.anchor} fontFamily={diagramFont} fontSize={style.text.fontSize} dominantBaseline="central" xmlSpace="preserve">
      {layout.lines.map((line, i) => <tspan key={i} x={layout.x} y={layout.y + i * layout.lineHeight}>{line}</tspan>)}
    </text>}
    {!tile && status && <g transform={`translate(${status.box.x} ${status.box.y})`}>
      <rect width={status.box.width} height={status.box.height} rx={4} fill="#FFFFFF" />
      <circle cx={11.5} cy={status.box.height / 2} r={3.5} fill={status.marker} />
      <text x={20} y={status.box.height / 2} dominantBaseline="central" fontFamily={diagramFont} fontSize={11} fill={status.text}>{status.label}</text>
    </g>}
    {!tile && !layout.fits && <text fontFamily={diagramFont} fontSize={11} x={0} y={height + 13} fill="#9F1239">Label exceeds shape</text>}
  </svg>;
}

export function ComponentPreview({ type }: { type: ComponentType }) {
  return <ComponentGraphic item={makeComponent(type, "", { x: 0, y: 0 })} tile />;
}
