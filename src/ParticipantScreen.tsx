import { useEffect, useRef, useState } from "react";
import { Check, CircleCheck, Copy, LoaderCircle, Lock, Send, Trophy, WifiOff } from "lucide-react";
import { castVote, newRequestId, saveChecklist, selectFinal, submitPrompt, tokens } from "./api";
import { PixelIcon } from "./case/PixelIcon";
import { WeeklyFeedback } from "./FeedbackForm";
import { battleTitle } from "./slides/Deck";
import { FIVE_PARTS } from "./shared/challenge";
import type { BattleView, Checklist, Language, OwnSubmission, ParticipantSelf, RoomEnvelope, SessionState } from "./shared/types";
import { MAX_ATTEMPTS, PROMPT_MAX, PROMPT_MIN } from "./shared/types";
import type { Theme } from "./theme";
import { useRoom } from "./useRoom";
import { Brand, Cmd, Cursor, LanguageSwitch, LiveDot, Notice, TerminalWindow, ThemeToggle, formatCode, t } from "./ui";

interface Props {
  code: string;
  token: string;
  language: Language;
  onLanguage: (language: Language) => void;
  theme: Theme;
  onTheme: () => void;
  navigate: (url: string) => void;
}

export default function ParticipantScreen({ code, token, language, onLanguage, theme, onTheme, navigate }: Props) {
  const { room, setRoom, connected, error, expired } = useRoom(code, token);

  if (expired) {
    tokens.setParticipant(code, null);
    return <main className="center-page"><Brand /><Notice>{t(language, "Your session for this room has ended. Join again with the room code.", "เซสชันของคุณสิ้นสุดแล้ว กรุณาเข้าห้องใหม่ด้วยรหัสห้อง")}</Notice><button className="btn btn--accent" onClick={() => navigate(`/?view=join&room=${code}`)}>{t(language, "Rejoin", "เข้าห้องอีกครั้ง")}</button></main>;
  }
  if (!room || !room.me) return <main className="center-page"><Brand /><p className="mono-dim"><LoaderCircle className="spin" size={16} /> {error || t(language, "connecting to the room…", "กำลังเชื่อมต่อห้อง…")}</p></main>;

  const { state, me } = room;
  return <main className="participant">
    <header className="app-header app-header--compact">
      <Brand compact />
      <span className="code-chip">{formatCode(code)}</span>
      <div className="app-header-right">
        <LiveDot live={connected} language={language} />
        <LanguageSwitch value={language} onChange={onLanguage} />
        <ThemeToggle theme={theme} onToggle={onTheme} language={language} />
      </div>
    </header>
    <div className="participant-body">
      <p className="whoami mono-dim">{me.nickname.toLowerCase().replace(/\s+/g, "-")}@4seas<span className="accent">:~$</span> {t(language, "you're in", "เข้าห้องแล้ว")}</p>
      {!connected && error && <Notice kind="info"><WifiOff size={14} /> {t(language, "Connection is unstable — updates will continue automatically.", "การเชื่อมต่อไม่เสถียร ระบบจะอัปเดตต่อให้อัตโนมัติ")}</Notice>}
      <ParticipantStage state={state} me={me} code={code} token={token} language={language} setRoom={setRoom} />
    </div>
  </main>;
}

function ParticipantStage({ state, me, code, token, language, setRoom }: {
  state: SessionState; me: ParticipantSelf; code: string; token: string; language: Language; setRoom: (room: RoomEnvelope) => void;
}) {
  switch (state.activity) {
    case "waiting": return <Waiting state={state} language={language} />;
    case "writing": return <Writing state={state} me={me} code={code} token={token} language={language} setRoom={setRoom} open />;
    case "writing_closed": return <Writing state={state} me={me} code={code} token={token} language={language} setRoom={setRoom} open={false} />;
    case "battle": return <Battle state={state} code={code} token={token} language={language} setRoom={setRoom} />;
    case "results": return <Results state={state} me={me} language={language} />;
    case "feedback": return <WeeklyFeedback me={me} code={code} token={token} language={language} setRoom={setRoom} />;
  }
}

// ------------------------------------------------------------------ waiting

