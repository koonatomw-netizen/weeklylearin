import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Plus, Save, Trash2 } from "lucide-react";
import type { Situation } from "../shared/situations";
import type { Language } from "../shared/types";
import { Notice, TerminalWindow, t } from "../ui";
import { adminApi, type CaseSet } from "./adminApi";
import { CaseListEditor } from "./PlanContentEditors";

const STARTER_IDS = ["week01-cases", "week02-cases"];
const blank = (): Situation => ({ id: "case-1", rarity: "common", challenge: { titleEn: "", titleTh: "", scenarioEn: "", scenarioTh: "", taskEn: "", taskTh: "" } });

/** Reusable sets of cases for the presenter's "Open case" draw. A plan copies a set when you pick it in the Weekly Planner. */
export default function CaseSets({ language }: { language: Language }) {
  const [sets, setSets] = useState<CaseSet[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ title: string; situations: Situation[] } | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const current = sets?.find((item) => item.id === selected) ?? null;
  const dirty = useMemo(() => Boolean(current && draft && (draft.title !== current.title || JSON.stringify(draft.situations) !== JSON.stringify(current.situations))), [current, draft]);

  const load = useCallback(() => adminApi.caseSets().then((result) => setSets(result.sets)).catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load case sets.")), []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const open = (set: CaseSet) => {
    if (dirty && !window.confirm(t(language, "Leave without saving your changes?", "ออกโดยไม่บันทึก?"))) return;
    setSelected(set.id);
    setDraft({ title: set.title, situations: set.situations.map((item) => ({ ...item, challenge: { ...item.challenge } })) });
    setNotice("");
  };

  async function run(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try { await work(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Something went wrong."); }
    finally { setBusy(false); }
  }

  const create = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newTitle.trim()) return;
    void run(async () => {
      const { set } = await adminApi.createCaseSet(newTitle.trim(), [blank()]);
      setNewTitle("");
      await load();
      setSelected(set.id);
      setDraft({ title: set.title, situations: set.situations });
    });
  };

  const save = () => current && draft && void run(async () => {
    const { set } = await adminApi.updateCaseSet(current.id, { title: draft.title, situations: draft.situations });
    await load();
    setDraft({ title: set.title, situations: set.situations });
    setNotice(t(language, "Saved. Plans that already copied this set are not changed.", "บันทึกแล้ว แผนที่คัดลอกชุดนี้ไปแล้วจะไม่เปลี่ยน"));
  });

  const remove = () => current && void run(async () => {
    if (!window.confirm(t(language, `Delete "${current.title}"? Plans that copied it keep their cases.`, `ลบ "${current.title}"? แผนที่คัดลอกไปแล้วยังมีเคสอยู่`))) return;
    await adminApi.deleteCaseSet(current.id);
    setSelected(null);
    setDraft(null);
    await load();
  });

  const importStarters = () => void run(async () => {
    const result = await adminApi.seedCaseSets();
    setSets(result.sets);
    setNotice(t(language, "Starter sets imported: the built-in Week 01 cases and the Week 02 chore cases.", "นำเข้าชุดเริ่มต้นแล้ว: เคสมาตรฐานสัปดาห์ที่ 1 และเคสงานประจำสัปดาห์ที่ 2"));
  });

  const missingStarters = sets !== null && STARTER_IDS.some((id) => !sets.some((item) => item.id === id));

  return <>
    <div className="admin-title"><div><h1>Case Sets</h1><p>{t(language, "Reusable cases for the \"Open case\" draw. Pick a set in the Weekly Planner to copy it into a plan, then tweak it there.", "ชุดเคสที่ใช้ซ้ำสำหรับการเปิดเคส เลือกชุดใน Weekly Planner เพื่อคัดลอกเข้าแผน แล้วปรับเพิ่มได้")}</p></div></div>
    {error && <Notice>{error}</Notice>}
    {notice && <Notice kind="success">{notice}</Notice>}
    <div className="library">
      <aside className="lesson-list">
        <form onSubmit={create} className="button-row">
          <input className="input" value={newTitle} maxLength={120} onChange={(event) => setNewTitle(event.target.value)} placeholder={t(language, "New set title", "ชื่อชุดใหม่")} aria-label={t(language, "New set title", "ชื่อชุดใหม่")} style={{ flex: 1, minWidth: 0 }} />
          <button className="btn btn--accent" type="submit" disabled={busy || !newTitle.trim()} aria-label={t(language, "Create set", "สร้างชุด")}><Plus size={15} /></button>
        </form>
        {missingStarters && <button className="btn btn--ghost" disabled={busy} onClick={importStarters}><Download size={15} />{t(language, "Import starter sets", "นำเข้าชุดเริ่มต้น")}</button>}
        {sets?.map((item) => <button key={item.id} className={`lesson-item${selected === item.id ? " is-on" : ""}`} onClick={() => open(item)}>
          <b>{item.title}</b><small>{item.situations.length} {t(language, "cases", "เคส")}</small>
        </button>)}
        {sets && !sets.length && <p className="mono-dim">{t(language, "> no sets yet — create one or import the starters", "> ยังไม่มีชุด สร้างหรือนำเข้าชุดเริ่มต้นได้")}</p>}
      </aside>
      <div>
        {current && draft ? <TerminalWindow title="case-set.edit" right={dirty ? <span className="save-badge is-unsaved"><i />{t(language, "unsaved changes", "ยังไม่บันทึก")}</span> : undefined}>
          <label className="props-field"><span className="field-label">{t(language, "title", "ชื่อชุด")}</span>
            <input className="input" maxLength={120} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
          <CaseListEditor situations={draft.situations} onChange={(situations) => setDraft({ ...draft, situations })} language={language} />
          <div className="button-row">
            <button className="btn btn--accent" disabled={busy || !dirty || !draft.title.trim() || !draft.situations.length} onClick={save}><Save size={14} />{t(language, "Save set", "บันทึกชุด")}</button>
            <button className="btn btn--danger" disabled={busy} onClick={remove}><Trash2 size={14} />{t(language, "Delete set", "ลบชุด")}</button>
          </div>
        </TerminalWindow> : <p className="mono-dim">{t(language, "> choose a set on the left, or create one", "> เลือกชุดทางซ้าย หรือสร้างชุดใหม่")}</p>}
      </div>
    </div>
  </>;
}
