import { useEffect, useState, type ReactNode } from "react";
import {
  AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignStartHorizontal, AlignStartVertical,
  ArrowDownToLine, ArrowUpToLine, Bold, ChevronDown, ChevronUp, Copy, Italic, List, Lock, LockOpen, Pencil, Trash2,
} from "lucide-react";
import { COLOR_TOKENS, FONT_SIZES, WIDGET_KINDS, type ColorToken, type FontSize, type Paragraph, type SlideDoc, type SlideElement } from "../shared/slideDoc";
import type { Language } from "../shared/types";
import { WIDGET_LABELS, colorVar } from "../slides/SlideRenderer";
import { t } from "../ui";
import { alignElements, deleteElements, duplicateElements, reorderLayer, styleAllParagraphs, styleAllRuns, updateElement, updateElements } from "./editorOps";

type Apply = (next: SlideDoc | ((current: SlideDoc) => SlideDoc)) => void;

export function Properties({ language, doc, title, selection, readOnly, onTitle, onSelect, onChange, onEditText }: {
  language: Language; doc: SlideDoc; title: string; selection: string[]; readOnly: boolean;
  onTitle: (title: string) => void; onSelect: (ids: string[]) => void; onChange: Apply; onEditText: (id: string) => void;
}) {
  const selected = doc.elements.filter((element) => selection.includes(element.id));
  const single = selected.length === 1 ? selected[0] : null;
  const patch = (id: string, value: Partial<SlideElement>) => onChange((current) => updateElement(current, id, value));

  return <aside className="builder-props" aria-label={t(language, "Properties", "คุณสมบัติ")}>
    {!selected.length && <Section title={t(language, "Slide", "สไลด์")}>
      <Field label={t(language, "title", "ชื่อสไลด์")}><CommitInput value={title} maxLength={120} disabled={readOnly} onCommit={onTitle} /></Field>
      <Field label={t(language, "background", "พื้นหลัง")}>
        <select className="input" disabled={readOnly} value={"token" in doc.background ? doc.background.token : "bg"} onChange={(event) => onChange((current) => ({ ...current, background: { token: event.target.value as "bg" } }))}>
          <option value="bg">{t(language, "Charcoal", "ถ่าน")}</option><option value="surface">{t(language, "Surface", "พื้นผิว")}</option><option value="accent-soft">{t(language, "Warm accent", "ส้มอ่อน")}</option>
        </select>
      </Field>
      <Field label={t(language, "presenter notes (not shown to participants)", "บันทึกผู้สอน (ผู้เข้าร่วมไม่เห็น)")}>
        <CommitInput multiline value={doc.notes ?? ""} maxLength={4000} disabled={readOnly} onCommit={(notes) => onChange((current) => {
          const { notes: _previous, ...rest } = current;
          return notes ? { ...rest, notes } : rest;
        })} />
      </Field>
      <p className="hint">{t(language, "Select an element on the canvas to edit it. Ctrl+A selects everything.", "เลือกชิ้นงานบนสไลด์เพื่อแก้ไข Ctrl+A เลือกทั้งหมด")}</p>
    </Section>}

    {single && <ElementProps element={single} language={language} readOnly={readOnly} patch={(value) => patch(single.id, value)} onChange={onChange} onSelect={onSelect} onEditText={onEditText} />}

    {selected.length > 1 && <Section title={t(language, `${selected.length} elements`, `${selected.length} ชิ้น`)}>
      <AlignRow language={language} disabled={readOnly} onAlign={(mode) => onChange((current) => alignElements(current, selection, mode))} />
      <Field label={t(language, "appears at step", "แสดงที่ขั้น")}>
        <StepSelect value={selected.every((element) => (element.step ?? 0) === (selected[0].step ?? 0)) ? selected[0].step ?? 0 : -1} disabled={readOnly}
          onChange={(step) => onChange((current) => updateElements(current, selection, (element) => withStep(element, step)))} language={language} />
      </Field>
      <div className="button-row button-row--tight">
        <button className="btn" disabled={readOnly} onClick={() => { const result = duplicateElements(doc, selection); onChange(result.doc); onSelect(result.newIds); }}><Copy size={14} />{t(language, "Duplicate", "ทำสำเนา")}</button>
        <button className="btn btn--danger" disabled={readOnly} onClick={() => { onChange((current) => deleteElements(current, selected.filter((e) => !e.locked).map((e) => e.id))); onSelect([]); }}><Trash2 size={14} />{t(language, "Delete", "ลบ")}</button>
      </div>
    </Section>}

    <Section title={t(language, "Layers", "เลเยอร์")} hint={t(language, "top first", "บนสุดก่อน")}>
      <ol className="layers">
        {[...doc.elements].reverse().map((element) => <li key={element.id} className={selection.includes(element.id) ? "is-on" : ""}>
          <button className="layer-name" onClick={(event) => onSelect(event.shiftKey ? (selection.includes(element.id) ? selection.filter((id) => id !== element.id) : [...selection, element.id]) : [element.id])}>
            <span className="mono-dim">{element.type}</span>{layerLabel(element)}{element.step ? <span className="mini-tag">s{element.step}</span> : null}
          </button>
          <button className="icon-button" disabled={readOnly} onClick={() => patch(element.id, { locked: element.locked ? undefined : true })} aria-label={element.locked ? t(language, "Unlock", "ปลดล็อก") : t(language, "Lock", "ล็อก")} title={element.locked ? t(language, "Unlock", "ปลดล็อก") : t(language, "Lock", "ล็อก")}>
            {element.locked ? <Lock size={13} /> : <LockOpen size={13} />}
          </button>
        </li>)}
      </ol>
      {!doc.elements.length && <p className="mono-dim">{t(language, "> empty slide — use the toolbar to add elements", "> สไลด์ว่าง ใช้แถบเครื่องมือเพื่อเพิ่ม")}</p>}
    </Section>
  </aside>;
}