function Waiting({ state, language }: { state: SessionState; language: Language }) {
  return <TerminalWindow title="waiting-room" className="p-card">
    <Cmd>{t(language, "waiting for presenter", "รอผู้สอนเริ่มกิจกรรม")}<Cursor /></Cmd>
    <h1 className="p-title">{t(language, "You're in! Eyes on the screen.", "เข้าห้องแล้ว! ดูที่จอด้านหน้าได้เลย")}</h1>
    <p className="p-copy">{t(language, "The activity will appear here automatically when the presenter starts it. No need to refresh.", "กิจกรรมจะขึ้นที่นี่อัตโนมัติเมื่อผู้สอนเริ่ม ไม่ต้องรีเฟรช")}</p>
    <p className="mono-dim">{state.participantCount} {t(language, "people in the room", "คนในห้อง")}</p>
  </TerminalWindow>;
}

// ------------------------------------------------------------------ writing

function ChallengeCard({ state, language }: { state: SessionState; language: Language }) {
  const challenge = state.challenge;
  const drawn = state.caseRoll;
  return <TerminalWindow title="challenge.md" className={`p-card${drawn ? ` case-card case-card--${drawn.rarity}` : ""}`}>
    {drawn && <PixelIcon situationId={drawn.situationId} size={72} />}
    <p className="p-eyebrow">{t(language, challenge.titleEn, challenge.titleTh)}</p>
    <p className="p-copy">{t(language, challenge.scenarioEn, challenge.scenarioTh)}</p>
    <Cmd>{t(language, "task", "โจทย์")}</Cmd>
    <p className="p-copy p-copy--strong">{t(language, challenge.taskEn, challenge.taskTh)}</p>
  </TerminalWindow>;
}

