import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Copy, FilePlus2, LoaderCircle, Plus, Save, Send, Trash2 } from "lucide-react";
import { getTemplate, publishTemplate, saveTemplateDraft } from "./api";
import type { Language, Phase, Slide, TemplateRecord } from "./shared/types";
import { ErrorNotice, SuccessNotice, t } from "./ui";

const phaseOptions: Phase[] = ["join", "attempt1", "teach", "attempt2", "discussion", "wrap"];
const phaseText: Record<Language, Record<Phase, string>> = {
  en: { join: "Join", attempt1: "First prompt", teach: "Learn", attempt2: "Revision", discussion: "Discuss", wrap: "Wrap up" },
  th: { join: "เข้าห้อง", attempt1: "พรอมป์รอบแรก", teach: "เรียนรู้", attempt2: "ปรับพรอมป์", discussion: "แลกเปลี่ยน", wrap: "สรุป" },
};

export default function SlideEditor({ token, language }: { token: string; language: Language }) {
  const [template, setTemplate] = useState<TemplateRecord | null>(null);
  const [draft, setDraft] = useState<Slide[]>([]);
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    void getTemplate(token).then((record) => {
      if (!active) return;
      setTemplate(record);
      setDraft(record.draft);
    }).catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "Could not load this slide template."); });
    return () => { active = false; };
  }, [token]);

  const current = draft[selected];
  const dirty = Boolean(template && JSON.stringify(draft) !== JSON.stringify(template.draft));

  function replaceCurrent(change: Partial<Slide>) {
    setDraft((slides) => slides.map((slide, index) => index === selected ? { ...slide, ...change } : slide));
    setNotice("");
  }

  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= draft.length) return;
    const next = [...draft];
    [next[index], next[target]] = [next[target], next[index]];
    setDraft(next);
    setSelected(target);
    setNotice("");
  }

  function addSlide() {
    const slide: Slide = {
      id: `slide-${crypto.randomUUID().slice(0, 8)}`,
      phase: "teach",
      minutes: 2,
      titleEn: "New teaching point",
      titleTh: "ประเด็นเรียนรู้ใหม่",
      subtitleEn: "Add a short explanation.",
      subtitleTh: "เพิ่มคำอธิบายสั้นๆ",
      bodyEn: ["One clear idea."],
      bodyTh: ["หนึ่งประเด็นที่ชัดเจน"],
      speakerNotes: "",
    };
    const next = [...draft.slice(0, selected + 1), slide, ...draft.slice(selected + 1)];
    setDraft(next);
    setSelected(selected + 1);
    setNotice("");
  }

  function duplicateSlide(index: number) {
    const source = draft[index];
    const copy = { ...source, id: `${source.id.slice(0, 25)}-${crypto.randomUUID().slice(0, 4)}` };
    setDraft([...draft.slice(0, index + 1), copy, ...draft.slice(index + 1)]);
    setSelected(index + 1);
    setNotice("");
  }

  function deleteSlide(index: number) {
    const source = draft[index];
    if (draft.length <= 6) {
      setError(t(language, "Keep at least six slides in the workshop.", "เวิร์กช็อปต้องมีอย่างน้อย 6 สไลด์"));
      return;
    }
    if (draft.filter((slide) => slide.phase === source.phase).length <= 1) {
      setError(t(language, "Keep one slide for each workshop phase.", "ต้องมีสไลด์อย่างน้อยหนึ่งหน้าสำหรับแต่ละช่วง"));
      return;
    }
    setDraft(draft.filter((_, itemIndex) => itemIndex !== index));
    setSelected(Math.max(0, Math.min(index, draft.length - 2)));
    setError("");
    setNotice("");
  }

  async function saveDraft() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const saved = await saveTemplateDraft(token, draft);
      setTemplate(saved);
      setDraft(saved.draft);
      setNotice(t(language, `Draft saved · version ${saved.draftVersion}`, `บันทึกฉบับร่าง · เวอร์ชัน ${saved.draftVersion}`));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save this draft.");
    } finally { setBusy(false); }
  }

  async function publish() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      let latest = template;
      if (dirty || !latest) latest = await saveTemplateDraft(token, draft);
      const published = await publishTemplate(token);
      setTemplate(published);
      setDraft(published.draft);
      setNotice(t(language, `Published version ${published.publishedVersion}. New rooms will use this deck.`, `เผยแพร่เวอร์ชัน ${published.publishedVersion} แล้ว ห้องใหม่จะใช้สไลด์ชุดนี้`));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not publish this deck.");
    } finally { setBusy(false); }
  }

  if (!template || !current) return <div className="editor-loading"><LoaderCircle className="spin" />{error || t(language, "Loading slide templates…", "กำลังโหลดเทมเพลตสไลด์…")}</div>;

  return <section className="slide-editor">
    <header className="editor-header">
      <div><p className="eyebrow">{t(language, "Workshop content", "เนื้อหาเวิร์กช็อป")}</p><h1>{t(language, "Edit the slide template", "แก้ไขเทมเพลตสไลด์")}</h1><p>{t(language, "Draft changes apply to new rooms only after you publish.", "ฉบับร่างจะใช้กับห้องใหม่หลังจากเผยแพร่แล้ว")}</p></div>
      <div className="editor-version"><span>{t(language, "Published", "เผยแพร่แล้ว")} v{template.publishedVersion}</span><span>{t(language, "Draft", "ฉบับร่าง")} v{template.draftVersion}{dirty ? " · *" : ""}</span></div>
    </header>
    {error && <ErrorNotice>{error}</ErrorNotice>}
    {notice && <SuccessNotice>{notice}</SuccessNotice>}
    <div className="editor-layout">
      <aside className="slide-list-panel">
        <div className="slide-list-header"><strong>{t(language, "Slides", "สไลด์")} <span>{draft.length}</span></strong><button className="icon-button" onClick={addSlide} title={t(language, "Add slide", "เพิ่มสไลด์")}><FilePlus2 size={16} /></button></div>
        <ol className="slide-list">{draft.map((slide, index) => <li key={slide.id} className={selected === index ? "is-active" : ""}>
          <button className="slide-select" onClick={() => setSelected(index)}><small>{String(index + 1).padStart(2, "0")}</small><span>{language === "th" ? slide.titleTh : slide.titleEn}<em>{phaseText[language][slide.phase]}</em></span></button>
          <div className="slide-list-actions">
            <button className="mini-icon" onClick={() => move(index, -1)} disabled={index === 0} aria-label={t(language, "Move slide up", "เลื่อนสไลด์ขึ้น")}><ArrowUp size={13} /></button>
            <button className="mini-icon" onClick={() => move(index, 1)} disabled={index === draft.length - 1} aria-label={t(language, "Move slide down", "เลื่อนสไลด์ลง")}><ArrowDown size={13} /></button>
            <button className="mini-icon" onClick={() => duplicateSlide(index)} aria-label={t(language, "Duplicate slide", "ทำสำเนาสไลด์")}><Copy size={13} /></button>
            <button className="mini-icon mini-icon--danger" onClick={() => deleteSlide(index)} aria-label={t(language, "Delete slide", "ลบสไลด์")}><Trash2 size={13} /></button>
          </div>
        </li>)}</ol>
        <button className="add-slide-button" onClick={addSlide}><Plus size={15} />{t(language, "Add a teaching slide", "เพิ่มสไลด์เรียนรู้")}</button>
      </aside>

      <div className="slide-fields">
        <div className="slide-fields-bar"><span>{t(language, `Slide ${selected + 1}`, `สไลด์ ${selected + 1}`)}</span><span>{t(language, "English + Thai", "ภาษาอังกฤษ + ไทย")}</span></div>
        <div className="field-pair">
          <label><span>{t(language, "Phase", "ช่วง")}</span><select value={current.phase} onChange={(event) => replaceCurrent({ phase: event.target.value as Phase })}>{phaseOptions.map((phase) => <option value={phase} key={phase}>{phaseText[language][phase]}</option>)}</select></label>
          <label><span>{t(language, "Minutes", "นาที")}</span><input type="number" min={1} max={30} value={current.minutes} onChange={(event) => replaceCurrent({ minutes: Number(event.target.value) })} /></label>
        </div>
        <div className="field-pair">
          <label><span>Title · English</span><input value={current.titleEn} maxLength={160} onChange={(event) => replaceCurrent({ titleEn: event.target.value })} /></label>
          <label><span>หัวข้อ · ภาษาไทย</span><input value={current.titleTh} maxLength={160} onChange={(event) => replaceCurrent({ titleTh: event.target.value })} /></label>
        </div>
        <div className="field-pair">
          <label><span>Subtitle · English</span><input value={current.subtitleEn} maxLength={160} onChange={(event) => replaceCurrent({ subtitleEn: event.target.value })} /></label>
          <label><span>คำโปรย · ภาษาไทย</span><input value={current.subtitleTh} maxLength={160} onChange={(event) => replaceCurrent({ subtitleTh: event.target.value })} /></label>
        </div>
        <div className="field-pair field-pair--top">
          <label><span>Body · English <small>{t(language, "one point per line", "หนึ่งประเด็นต่อบรรทัด")}</small></span><textarea rows={5} value={current.bodyEn.join("\n")} onChange={(event) => replaceCurrent({ bodyEn: event.target.value.split("\n").slice(0, 8) })} /></label>
          <label><span>เนื้อหา · ภาษาไทย <small>{t(language, "หนึ่งประเด็นต่อบรรทัด", "one point per line")}</small></span><textarea rows={5} value={current.bodyTh.join("\n")} onChange={(event) => replaceCurrent({ bodyTh: event.target.value.split("\n").slice(0, 8) })} /></label>
        </div>
        {(current.phase === "attempt1" || current.phase === "attempt2") && <div className="field-pair">
          <label><span>Activity prompt · English</span><textarea rows={3} value={current.promptEn ?? ""} onChange={(event) => replaceCurrent({ promptEn: event.target.value })} /></label>
          <label><span>คำสั่งกิจกรรม · ภาษาไทย</span><textarea rows={3} value={current.promptTh ?? ""} onChange={(event) => replaceCurrent({ promptTh: event.target.value })} /></label>
        </div>}
        <label className="speaker-note-field"><span>{t(language, "Presenter notes · Only shown in the host console", "บันทึกผู้สอน · แสดงเฉพาะหน้าผู้สอน")}</span><textarea rows={3} value={current.speakerNotes ?? ""} onChange={(event) => replaceCurrent({ speakerNotes: event.target.value })} /></label>
        <div className="editor-actions">
          <span>{t(language, "Published rooms keep their original slide snapshot.", "ห้องที่เปิดแล้วจะเก็บสไลด์ชุดเดิมไว้")}</span>
          <div><button className="button button--outline" onClick={() => void saveDraft()} disabled={busy || !dirty}><Save size={15} />{t(language, "Save draft", "บันทึกฉบับร่าง")}</button><button className="button button--teal" onClick={() => void publish()} disabled={busy}><Send size={15} />{busy ? t(language, "Saving…", "กำลังบันทึก…") : t(language, "Publish", "เผยแพร่")}</button></div>
        </div>
      </div>
    </div>
    <div className="version-history"><strong>{t(language, "Recent snapshots", "เวอร์ชันล่าสุด")}</strong>{template.versions.map((version) => <span key={`${version.kind}-${version.version}-${version.createdAt}`}>{version.kind} v{version.version} · {new Date(version.createdAt).toLocaleString(language === "th" ? "th-TH" : "en-US", { dateStyle: "medium", timeStyle: "short" })}</span>)}</div>
  </section>;
}
