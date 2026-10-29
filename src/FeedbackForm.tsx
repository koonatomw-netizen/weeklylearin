import { useEffect, useState } from "react";
import { CircleCheck, LoaderCircle, Send, ShieldCheck, Star } from "lucide-react";
import { ApiError, getRoom, submitFeedback } from "./api";
import type { FeedbackAnswers, FeedbackQuestions, Language, ParticipantSelf, RoomEnvelope } from "./shared/types";
import { FEEDBACK_TEXT_MAX } from "./shared/types";
import { Cmd, Cursor, Notice, TerminalWindow, t } from "./ui";

type Draft = Omit<FeedbackAnswers, "trainingRating"> & { trainingRating: number | null };
const emptyDraft: Draft = { trainingRating: null, workChallenges: "", supportNeeded: "", trainingRequests: "", otherComments: "" };

/** Mandatory end-of-session feedback. No skip: the draft survives refreshes and dropped connections. */
export function WeeklyFeedback({ me, code, token, language, setRoom, questions }: {
  me: ParticipantSelf; code: string; token: string; language: Language; setRoom: (room: RoomEnvelope) => void; questions: FeedbackQuestions;
}) {
  const ask = (slot: keyof FeedbackQuestions) => t(language, questions[slot].en, questions[slot].th);
  const draftKey = `4seas:feedback:${code}`;
  const [draft, setDraft] = useState<Draft>(() => {
    try { return { ...emptyDraft, ...JSON.parse(localStorage.getItem(draftKey) ?? "{}") as Partial<Draft> }; } catch { return emptyDraft; }
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    try {
      if (me.feedbackSubmittedAt) localStorage.removeItem(draftKey);
      else localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch { /* storage blocked */ }
  }, [draft, draftKey, me.feedbackSubmittedAt]);

  if (me.feedbackSubmittedAt) {
    return <TerminalWindow title="feedback · submitted" className="p-card p-card--winner">
      <h1 className="p-title"><CircleCheck className="ok" /> {t(language, "Thank you! Feedback received.", "ขอบคุณ! ได้รับแบบสอบถามแล้ว")}</h1>
      <p className="p-copy">{t(language, `Submitted as ${me.nickname} at ${new Date(me.feedbackSubmittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`, `ส่งในชื่อ ${me.nickname} เวลา ${new Date(me.feedbackSubmittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`)}</p>
      <Cmd>{t(language, "session complete", "จบเซสชันแล้ว")}<Cursor /></Cmd>
      <p className="mono-dim">{t(language, "You can close this page. See you next week!", "ปิดหน้านี้ได้เลย แล้วพบกันสัปดาห์หน้า!")}</p>
    </TerminalWindow>;
  }

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const missing = {
    trainingRating: draft.trainingRating === null,
    workChallenges: !draft.workChallenges.trim(),
    supportNeeded: !draft.supportNeeded.trim(),
    trainingRequests: !draft.trainingRequests.trim(),
  };
  const complete = !Object.values(missing).some(Boolean);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!complete || sending || draft.trainingRating === null) return;
    setSending(true);
    setError("");
    try {
      setRoom(await submitFeedback(code, token, { ...draft, trainingRating: draft.trainingRating }));
    } catch (caught) {
      // Already submitted (e.g. on another tab or a retried request): show the confirmation.
      if (caught instanceof ApiError && caught.status === 409) {
        try { setRoom(await getRoom(code, token)); } catch { /* keep the message below */ }
      }
      setError(caught instanceof Error ? caught.message : "Feedback could not be sent. Your answers are saved; try again.");
    } finally { setSending(false); }
  }

  const text = (key: "workChallenges" | "supportNeeded" | "trainingRequests" | "otherComments", number: number, label: string, placeholder: string, required: boolean) => (
    <div className="fb-field">
      <label htmlFor={`fb-${key}`} className="fb-label">{number}. {label}{required ? " *" : <span className="mono-dim"> ({t(language, "optional", "ไม่บังคับ")})</span>}</label>
      <textarea id={`fb-${key}`} className={`input fb-text${touched && required && missing[key as keyof typeof missing] ? " is-invalid" : ""}`} rows={3}
        maxLength={FEEDBACK_TEXT_MAX} value={draft[key]} onChange={(event) => set(key, event.target.value)} placeholder={placeholder}
        aria-required={required} aria-invalid={touched && required && missing[key as keyof typeof missing]} />
      {required && touched && missing[key as keyof typeof missing] && <span className="fb-error">{t(language, 'Required — type "None" if nothing applies.', 'จำเป็นต้องตอบ — พิมพ์ "ไม่มี" ได้ถ้าไม่มีอะไร')}</span>}
    </div>
  );

  return <TerminalWindow title="weekly-feedback" className="p-card" right={<span className="mono-dim">{t(language, "required", "จำเป็น")}</span>}>
    <form onSubmit={submit} className="fb-form" noValidate>
      <div className="fb-head">
        <h1 className="p-title">{t(language, "Before You Leave…", "ก่อนกลับ…")}</h1>
        <p className="p-copy">{t(language, "Help us improve the way we work together.", "ช่วยเราปรับปรุงการทำงานร่วมกันให้ดีขึ้น")}</p>
      </div>
      <div className="fb-identity">
        <span className="field-label">submitted by</span>
        <b>{me.nickname}</b>
        <span className="mono-dim">{t(language, `Linked to session ${code}`, `ผูกกับเซสชัน ${code}`)}</span>
      </div>
      <p className="fb-disclosure"><ShieldCheck size={16} />{t(language,
        "Not anonymous: your name is attached. Only the presenter and authorised 4Seas management can read your answers. They are used to plan support and future training, and are never linked to Prompt Battle scores. \"None\" is a perfectly good answer.",
        "แบบสอบถามนี้ระบุชื่อ: คำตอบจะแนบชื่อของคุณ มีเพียงผู้สอนและผู้บริหาร 4Seas ที่ได้รับสิทธิ์เท่านั้นที่อ่านได้ ใช้เพื่อวางแผนการช่วยเหลือและการอบรม และไม่เกี่ยวกับคะแนน Prompt Battle ตอบว่า \"ไม่มี\" ได้เลย")}</p>

      <fieldset className="fb-field">
        <legend className="fb-label">1. {ask("trainingRating")} *</legend>
        <div className="fb-stars" role="radiogroup" aria-label={t(language, "Training rating", "คะแนนการอบรม")}>
          {[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} role="radio" aria-checked={draft.trainingRating === value} aria-label={`${value} / 5`}
            className={`fb-star${draft.trainingRating !== null && value <= draft.trainingRating ? " is-on" : ""}`} onClick={() => set("trainingRating", value)}>
            <Star size={20} /><span>{value}</span>
          </button>)}
        </div>
        {touched && missing.trainingRating && <span className="fb-error">{t(language, "Choose a rating from 1 to 5.", "เลือกคะแนน 1–5")}</span>}
      </fieldset>
      {text("workChallenges", 2, ask("workChallenges"), t(language, "Your answer, or enter 'None'", "คำตอบของคุณ หรือพิมพ์ 'ไม่มี'"), true)}
      {text("supportNeeded", 3, ask("supportNeeded"), t(language, "Your answer, or enter 'None'", "คำตอบของคุณ หรือพิมพ์ 'ไม่มี'"), true)}
      {text("trainingRequests", 4, ask("trainingRequests"), t(language, "Your answer, or enter 'None'", "คำตอบของคุณ หรือพิมพ์ 'ไม่มี'"), true)}
      {text("otherComments", 5, ask("otherComments"), t(language, "Any additional suggestions…", "ข้อเสนอแนะเพิ่มเติม…"), false)}

      {error && <Notice>{error}</Notice>}
      <button className="btn btn--accent btn--block" type="submit" disabled={sending}>
        {sending ? <><LoaderCircle className="spin" size={16} />{t(language, "Sending…", "กำลังส่ง…")}</> : <><Send size={16} />{t(language, "Submit feedback", "ส่งแบบสอบถาม")}</>}
      </button>
      <p className="mono-dim center">{t(language, "Your answers are saved on this device until you submit.", "คำตอบจะถูกเก็บไว้ในเครื่องนี้จนกว่าจะส่ง")}</p>
    </form>
  </TerminalWindow>;
}