function ElementProps({ element, language, readOnly, patch, onChange, onSelect, onEditText }: {
  element: SlideElement; language: Language; readOnly: boolean; patch: (value: Partial<SlideElement>) => void; onChange: Apply; onSelect: (ids: string[]) => void; onEditText: (id: string) => void;
}) {
  const disabled = readOnly || Boolean(element.locked);
  return <>
    <Section title={`${element.type}${element.locked ? " · locked" : ""}`}>
      <div className="geometry">
        {(["x", "y", "w", "h"] as const).map((key) => <label key={key}><span className="field-label">{key}</span>
          <CommitInput number value={String(element[key])} disabled={disabled} onCommit={(value) => { const n = Number(value); if (Number.isFinite(n)) patch({ [key]: Math.round(n) }); }} /></label>)}
      </div>
      <AlignRow language={language} disabled={disabled} onAlign={(mode) => onChange((current) => alignElements(current, [element.id], mode))} />
      <Field label={t(language, "appears at step", "แสดงที่ขั้น")}><StepSelect value={element.step ?? 0} disabled={readOnly} language={language} onChange={(step) => onChange((current) => updateElements(current, [element.id], (e) => withStep(e, step)))} /></Field>
      <div className="button-row button-row--tight">
        <IconButton label={t(language, "Bring to front", "ไว้บนสุด")} disabled={readOnly} onClick={() => onChange((c) => reorderLayer(c, element.id, "front"))}><ArrowUpToLine size={14} /></IconButton>
        <IconButton label={t(language, "Forward", "เลื่อนขึ้น")} disabled={readOnly} onClick={() => onChange((c) => reorderLayer(c, element.id, "forward"))}><ChevronUp size={14} /></IconButton>
        <IconButton label={t(language, "Backward", "เลื่อนลง")} disabled={readOnly} onClick={() => onChange((c) => reorderLayer(c, element.id, "backward"))}><ChevronDown size={14} /></IconButton>
        <IconButton label={t(language, "Send to back", "ไว้ล่างสุด")} disabled={readOnly} onClick={() => onChange((c) => reorderLayer(c, element.id, "back"))}><ArrowDownToLine size={14} /></IconButton>
        <IconButton label={element.locked ? t(language, "Unlock", "ปลดล็อก") : t(language, "Lock", "ล็อก")} disabled={readOnly} onClick={() => patch({ locked: element.locked ? undefined : true })}>{element.locked ? <Lock size={14} /> : <LockOpen size={14} />}</IconButton>
        <IconButton label={t(language, "Duplicate", "ทำสำเนา")} disabled={readOnly} onClick={() => onChange((c) => { const result = duplicateElements(c, [element.id]); onSelect(result.newIds); return result.doc; })}><Copy size={14} /></IconButton>
        <IconButton label={t(language, "Delete", "ลบ")} disabled={disabled} onClick={() => { onChange((c) => deleteElements(c, [element.id])); onSelect([]); }}><Trash2 size={14} /></IconButton>
      </div>
    </Section>
    {element.type === "text" && <TextProps element={element} language={language} disabled={disabled} patch={patch} onEditText={onEditText} />}
    {element.type === "shape" && <Section title={t(language, "Shape", "รูปทรง")}>
      <Field label={t(language, "kind", "ชนิด")}><select className="input" disabled={disabled} value={element.shape} onChange={(event) => patch({ shape: event.target.value as "rect" })}>
        <option value="rect">{t(language, "Rectangle", "สี่เหลี่ยม")}</option><option value="rounded">{t(language, "Rounded", "มุมมน")}</option><option value="ellipse">{t(language, "Ellipse", "วงรี")}</option><option value="line">{t(language, "Line", "เส้น")}</option>
      </select></Field>
      {element.shape !== "line" && <Field label={t(language, "fill", "สีพื้น")}><Swatches value={element.fill} allowNone disabled={disabled} onChange={(fill) => patch({ fill })} /></Field>}
      <Field label={t(language, "stroke", "สีเส้น")}><Swatches value={element.stroke} allowNone={element.shape !== "line"} disabled={disabled} onChange={(stroke) => patch({ stroke })} /></Field>
      <div className="geometry geometry--2">
        <label><span className="field-label">{t(language, "stroke width", "ความหนา")}</span><select className="input" disabled={disabled} value={element.strokeWidth ?? 2} onChange={(event) => patch({ strokeWidth: Number(event.target.value) as 1 | 2 | 4 })}><option value={1}>1</option><option value={2}>2</option><option value={4}>4</option></select></label>
        <label><span className="field-label">{t(language, "opacity", "ความทึบ")}</span><select className="input" disabled={disabled} value={element.opacity ?? 1} onChange={(event) => { const value = Number(event.target.value); patch({ opacity: value >= 1 ? undefined : value }); }}>
          {[1, 0.8, 0.6, 0.4, 0.2].map((value) => <option key={value} value={value}>{Math.round(value * 100)}%</option>)}
        </select></label>
      </div>
    </Section>}
    {element.type === "window" && <Section title={t(language, "Window", "หน้าต่าง")}>
      <Field label={t(language, "title", "ชื่อหน้าต่าง")}><CommitInput value={element.title} maxLength={80} disabled={disabled} onCommit={(title) => patch({ title })} /></Field>
      <Field label={t(language, "border", "ขอบ")}><Swatches value={element.border} allowNone disabled={disabled} onChange={(border) => patch({ border })} /></Field>
    </Section>}
    {element.type === "widget" && <Section title={t(language, "Live widget", "ส่วนสด")}>
      <Field label={t(language, "shows", "แสดง")}><select className="input" disabled={disabled} value={element.widget} onChange={(event) => patch({ widget: event.target.value as typeof element.widget })}>
        {WIDGET_KINDS.map((kind) => <option key={kind} value={kind}>{WIDGET_LABELS[kind].en}</option>)}
      </select></Field>
      <p className="hint">{WIDGET_LABELS[element.widget].hint}. {t(language, "Uses live session data in Presenter Mode.", "ใช้ข้อมูลจริงในโหมดผู้สอน")}</p>
    </Section>}
    {element.type === "image" && <Section title={t(language, "Image", "รูปภาพ")}>
      <Field label={t(language, "fit", "การจัดภาพ")}><select className="input" disabled={disabled} value={element.fit} onChange={(event) => patch({ fit: event.target.value as "cover" })}><option value="cover">{t(language, "Fill (crop)", "เต็มกรอบ (ครอบตัด)")}</option><option value="contain">{t(language, "Fit (no crop)", "พอดีกรอบ")}</option></select></Field>
      <Field label={t(language, "alt text (for screen readers)", "คำอธิบายภาพ")}><CommitInput value={element.alt} maxLength={200} disabled={disabled} onCommit={(alt) => patch({ alt })} /></Field>
    </Section>}
  </>;
}