function Writing({ state, me, code, token, language, setRoom, open }: {
  state: SessionState; me: ParticipantSelf; code: string; token: string; language: Language; setRoom: (room: RoomEnvelope) => void; open: boolean;
}) {
  const draftKey = `4seas:draft:${code}`;
  const [draft, setDraft] = useState(() => { try { return localStorage.getItem(draftKey) ?? ""; } catch { return ""; } });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [checkFor, setCheckFor] = useState<string | null>(null);
  const requestId = useRef<string | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const remaining = MAX_ATTEMPTS - me.submissions.length;
  const checking = me.submissions.find((submission) => submission.id === checkFor);

  useEffect(() => { try { localStorage.setItem(draftKey, draft); } catch { /* storage blocked */ } }, [draft, draftKey]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (sending) return;
    const text = draft.trim();
    if (text.length < PROMPT_MIN) return;
    setSending(true);
    setError("");
    requestId.current ??= newRequestId();
    try {
      const next = await submitPrompt(code, token, text, requestId.current);
      requestId.current = null;
      setRoom(next);
      const latest = next.me?.submissions[next.me.submissions.length - 1];
      if (latest) setCheckFor(latest.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Submission failed.");
    } finally { setSending(false); }
  }

  function reuse(submission: OwnSubmission) {
    setDraft(submission.promptText);
    requestId.current = null;
    setCheckFor(null);
    window.setTimeout(() => editorRef.current?.focus(), 0);
  }

  return <>
    <ChallengeCard state={state} language={language} />
    <div className="attempts-bar">
      <span className="attempt-dots attempt-dots--lg">{Array.from({ length: MAX_ATTEMPTS }, (_, index) => <i key={index} className={index < me.submissions.length ? "is-on" : ""} />)}</span>
      <span>{remaining > 0 ? t(language, `${remaining} of ${MAX_ATTEMPTS} attempts left`, `เหลือ ${remaining} จาก ${MAX_ATTEMPTS} ครั้ง`) : t(language, "All attempts used", "ใช้ครบทุกครั้งแล้ว")}</span>
    </div>

    {checking ? <SelfCheck submission={checking} code={code} token={token} language={language} setRoom={setRoom}
      canImprove={open && remaining > 0} onImprove={() => reuse(checking)} onDone={() => setCheckFor(null)} />
      : open && remaining > 0 ? <TerminalWindow title={`prompt_v${me.submissions.length + 1}.txt`} className="p-card">
        <form onSubmit={submit} className="editor">
          <label htmlFor="prompt-editor" className="field-label">{t(language, "Your prompt for the AI assistant", "พรอมป์ที่คุณจะสั่ง AI")}</label>
          <textarea id="prompt-editor" ref={editorRef} className="input editor-area" value={draft} maxLength={PROMPT_MAX}
            onChange={(event) => { setDraft(event.target.value); requestId.current = null; }}
            placeholder={t(language, "You are a receptionist at 4Seas Nimman…", "You are a receptionist at 4Seas Nimman…")} rows={7} />
          <div className="editor-meta mono-dim"><span>{draft.trim().length}/{PROMPT_MAX}</span><span>{draft.trim().length < PROMPT_MIN ? t(language, `at least ${PROMPT_MIN} characters`, `อย่างน้อย ${PROMPT_MIN} ตัวอักษร`) : t(language, "ready to submit", "พร้อมส่ง")}</span></div>
          {error && <Notice>{error}</Notice>}
          <button className="btn btn--accent btn--block" type="submit" disabled={sending || draft.trim().length < PROMPT_MIN}>
            {sending ? <><LoaderCircle className="spin" size={16} />{t(language, "Submitting…", "กำลังส่ง…")}</> : <><Send size={16} />{t(language, `Submit attempt ${me.submissions.length + 1}`, `ส่งครั้งที่ ${me.submissions.length + 1}`)}</>}
          </button>
        </form>
      </TerminalWindow>
      : <Notice kind="info">{open ? t(language, "You've used all three attempts. Choose your final prompt below.", "คุณส่งครบ 3 ครั้งแล้ว เลือกพรอมป์สุดท้ายด้านล่าง") : t(language, "Prompt submission is closed. Choose your final prompt for the battle.", "ปิดรับพรอมป์แล้ว เลือกพรอมป์สุดท้ายสำหรับแบทเทิล")}</Notice>}

    {me.submissions.length > 0 ? <FinalPicker me={me} code={code} token={token} language={language} setRoom={setRoom} onReuse={open && remaining > 0 ? reuse : undefined} onCheck={setCheckFor} />
      : !open && <Notice kind="info">{t(language, "You didn't submit a prompt this time — you can still vote in every battle.", "รอบนี้คุณไม่ได้ส่งพรอมป์ แต่ยังโหวตได้ทุกแบทเทิล")}</Notice>}
    <p className="mono-dim center">{state.submittedCount}/{state.participantCount} {t(language, "participants have submitted", "คนส่งพรอมป์แล้ว")}</p>
  </>;
}

function SelfCheck({ submission, code, token, language, setRoom, canImprove, onImprove, onDone }: {
  submission: OwnSubmission; code: string; token: string; language: Language; setRoom: (room: RoomEnvelope) => void;
  canImprove: boolean; onImprove: () => void; onDone: () => void;
}) {
  const [checks, setChecks] = useState<Checklist>(submission.checklist);
  const ticked = FIVE_PARTS.filter((part) => checks[part.key]).length;

  async function toggle(key: keyof Checklist) {
    const next = { ...checks, [key]: !checks[key] };
    setChecks(next);
    try { setRoom(await saveChecklist(code, token, submission.id, next)); } catch { /* the checklist is a learning aid; keep local state */ }
  }

  return <TerminalWindow title={`self-check · attempt ${submission.attempt}`} className="p-card" right={<span className="mono-dim">{ticked}/5</span>}>
    <p className="p-copy"><CircleCheck size={16} className="ok" /> {t(language, "Submitted! Now check your own prompt — this is for learning, not a score.", "ส่งแล้ว! ลองเช็กพรอมป์ของตัวเอง ใช้เพื่อเรียนรู้ ไม่ใช่การให้คะแนน")}</p>
    <blockquote className="prompt-text">{submission.promptText}</blockquote>
    <ul className="checklist">
      {FIVE_PARTS.map((part) => <li key={part.key}>
        <label className={checks[part.key] ? "is-on" : ""}>
          <input type="checkbox" aria-label={`${part.en}: ${t(language, part.questionEn, part.questionTh)}`} checked={Boolean(checks[part.key])} onChange={() => void toggle(part.key)} />
          <span className="check-box">{checks[part.key] && <Check size={14} />}</span>
          <span><b>{part.en} <small>{part.th}</small></b><span>{t(language, part.questionEn, part.questionTh)}</span></span>
        </label>
      </li>)}
    </ul>
    <div className="button-row">
      {canImprove && <button className="btn btn--accent" onClick={onImprove}>{t(language, "Improve this prompt", "ปรับปรุงพรอมป์นี้")}</button>}
      <button className="btn btn--ghost" onClick={onDone}>{t(language, "Done", "เสร็จแล้ว")}</button>
    </div>
  </TerminalWindow>;
}

function FinalPicker({ me, code, token, language, setRoom, onReuse, onCheck }: {
  me: ParticipantSelf; code: string; token: string; language: Language; setRoom: (room: RoomEnvelope) => void;
  onReuse?: (submission: OwnSubmission) => void; onCheck: (id: string) => void;
}) {
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");
  async function choose(id: string) {
    if (saving || me.finalLocked) return;
    setSaving(id);
    setError("");
    try { setRoom(await selectFinal(code, token, id)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save your choice."); }
    finally { setSaving(null); }
  }
  return <TerminalWindow title="my-prompts" className="p-card" right={me.finalSubmissionId ? <span className="badge badge--good"><Check size={13} />final</span> : <span className="mono-dim">{t(language, "pick one", "เลือก 1")}</span>}>
    <p className="p-copy">{t(language, "Select the one prompt you want to enter in the battle.", "เลือกพรอมป์ 1 อันที่จะส่งเข้าแบทเทิล")}</p>
    {error && <Notice>{error}</Notice>}
    <ul className="my-prompts">
      {[...me.submissions].reverse().map((submission) => {
        const selected = me.finalSubmissionId === submission.id;
        return <li key={submission.id} className={selected ? "is-selected" : ""}>
          <header><span className="mono">#{submission.attempt}</span>{selected && <span className="badge badge--good"><Check size={13} />{t(language, "final", "สุดท้าย")}</span>}</header>
          <p className="prompt-text">{submission.promptText}</p>
          <div className="button-row button-row--tight">
            <button className={`btn ${selected ? "btn--good" : "btn--accent"}`} disabled={me.finalLocked || selected || saving !== null} onClick={() => void choose(submission.id)}>
              {saving === submission.id ? <LoaderCircle className="spin" size={14} /> : selected ? <Check size={14} /> : null}
              {selected ? t(language, "Selected", "เลือกแล้ว") : t(language, "Select as final", "เลือกเป็นพรอมป์สุดท้าย")}
            </button>
            {onReuse && <button className="btn btn--ghost" onClick={() => onReuse(submission)}><Copy size={14} />{t(language, "Use as draft", "ใช้เป็นร่าง")}</button>}
            <button className="btn btn--ghost" onClick={() => onCheck(submission.id)}>{t(language, "Self-check", "เช็กตัวเอง")}</button>
          </div>
        </li>;
      })}
    </ul>
    {me.finalLocked && <p className="mono-dim"><Lock size={13} /> {t(language, "Battles have started — your final prompt is locked.", "แบทเทิลเริ่มแล้ว พรอมป์สุดท้ายถูกล็อก")}</p>}
  </TerminalWindow>;
}

// ------------------------------------------------------------------- battle

function Battle({ state, code, token, language, setRoom }: { state: SessionState; code: string; token: string; language: Language; setRoom: (room: RoomEnvelope) => void }) {
  const battle = state.battles.find((item) => item.id === state.activeBattleId);
  if (!battle) return <Waiting state={state} language={language} />;
  const title = battleTitle(battle, state, language);

  if (battle.status === "revealed") return <BattleResult battle={battle} title={title} language={language} />;
  if (battle.status === "pending") return <TerminalWindow title={title} className="p-card">
    <Cmd>{t(language, "battle loading", "กำลังเตรียมแบทเทิล")}<Cursor /></Cmd>
    <h1 className="p-title">{t(language, "Get ready to vote", "เตรียมโหวต")}</h1>
    <p className="p-copy">{battle.entries.length} {t(language, "anonymous prompts are about to compete. Voting opens when the presenter starts it.", "พรอมป์แบบไม่ระบุชื่อกำลังจะแข่งกัน การโหวตจะเปิดเมื่อผู้สอนเริ่ม")}</p>
  </TerminalWindow>;
  if (battle.isCompetitor) return <TerminalWindow title={title} className="p-card">
    <h1 className="p-title">🎯 {t(language, "Your prompt is in this battle!", "พรอมป์ของคุณอยู่ในแบทเทิลนี้!")}</h1>
    <p className="p-copy">{t(language, "You can't vote in a battle that contains your own prompt. Watch the screen and wait for the reveal.", "คุณโหวตในแบทเทิลที่มีพรอมป์ของตัวเองไม่ได้ ดูที่จอและรอเปิดผล")}</p>
    <BattleCards battle={battle} language={language} />
  </TerminalWindow>;
  if (battle.status === "closed" || battle.hasVoted) return <TerminalWindow title={title} className="p-card">
    <h1 className="p-title">{battle.hasVoted ? <><CircleCheck className="ok" /> {t(language, "Vote locked in", "บันทึกโหวตแล้ว")}</> : t(language, "Voting closed", "ปิดโหวตแล้ว")}</h1>
    <p className="p-copy">{t(language, "Waiting for the presenter to reveal the results…", "รอผู้สอนเปิดผล…")}<Cursor /></p>
    <p className="mono-dim">{battle.votesCast}/{battle.eligibleVoters} {t(language, "votes in", "เสียงเข้ามาแล้ว")}</p>
  </TerminalWindow>;
  return <Voting key={battle.id} battle={battle} title={title} code={code} token={token} language={language} setRoom={setRoom} />;
}

function BattleCards({ battle, language, selected, onSelect }: { battle: BattleView; language: Language; selected?: string | null; onSelect?: (id: string) => void }) {
  return <div className="vote-cards" role={onSelect ? "radiogroup" : undefined}>
    {battle.entries.map((entry) => {
      const content = <>
        <span className="vote-label">prompt_{entry.label}{entry.isOwn && <em> · {t(language, "yours", "ของคุณ")}</em>}</span>
        <span className="prompt-text">{entry.promptText}</span>
      </>;
      return onSelect
        ? <button key={entry.id} role="radio" aria-checked={selected === entry.id} className={`vote-card${selected === entry.id ? " is-selected" : ""}`} onClick={() => onSelect(entry.id)}>{content}</button>
        : <div key={entry.id} className={`vote-card${entry.isOwn ? " is-own" : ""}`}>{content}</div>;
    })}
  </div>;
}

function Voting({ battle, title, code, token, language, setRoom }: { battle: BattleView; title: string; code: string; token: string; language: Language; setRoom: (room: RoomEnvelope) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(newRequestId());
  const choice = battle.entries.find((entry) => entry.id === selected);

  async function confirm() {
    if (!selected || sending) return;
    setSending(true);
    setError("");
    try { setRoom(await castVote(code, token, battle.id, selected, requestId.current)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Vote failed."); setConfirming(false); }
    finally { setSending(false); }
  }

  return <TerminalWindow title={title} className="p-card">
    <h1 className="p-title">{t(language, "Which prompt would work best?", "พรอมป์ไหนน่าจะได้ผลดีที่สุด?")}</h1>
    <p className="p-copy">{t(language, "Tap one prompt, then confirm. You get one vote and it can't be changed.", "แตะเลือก 1 พรอมป์ แล้วยืนยัน มี 1 เสียงและเปลี่ยนไม่ได้")}</p>
    <BattleCards battle={battle} language={language} selected={selected} onSelect={(id) => { if (!sending) { setSelected(id); setConfirming(false); } }} />
    {error && <Notice>{error}</Notice>}
    <div className="vote-bar">
      {confirming && choice ? <>
        <p>{t(language, `Vote for prompt ${choice.label}? This is final.`, `โหวตพรอมป์ ${choice.label}? เปลี่ยนไม่ได้`)}</p>
        <div className="button-row">
          <button className="btn btn--ghost" disabled={sending} onClick={() => setConfirming(false)}>{t(language, "Back", "กลับ")}</button>
          <button className="btn btn--accent" disabled={sending} onClick={() => void confirm()}>{sending ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}{t(language, "Confirm vote", "ยืนยันโหวต")}</button>
        </div>
      </> : <button className="btn btn--accent btn--block" disabled={!selected} onClick={() => setConfirming(true)}>{choice ? t(language, `Vote for prompt ${choice.label}`, `โหวตพรอมป์ ${choice.label}`) : t(language, "Select a prompt", "เลือกพรอมป์")}</button>}
    </div>
  </TerminalWindow>;
}

function BattleResult({ battle, title, language }: { battle: BattleView; title: string; language: Language }) {
  const own = battle.entries.find((entry) => entry.isOwn);
  const sorted = [...battle.entries].sort((a, b) => (a.result?.rank ?? 9) - (b.result?.rank ?? 9));
  return <TerminalWindow title={`${title} · results`} className="p-card">
    {own && <Notice kind={own.result?.isWinner ? "success" : "info"}>{own.result?.isWinner
      ? (battle.round === "final" ? t(language, "🏆 Your prompt won!", "🏆 พรอมป์ของคุณชนะ!") : t(language, "🎉 Your prompt advances to the Grand Final!", "🎉 พรอมป์ของคุณได้เข้ารอบชิง!"))
      : t(language, "Thanks for competing — great effort!", "ขอบคุณที่ร่วมแข่ง เก่งมาก!")}</Notice>}
    <ul className="result-list">
      {sorted.map((entry) => {
        const share = battle.votesCast ? ((entry.result?.votes ?? 0) / battle.votesCast) * 100 : 0;
        return <li key={entry.id} className={entry.result?.isWinner ? "is-winner" : ""}>
          <header><span className="mono">prompt_{entry.label}</span><span>{entry.result?.nickname}{entry.result?.isWinner && <Trophy size={14} className="accent" />}</span></header>
          <div className="result-bar"><span style={{ width: `${share}%` }} /></div>
          <p className="mono-dim">{entry.result?.votes ?? 0} {t(language, "votes", "เสียง")} · {t(language, "score", "คะแนน")} {entry.result?.score ?? 0}</p>
        </li>;
      })}
    </ul>
    {battle.tie && <p className="mono-dim">{battle.resolutionNote || t(language, "Tie — tied prompts share the result.", "เสมอ — พรอมป์ที่เสมอได้ผลร่วมกัน")}</p>}
    <p className="mono-dim">{t(language, "Next battle starts soon. Stay on this page.", "แบทเทิลถัดไปจะเริ่มเร็วๆ นี้ อยู่ที่หน้านี้ได้เลย")}<Cursor /></p>
  </TerminalWindow>;
}

// ------------------------------------------------------------------ results

function Results({ state, me, language }: { state: SessionState; me: ParticipantSelf; language: Language }) {
  const mine = state.leaderboard.find((row) => row.participantId === me.id);
  return <>
    <TerminalWindow title="winner.prompt" className="p-card p-card--winner">
      <p className="p-eyebrow">{state.champions.length > 1 ? t(language, "shared champions", "แชมป์ร่วม") : t(language, "champion", "แชมป์")}</p>
      <h1 className="p-title"><Trophy className="accent" /> {state.champions.map((champion) => champion.nickname).join(" & ") || "—"}</h1>
      {state.champions[0] && <blockquote className="prompt-text">{state.champions[0].promptText}</blockquote>}
    </TerminalWindow>
    {mine && <Notice kind="success">{t(language, `Your rank: #${mine.rank} · battle score ${mine.battleScore}`, `อันดับของคุณ: #${mine.rank} · คะแนนแบทเทิล ${mine.battleScore}`)}</Notice>}
    <TerminalWindow title="leaderboard" className="p-card">
      <ol className="p-board">
        {state.leaderboard.map((row) => <li key={row.participantId} className={row.participantId === me.id ? "is-me" : ""}>
          <span className="mono">{row.rank}</span><span>{row.nickname}{row.stage !== "battle" && <em className="stage-tag">{row.stage === "champion" ? t(language, "champion", "แชมป์") : t(language, "finalist", "รอบชิง")}</em>}</span><span className="mono-dim">{row.finalScore ?? row.battleScore}</span>
        </li>)}
      </ol>
      <p className="mono-dim">{t(language, "Scores = votes ÷ eligible voters × 100 — a community preference, not an AI grade.", "คะแนน = โหวต ÷ ผู้มีสิทธิ์ × 100 คือความชอบของกลุ่ม ไม่ใช่คะแนนจาก AI")}</p>
    </TerminalWindow>
  </>;
}
