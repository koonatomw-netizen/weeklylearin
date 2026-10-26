import type { CSSProperties, ReactNode } from "react";
import { Radio } from "lucide-react";
import type { ColorToken, SlideDoc, SlideElement, WidgetKind } from "../shared/slideDoc";
import { WindowDots } from "../ui";

/**
 * Renders a JSON slide onto the fixed 1600×900 canvas (place it inside <SlideStage>).
 * Text is always rendered as React text nodes — the document can never inject markup.
 * The same component is used for library thumbnails, the editor and Presenter Mode.
 */

export const WIDGET_LABELS: Record<WidgetKind, { en: string; hint: string }> = {
  "join": { en: "Join panel", hint: "Room code, QR code and join link" },
  "live-stats": { en: "Live stats", hint: "Participants, submissions and activity status" },
  "challenge": { en: "Challenge", hint: "This session's prompt challenge" },
  "battle": { en: "Prompt Battle", hint: "Active battle, votes and presenter actions" },
  "leaderboard": { en: "Leaderboard", hint: "Champion and final rankings" },
  "feedback-status": { en: "Feedback status", hint: "Completion only — never individual answers" },
};

export function colorVar(token: ColorToken | undefined, fallback = "var(--text)"): string {
  if (!token) return fallback;
  if (["context", "goal", "audience", "constraints", "format"].includes(token)) return `var(--c-${token})`;
  return `var(--${token})`;
}

const frame = (element: SlideElement): CSSProperties => ({ left: element.x, top: element.y, width: element.w, height: element.h });

export function SlideRenderer({ doc, step = "all", renderWidget, selectedId }: {
  doc: SlideDoc;
  /** Current reveal step; "all" shows every element (library, editor). */
  step?: number | "all";
  /** Live widget renderer (Presenter Mode). Without it a labelled placeholder is drawn. */
  renderWidget?: (kind: WidgetKind, element: SlideElement) => ReactNode;
  selectedId?: string | null;
}) {
  const background = "token" in doc.background
    ? (doc.background.token === "accent-soft" ? "var(--accent-soft)" : `var(--${doc.background.token})`)
    : "var(--bg)";
  return <div className="sr" style={{ background }}>
    {"assetId" in doc.background && <img className="sr-bg" src={`/api/assets/${encodeURIComponent(doc.background.assetId)}`} alt="" />}
    {doc.elements.map((element) => {
      const hidden = step !== "all" && (element.step ?? 0) > step;
      return <div key={element.id} data-element-id={element.id}
        className={`sr-el sr-${element.type}${hidden ? " is-hidden" : ""}${selectedId === element.id ? " is-selected" : ""}`}
        style={frame(element)}>
        <ElementBody element={element} renderWidget={renderWidget} />
      </div>;
    })}
  </div>;
}

function ElementBody({ element, renderWidget }: { element: SlideElement; renderWidget?: (kind: WidgetKind, element: SlideElement) => ReactNode }) {
  switch (element.type) {
    case "text":
      return <div className="sr-text-box" style={{ justifyContent: element.valign === "middle" ? "center" : element.valign === "bottom" ? "flex-end" : "flex-start", color: colorVar(element.color) }}>
        {element.paragraphs.map((paragraph, index) => <p key={index}
          className={`sr-p${paragraph.bullet ? " is-bullet" : ""}`}
          style={{ fontSize: paragraph.size, fontFamily: paragraph.font === "mono" ? "var(--mono)" : "var(--sans)", textAlign: paragraph.align ?? "left" }}>
          {paragraph.runs.map((run, runIndex) => <span key={runIndex} style={{ fontWeight: run.bold ? 700 : undefined, fontStyle: run.italic ? "italic" : undefined, color: run.color ? colorVar(run.color) : undefined }}>{run.text}</span>)}
        </p>)}
      </div>;
    case "shape": {
      const stroke = element.stroke ? `${element.strokeWidth ?? 2}px solid ${colorVar(element.stroke)}` : undefined;
      if (element.shape === "line") return <div className="sr-line" style={{ borderTop: stroke ?? `2px solid var(--border)`, opacity: element.opacity }} />;
      return <div className="sr-shape" style={{
        background: element.fill ? colorVar(element.fill) : "transparent",
        border: stroke,
        borderRadius: element.shape === "ellipse" ? "50%" : element.shape === "rounded" ? 18 : 0,
        opacity: element.opacity,
      }} />;
    }
    case "window":
      return <div className="sr-window" style={{ borderColor: colorVar(element.border, "var(--accent)") }}>
        <div className="sr-window-head"><WindowDots /><span>{element.title}</span></div>
      </div>;
    case "image":
      return <img className="sr-image" src={`/api/assets/${encodeURIComponent(element.assetId)}`} alt={element.alt} style={{ objectFit: element.fit }} draggable={false} />;
    case "widget":
      return renderWidget ? <>{renderWidget(element.widget, element)}</> : <div className="sr-widget-placeholder">
        <span className="sr-widget-badge"><Radio size={18} />LIVE</span>
        <strong>{WIDGET_LABELS[element.widget].en}</strong>
        <span>{WIDGET_LABELS[element.widget].hint}</span>
      </div>;
  }
}