function TextProps({ element, language, disabled, patch, onEditText }: { element: Extract<SlideElement, { type: "text" }>; language: Language; disabled: boolean; patch: (value: Partial<SlideElement>) => void; onEditText: (id: string) => void }) {
  const paragraphs = element.paragraphs;
  const runs = paragraphs.flatMap((p) => p.runs);
  const sizes = new Set(paragraphs.map((p) => p.size));
  const fonts = new Set(paragraphs.map((p) => p.font));
  const allBold = runs.length > 0 && runs.every((run) => run.bold);
  const allItalic = runs.length > 0 && runs.every((run) => run.italic);
  const align = paragraphs.every((p) => (p.align ?? "left") === (paragraphs[0].align ?? "left")) ? paragraphs[0].align ?? "left" : null;
  const setParagraphs = (next: Paragraph[]) => patch({ paragraphs: next });
  const shift = (direction: 1 | -1) => setParagraphs(paragraphs.map((p) => {
    const index = FONT_SIZES.indexOf(p.size);
    return { ...p, size: FONT_SIZES[Math.min(FONT_SIZES.length - 1, Math.max(0, index + direction))] };
  }));
  return <Section title={t(language, "Text", "ข้อความ")}>
    <button className="btn" disabled={disabled} onClick={() => onEditText(element.id)}><Pencil size={14} />{t(language, "Edit text", "แก้ข้อความ")}</button>
    <div className="geometry geometry--2">
      <label><span className="field-label">{t(language, "font", "ฟอนต์")}</span><select className="input" disabled={disabled} value={fonts.size === 1 ? [...fonts][0] : ""} onChange={(event) => setParagraphs(styleAllParagraphs(paragraphs, { font: event.target.value as "sans" }))}>
        {fonts.size > 1 && <option value="">{t(language, "mixed", "ผสม")}</option>}<option value="sans">Sans (Thai)</option><option value="mono">Mono</option>
      </select></label>
      <label><span className="field-label">{t(language, "size", "ขนาด")}</span><select className="input" disabled={disabled} value={sizes.size === 1 ? [...sizes][0] : ""} onChange={(event) => setParagraphs(styleAllParagraphs(paragraphs, { size: Number(event.target.value) as FontSize }))}>
        {sizes.size > 1 && <option value="">{t(language, "mixed", "ผสม")}</option>}{FONT_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
      </select></label>
    </div>
    <div className="button-row button-row--tight">
      <IconButton label={t(language, "Smaller (keeps hierarchy)", "เล็กลง")} disabled={disabled} onClick={() => shift(-1)}><span className="mono">A−</span></IconButton>
      <IconButton label={t(language, "Larger (keeps hierarchy)", "ใหญ่ขึ้น")} disabled={disabled} onClick={() => shift(1)}><span className="mono">A+</span></IconButton>
      <IconButton label={t(language, "Bold", "ตัวหนา")} pressed={allBold} disabled={disabled} onClick={() => setParagraphs(styleAllRuns(paragraphs, { bold: !allBold }))}><Bold size={14} /></IconButton>
      <IconButton label={t(language, "Italic", "ตัวเอียง")} pressed={allItalic} disabled={disabled} onClick={() => setParagraphs(styleAllRuns(paragraphs, { italic: !allItalic }))}><Italic size={14} /></IconButton>
      <IconButton label={t(language, "Bullets", "หัวข้อย่อย")} pressed={paragraphs.every((p) => p.bullet)} disabled={disabled} onClick={() => setParagraphs(styleAllParagraphs(paragraphs, { bullet: !paragraphs.every((p) => p.bullet) }))}><List size={14} /></IconButton>
    </div>
    <div className="segmented" role="group" aria-label={t(language, "Alignment", "การจัดแนว")}>
      {(["left", "center", "right"] as const).map((value) => <button key={value} disabled={disabled} className={align === value ? "is-on" : ""} aria-pressed={align === value} onClick={() => setParagraphs(styleAllParagraphs(paragraphs, { align: value }))}>{value}</button>)}
    </div>
    <div className="segmented" role="group" aria-label={t(language, "Vertical alignment", "แนวตั้ง")}>
      {(["top", "middle", "bottom"] as const).map((value) => <button key={value} disabled={disabled} className={(element.valign ?? "top") === value ? "is-on" : ""} aria-pressed={(element.valign ?? "top") === value} onClick={() => patch({ valign: value === "top" ? undefined : value })}>{value}</button>)}
    </div>
    <Field label={t(language, "color (all text)", "สีข้อความทั้งหมด")}>
      <Swatches value={element.color} disabled={disabled} onChange={(color) => patch({ color, paragraphs: styleAllRuns(paragraphs, { color: null }) })} />
    </Field>
    {runs.some((run) => run.color) && <p className="hint">{t(language, "Some words have their own colour. Choosing a colour above resets them.", "บางคำมีสีของตัวเอง การเลือกสีด้านบนจะรีเซ็ตสีเหล่านั้น")}</p>}
  </Section>;
}

// ---------------------------------------------------------------- controls

function withStep(element: SlideElement, step: number): SlideElement {
  const next = { ...element };
  if (step > 0) next.step = step; else delete next.step;
  return next;
}

function layerLabel(element: SlideElement): string {
  if (element.type === "text") return element.paragraphs.map((p) => p.runs.map((r) => r.text).join("")).join(" ").slice(0, 28) || "(empty)";
  if (element.type === "window") return element.title || "window";
  if (element.type === "widget") return WIDGET_LABELS[element.widget].en;
  if (element.type === "shape") return element.shape;
  return element.alt || "image";
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return <section className="props-section"><header><b>{title}</b>{hint && <span className="mono-dim">{hint}</span>}</header>{children}</section>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="props-field"><span className="field-label">{label}</span>{children}</label>;
}

function IconButton({ label, children, onClick, disabled, pressed }: { label: string; children: ReactNode; onClick: () => void; disabled?: boolean; pressed?: boolean }) {
  return <button className={`icon-button${pressed ? " is-pressed" : ""}`} aria-label={label} title={label} aria-pressed={pressed} disabled={disabled} onClick={onClick}>{children}</button>;
}

function AlignRow({ language, disabled, onAlign }: { language: Language; disabled: boolean; onAlign: (mode: "left" | "center" | "right" | "top" | "middle" | "bottom") => void }) {
  return <div className="button-row button-row--tight" aria-label={t(language, "Align", "จัดแนว")}>
    <IconButton label={t(language, "Align left", "ชิดซ้าย")} disabled={disabled} onClick={() => onAlign("left")}><AlignStartVertical size={14} /></IconButton>
    <IconButton label={t(language, "Align centre", "กึ่งกลางแนวนอน")} disabled={disabled} onClick={() => onAlign("center")}><AlignCenterVertical size={14} /></IconButton>
    <IconButton label={t(language, "Align right", "ชิดขวา")} disabled={disabled} onClick={() => onAlign("right")}><AlignEndVertical size={14} /></IconButton>
    <IconButton label={t(language, "Align top", "ชิดบน")} disabled={disabled} onClick={() => onAlign("top")}><AlignStartHorizontal size={14} /></IconButton>
    <IconButton label={t(language, "Align middle", "กึ่งกลางแนวตั้ง")} disabled={disabled} onClick={() => onAlign("middle")}><AlignCenterHorizontal size={14} /></IconButton>
    <IconButton label={t(language, "Align bottom", "ชิดล่าง")} disabled={disabled} onClick={() => onAlign("bottom")}><AlignEndHorizontal size={14} /></IconButton>
  </div>;
}

function StepSelect({ value, onChange, disabled, language }: { value: number; onChange: (step: number) => void; disabled: boolean; language: Language }) {
  return <select className="input" disabled={disabled} value={value} onChange={(event) => onChange(Number(event.target.value))}>
    {value < 0 && <option value={-1}>{t(language, "mixed", "ผสม")}</option>}
    <option value={0}>{t(language, "always visible", "แสดงตลอด")}</option>
    {Array.from({ length: 10 }, (_, index) => <option key={index + 1} value={index + 1}>{t(language, `step ${index + 1}`, `ขั้น ${index + 1}`)}</option>)}
  </select>;
}

function Swatches({ value, onChange, allowNone, disabled }: { value?: ColorToken; onChange: (value: ColorToken | undefined) => void; allowNone?: boolean; disabled?: boolean }) {
  return <div className="swatches" role="radiogroup">
    {allowNone && <button className={`swatch swatch--none${!value ? " is-on" : ""}`} disabled={disabled} role="radio" aria-checked={!value} aria-label="none" title="none" onClick={() => onChange(undefined)} />}
    {COLOR_TOKENS.map((token) => <button key={token} className={`swatch${value === token ? " is-on" : ""}`} disabled={disabled} role="radio" aria-checked={value === token} aria-label={token} title={token}
      style={{ background: colorVar(token) }} onClick={() => onChange(token)} />)}
  </div>;
}

/** Text input that commits on blur or Enter, so typing does not flood the undo history. */
function CommitInput({ value, onCommit, disabled, maxLength, multiline, number }: { value: string; onCommit: (value: string) => void; disabled?: boolean; maxLength?: number; multiline?: boolean; number?: boolean }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => { if (draft !== value) onCommit(number ? draft : draft.trim() === draft ? draft : draft.trim()); };
  return multiline
    ? <textarea className="input" rows={4} value={draft} maxLength={maxLength} disabled={disabled} onChange={(event) => setDraft(event.target.value)} onBlur={commit} />
    : <input className="input" value={draft} maxLength={maxLength} disabled={disabled} inputMode={number ? "numeric" : undefined}
      onChange={(event) => setDraft(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === "Enter") (event.target as HTMLInputElement).blur(); if (event.key === "Escape") { setDraft(value); (event.target as HTMLInputElement).blur(); } }} />;
}
