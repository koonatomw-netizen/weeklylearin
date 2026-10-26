import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Check, Crown, Trophy, Users, X } from "lucide-react";
import { FIVE_PARTS, WEEK01_CHALLENGE } from "../shared/challenge";
import type { BattleView, ChecklistKey, Language, SessionState } from "../shared/types";
import { BrandMark, Cmd, Cursor, QRStamp, TerminalWindow, WindowDots, formatCode, t } from "../ui";

export type BattleCommand = "open_voting" | "close_voting" | "reveal" | "next_battle" | "start_final" | "start_tiebreak" | "accept_shared" | "show_results";

export interface SlideProps {
  index: number;
  step: number;
  language: Language;
  state: SessionState;
  joinUrl: string;
  /** Present only on the presenter console; the projector shows no controls. */
  onCommand?: (command: BattleCommand) => void;
  busy?: boolean;
}

const prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/** Fixed 1600×900 design canvas scaled to fit its container, so projection layout never reflows. */
export function SlideStage({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setScale(Math.min(element.clientWidth / 1600, element.clientHeight / 900) || 0.5);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div className={`stage ${className}`} ref={ref}>
    <div className="stage-canvas" style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>{children}</div>
  </div>;
}

export function Slide(props: SlideProps) {
  const slides = [WelcomeSlide, FormulaSlide, CompareSlide, AnatomySlide, ChallengeSlide, BattleSlide, ResultsSlide];
  const Current = slides[props.index] ?? WelcomeSlide;
  return <div className="slide" key={props.index}><Current {...props} /></div>;
}

function SlideFrame({ kicker, number, children, language }: { kicker: string; number: number; children: ReactNode; language: Language }) {
  return <div className="slide-frame">
    <header className="slide-top">
      <span className="slide-brand"><BrandMark size={30} /><b>4Seas</b><em>live training</em></span>
      <span className="slide-kicker">{kicker}</span>
      <span className="slide-number">{String(number).padStart(2, "0")}<small>/07</small></span>
    </header>
    <div className="slide-content">{children}</div>
    <footer className="slide-foot"><span>4Seas Nimman · Chiang Mai</span><span>{t(language, "Week 01 · Prompt Engineering", "สัปดาห์ที่ 1 · Prompt Engineering")}</span></footer>
  </div>;
}

function useTyping(text: string, speed = 45) {
  const [count, setCount] = useState(() => (prefersReducedMotion() ? text.length : 0));
  useEffect(() => {
    if (prefersReducedMotion()) { setCount(text.length); return; }
    setCount(0);
    const timer = window.setInterval(() => setCount((value) => {
      if (value >= text.length) { window.clearInterval(timer); return value; }
      return value + 1;
    }), speed);
    return () => window.clearInterval(timer);
  }, [text, speed]);
  return { typed: text.slice(0, count), done: count >= text.length };
}

// ---------------------------------------------------------------- 01 Welcome

function WelcomeSlide({ language }: SlideProps) {
  const command = 'train --week 01 --topic "prompt-engineering"';
  const { typed, done } = useTyping(command, 40);
  return <SlideFrame kicker={t(language, "welcome", "ยินดีต้อนรับ")} number={1} language={language}>
    <div className="welcome">
      <TerminalWindow className="welcome-term" title="4seas — training — 120×30" right={<span className="mono-dim">zsh</span>}>
        <div className="welcome-panel">
          <div className="welcome-side">
            <BrandMark size={96} />
            <p className="welcome-hello">{t(language, "Welcome back, team!", "ยินดีต้อนรับทีม 4Seas!")}</p>
            <p className="mono-dim">4Seas Nimman · Chiang Mai</p>
          </div>
          <div className="welcome-main">
            <Cmd>{typed}{!done && <Cursor />}</Cmd>
            <div className={`welcome-output${done ? " is-shown" : ""}`}>
              <p><Check size={22} /> {t(language, "Scenario loaded: guest-communication", "โหลดสถานการณ์: การสื่อสารกับแขก")}</p>
              <p><Check size={22} /> {t(language, "Five-part prompt formula ready", "สูตรพรอมป์ 5 ส่วนพร้อมแล้ว")}</p>
              <p><Check size={22} /> {t(language, "Prompt Battle armed — no AI judge, you vote", "Prompt Battle พร้อม — ไม่มี AI ตัดสิน ทุกคนโหวตเอง")}</p>
            </div>
            <h1 className="welcome-title">Prompt Engineering</h1>
            <p className="welcome-subtitle">{t(language, "How to communicate better with AI", "สื่อสารกับ AI ให้ได้ผลลัพธ์ที่ดีขึ้น")}</p>
            {done && <Cmd><Cursor /></Cmd>}
          </div>
        </div>
      </TerminalWindow>
    </div>
  </SlideFrame>;
}

// -------------------------------------------------------- 02 Five-part formula

function FormulaSlide({ step, language }: SlideProps) {
  const [picked, setPicked] = useState<number | null>(null);
  useEffect(() => setPicked(null), [step]);
  const expanded = picked ?? (step > 0 ? step - 1 : -1);
  return <SlideFrame kicker={t(language, "the formula", "สูตรพรอมป์")} number={2} language={language}>
    <div className="formula">
      <div className="slide-heading">
        <p className="slide-eyebrow">// {t(language, "five parts of a clear prompt", "5 ส่วนของพรอมป์ที่ชัดเจน")}</p>
        <h2>The Five-Part Prompt Formula</h2>
      </div>
      <div className="formula-cards">
        {FIVE_PARTS.map((part, index) => {
          const revealed = index < step;
          const open = revealed && index === expanded;
          return <button key={part.key} className={`formula-card${revealed ? " is-revealed" : ""}${open ? " is-open" : ""}`}
            onClick={() => revealed && setPicked(open ? -1 : index)} disabled={!revealed} aria-expanded={open}>
            <span className="formula-num">0{index + 1}</span>
            <span className="formula-name">{revealed ? part.en : "?"}</span>
            {revealed && <span className="formula-th">{part.th}</span>}
            <span className="formula-detail">
              <span className="formula-explain">{t(language, part.explainEn, part.explainTh)}</span>
              <code className="formula-example">{part.example}</code>
            </span>
          </button>;
        })}
      </div>
      <p className="formula-hint mono-dim">{step < 5 ? `> ${t(language, "presenter: press → to reveal the next part", "ผู้สอน: กด → เพื่อเปิดส่วนถัดไป")}` : `> context + goal + audience + constraints + format = ${t(language, "a clear brief", "บรีฟที่ชัดเจน")}`}</p>
    </div>
  </SlideFrame>;
}

// ------------------------------------------------------ 03 Bad vs good prompt

const GOOD_SEGMENTS: Array<{ text: string; key?: ChecklistKey }> = [
  { text: "You are a hotel receptionist.", key: "context" },
  { text: " Write a " },
  { text: "polite", key: "audience" },
  { text: " " },
  { text: "English message", key: "format" },
  { text: " " },
  { text: "explaining a 30-minute room delay and offer a complimentary drink.", key: "goal" },
  { text: " " },
  { text: "Keep it under 80 words.", key: "constraints" },
];

function CompareSlide({ step, language }: SlideProps) {
  return <SlideFrame kicker={t(language, "compare", "เปรียบเทียบ")} number={3} language={language}>
    <div className="compare">
      <div className="slide-heading"><p className="slide-eyebrow">// {t(language, "same task, two prompts", "งานเดียวกัน สองพรอมป์")}</p><h2>Bad Prompt vs Good Prompt</h2></div>
      <div className="compare-grid">
        <TerminalWindow className="compare-term compare-term--bad" title="prompt_v1.txt" right={<span className="badge badge--bad"><X size={16} />vague</span>}>
          <p className="compare-prompt">"Write a message to a guest."</p>
          <ul className="compare-issues">
            <li><X size={18} />{t(language, "Who is writing? No role or situation", "ใครเป็นคนเขียน? ไม่มีบทบาทหรือสถานการณ์")}</li>
            <li><X size={18} />{t(language, "What message? No goal", "ข้อความเรื่องอะไร? ไม่มีเป้าหมาย")}</li>
            <li><X size={18} />{t(language, "No tone, length, or language", "ไม่บอกน้ำเสียง ความยาว หรือภาษา")}</li>
          </ul>
        </TerminalWindow>
        <TerminalWindow className="compare-term compare-term--good" title="prompt_v2.txt" right={<span className="badge badge--good"><Check size={16} />specific</span>}>
          <p className={`compare-prompt${step >= 1 ? " is-marked" : ""}`}>"{GOOD_SEGMENTS.map((segment, index) => segment.key
            ? <mark key={index} className={`hl hl--${segment.key}`} data-label={FIVE_PARTS.find((part) => part.key === segment.key)?.en}>{segment.text}</mark>
            : <span key={index}>{segment.text}</span>)}"</p>
          <ul className={`compare-why${step >= 2 ? " is-shown" : ""}`}>
            {FIVE_PARTS.map((part) => <li key={part.key}><span className={`dot dot--${part.key}`} /><b>{part.en}</b>{t(language, part.explainEn, part.explainTh)}</li>)}
          </ul>
        </TerminalWindow>
      </div>
      <p className="compare-takeaway">{step >= 2
        ? t(language, "The second prompt tells the AI who it is, what to write, for whom, and within what limits — so the first draft is usable.", "พรอมป์ที่สองบอก AI ว่าเป็นใคร ต้องเขียนอะไร ให้ใคร และภายใต้ขอบเขตอะไร จึงได้ร่างแรกที่ใช้ได้ทันที")
        : <span className="mono-dim">&gt; {t(language, "what is different? press → to highlight", "ต่างกันตรงไหน? กด → เพื่อไฮไลต์")}</span>}</p>
    </div>
  </SlideFrame>;
}

// ----------------------------------------------------------- 04 Prompt anatomy

const ANATOMY: Array<{ key: ChecklistKey; lines: string[] }> = [
  { key: "context", lines: ["You are the front-desk assistant at 4Seas Nimman,", "a boutique hotel in Chiang Mai."] },
  { key: "goal", lines: ["Write a message telling a guest their room will be ready", "in about 30 minutes, and offer a complimentary drink."] },
  { key: "audience", lines: ["The guest has just arrived after a long trip and may be tired."] },
  { key: "constraints", lines: ["Be warm and apologetic. Keep it under 80 words.", "Do not promise an exact time."] },
  { key: "format", lines: ["Reply in English: a greeting, two short sentences,", "and a friendly closing line."] },
];

function AnatomySlide({ step, language }: SlideProps) {
  let lineNumber = 0;
  return <SlideFrame kicker={t(language, "anatomy", "โครงสร้าง")} number={4} language={language}>
    <div className="anatomy">
      <div className="slide-heading"><p className="slide-eyebrow">// {t(language, "a complete prompt, dissected", "ผ่าพรอมป์ที่สมบูรณ์")}</p><h2>Prompt Anatomy</h2></div>
      <div className="anatomy-grid">
        <TerminalWindow className="anatomy-editor" title="guest_delay.prompt" right={<span className="mono-dim">UTF-8 · {ANATOMY.reduce((sum, block) => sum + block.lines.join(" ").split(/\s+/).length, 0)} words</span>}>
          <div className="code">
            {ANATOMY.map((block, blockIndex) => {
              const shown = blockIndex < step;
              return <div key={block.key} className={`code-block code-block--${block.key}${shown ? " is-on" : ""}`}>
                {block.lines.map((line) => {
                  lineNumber += 1;
                  return <div className="code-line" key={line}><span className="code-ln">{lineNumber}</span><span className="code-text">{line}</span></div>;
                })}
                <span className="code-tag">{blockIndex + 1}</span>
              </div>;
            })}
          </div>
        </TerminalWindow>
        <ol className="anatomy-notes">
          {ANATOMY.map((block, index) => {
            const part = FIVE_PARTS.find((item) => item.key === block.key)!;
            return <li key={block.key} className={`anatomy-note anatomy-note--${block.key}${index < step ? " is-on" : ""}`}>
              <span className="anatomy-badge">{index + 1}</span>
              <div><b>{part.en}<small>{part.th}</small></b><p>{t(language, part.questionEn, part.questionTh)}</p></div>
            </li>;
          })}
        </ol>
      </div>
    </div>
  </SlideFrame>;
}

// ------------------------------------------------------ 05 Live challenge

const activityLabel = (state: SessionState, language: Language) => ({
  waiting: t(language, "Waiting to start", "รอเริ่มกิจกรรม"),
  writing: t(language, "Submissions open", "เปิดรับพรอมป์"),
  writing_closed: t(language, "Submissions closed", "ปิดรับพรอมป์แล้ว"),
  battle: t(language, "Prompt Battle", "Prompt Battle"),
  results: t(language, "Results", "ผลการแข่งขัน"),
  feedback: t(language, "Weekly feedback", "แบบสอบถามประจำสัปดาห์"),
}[state.activity]);

function ChallengeSlide({ state, joinUrl, language }: SlideProps) {
  return <SlideFrame kicker={t(language, "live challenge", "โจทย์สด")} number={5} language={language}>
    <div className="challenge">
      <div className="challenge-main">
        <p className="slide-eyebrow">// week 01 · {WEEK01_CHALLENGE.titleEn.toLowerCase()}</p>
        <h2>Live Prompt Challenge</h2>
        <TerminalWindow className="challenge-term" title="challenge.md">
          <p className="challenge-scenario">{t(language, WEEK01_CHALLENGE.scenarioEn, WEEK01_CHALLENGE.scenarioTh)}</p>
          <Cmd>{t(language, "task", "โจทย์")}</Cmd>
          <p className="challenge-task">{t(language, WEEK01_CHALLENGE.taskEn, WEEK01_CHALLENGE.taskTh)}</p>
          <p className="challenge-rules mono-dim">max 3 attempts · self-check · pick your best · battle</p>
        </TerminalWindow>
        <div className="live-stats">
          <div className="live-stat"><span>{t(language, "participants", "ผู้เข้าร่วม")}</span><strong>{state.participantCount}</strong></div>
          <div className="live-stat"><span>{t(language, "submitted", "ส่งแล้ว")}</span><strong>{state.submittedCount}<small>/{state.participantCount}</small></strong></div>
          <div className="live-stat"><span>{t(language, "prompts", "พรอมป์ทั้งหมด")}</span><strong>{state.totalSubmissions}</strong></div>
          <div className={`live-stat live-stat--status is-${state.activity}`}><span>status</span><strong><i />{activityLabel(state, language)}</strong></div>
        </div>
      </div>
      <aside className="join-card">
        <p className="join-label">{t(language, "join on your phone", "เข้าร่วมด้วยมือถือ")}</p>
        <QRStamp value={joinUrl} size={300} />
        <p className="join-label">room code</p>
        <p className="join-code">{formatCode(state.code)}</p>
        <p className="join-url mono-dim">{joinUrl.replace(/^https?:\/\//, "").replace(/\/\?.*$/, "")}</p>
      </aside>
    </div>
  </SlideFrame>;
}

// ------------------------------------------------------------ 06 Prompt battle

export function battleTitle(battle: BattleView, state: SessionState, language: Language): string {
  if (battle.round === "final") return battle.sequence > 1 ? t(language, `Grand Final · Tie-break ${battle.sequence - 1}`, `รอบชิงชนะเลิศ · ตัดสินเสมอ ${battle.sequence - 1}`) : t(language, "Grand Final", "รอบชิงชนะเลิศ");
  const total = state.battles.filter((item) => item.round === "mini").length;
  return t(language, `Battle ${battle.sequence} of ${total}`, `แบทเทิล ${battle.sequence} จาก ${total}`);
}

export function statusLabel(battle: BattleView, language: Language): string {
  return {
    pending: t(language, "Ready — voting not open yet", "พร้อม — ยังไม่เปิดโหวต"),
    open: t(language, "Voting open", "เปิดโหวตอยู่"),
    closed: t(language, "Voting closed — awaiting reveal", "ปิดโหวตแล้ว — รอเปิดผล"),
    revealed: t(language, "Results revealed", "เปิดผลแล้ว"),
  }[battle.status];
}

/** Next sensible presenter command for the current battle state. */
export function nextCommand(state: SessionState): { command: BattleCommand; en: string; th: string } | null {
  const active = state.battles.find((battle) => battle.id === state.activeBattleId);
  if (!active) return null;
  if (active.status === "pending") return { command: "open_voting", en: "Start voting", th: "เปิดโหวต" };
  if (active.status === "open") return { command: "close_voting", en: "Close voting", th: "ปิดโหวต" };
  if (active.status === "closed") return { command: "reveal", en: "Reveal results", th: "เปิดผล" };
  if (active.round === "mini" && state.battles.some((battle) => battle.round === "mini" && battle.status === "pending")) return { command: "next_battle", en: "Next battle", th: "แบทเทิลถัดไป" };
  if (state.finalStatus === "ready") return { command: "start_final", en: "Start Grand Final", th: "เริ่มรอบชิง" };
  if (state.finalStatus === "tie") return { command: "start_tiebreak", en: "Start tie-break", th: "เริ่มรอบตัดสินเสมอ" };
  if (state.finalStatus === "complete" && state.activity !== "results") return { command: "show_results", en: "Show final leaderboard", th: "แสดงผลสุดท้าย" };
  return null;
}

function BattleSlide({ state, language, onCommand, busy }: SlideProps) {
  const battle = state.battles.find((item) => item.id === state.activeBattleId);
  if (!battle) {
    return <SlideFrame kicker="prompt battle" number={6} language={language}>
      <div className="battle-empty">
        <p className="slide-eyebrow">// {t(language, "peer voting", "โหวตโดยเพื่อนร่วมทีม")}</p>
        <h2>Prompt Battle</h2>
        <TerminalWindow title="battle.log" className="battle-empty-term">
          <Cmd>{t(language, "waiting for final prompts", "รอพรอมป์สุดท้ายจากทุกคน")}<Cursor /></Cmd>
          <p className="mono-dim">{state.finalSelectedCount} {t(language, "final prompts selected", "คนเลือกพรอมป์สุดท้ายแล้ว")} · {state.submittedCount} {t(language, "participants submitted", "คนส่งพรอมป์แล้ว")}</p>
          <ul className="battle-rules">
            <li>{t(language, "Prompts are grouped into battles of 3–4, shown anonymously.", "พรอมป์จะถูกจัดกลุ่มละ 3–4 และแสดงแบบไม่ระบุชื่อ")}</li>
            <li>{t(language, "Vote for the prompt you think works best. One vote, no changes.", "โหวตพรอมป์ที่คิดว่าดีที่สุด 1 เสียง เปลี่ยนไม่ได้")}</li>
            <li>{t(language, "You cannot vote in a battle that contains your own prompt.", "โหวตในแบทเทิลที่มีพรอมป์ของตัวเองไม่ได้")}</li>
          </ul>
        </TerminalWindow>
      </div>
    </SlideFrame>;
  }
  const revealed = battle.status === "revealed";
  const progress = battle.eligibleVoters ? Math.min(100, (battle.votesCast / battle.eligibleVoters) * 100) : 0;
  const next = onCommand ? nextCommand(state) : null;
  const dense = battle.entries.length > 4;
  return <SlideFrame kicker={battle.round === "final" ? "grand final" : "prompt battle"} number={6} language={language}>
    <div className="battle">
      <div className="battle-head">
        <div>
          <p className="slide-eyebrow">// {t(language, "community vote — not an AI score", "คะแนนจากการโหวต ไม่ใช่คะแนนจาก AI")}</p>
          <h2>{battle.round === "final" && <Crown size={44} className="battle-crown" />}{battleTitle(battle, state, language)}</h2>
        </div>
        <div className="battle-status">
          <span className={`status-chip is-${battle.status}`}><i />{statusLabel(battle, language)}</span>
          <div className="vote-progress" aria-label="votes cast">
            <div className="vote-progress-bar"><span style={{ width: `${progress}%` }} /></div>
            <span><b>{battle.votesCast}</b>/{battle.eligibleVoters} {t(language, "votes", "เสียง")}</span>
          </div>
        </div>
      </div>
      <div className={`battle-grid battle-grid--${Math.min(battle.entries.length, 4)}${dense ? " is-dense" : ""}`}>
        {battle.entries.map((entry) => {
          const share = revealed && battle.votesCast ? ((entry.result?.votes ?? 0) / battle.votesCast) * 100 : 0;
          // Step the font down for longer prompts (and narrower 4-up columns) so text fits without scrolling.
          const length = entry.promptText.length * (battle.entries.length >= 4 ? 1.35 : 1);
          const size = length <= 200 ? 1 : length <= 340 ? 2 : length <= 560 ? 3 : 4;
          return <article key={entry.id} className={`battle-card${revealed && entry.result?.isWinner ? " is-winner" : ""}${revealed && !entry.result?.isWinner ? " is-dim" : ""}`}>
            <header className="battle-card-head"><WindowDots /><span className="battle-label">prompt_{entry.label}</span>{revealed && entry.result?.isWinner && <span className="winner-badge"><Trophy size={16} />{battle.tie ? t(language, "tie", "เสมอ") : t(language, "winner", "ชนะ")}</span>}</header>
            <p className={`battle-prompt battle-prompt--${size}`}>{entry.promptText}</p>
            <footer className="battle-card-foot">
              {revealed && entry.result ? <>
                <div className="result-bar"><span style={{ width: `${share}%` }} /></div>
                <div className="result-meta"><b>{entry.result.votes}</b> {t(language, "votes", "เสียง")} · <b>{entry.result.score}</b> {t(language, "score", "คะแนน")}<span className="result-author">— {entry.result.nickname}</span></div>
              </> : <span className="mono-dim">{t(language, "author hidden", "ซ่อนชื่อผู้เขียน")}</span>}
            </footer>
          </article>;
        })}
      </div>
      <div className="battle-foot">
        <p className="mono-dim">{revealed
          ? (battle.resolutionNote || (battle.tie ? t(language, "Tie: every tied prompt advances unless the presenter decides otherwise.", "เสมอ: พรอมป์ที่เสมอทั้งหมดได้เข้ารอบ เว้นแต่ผู้สอนจะตัดสินเป็นอย่างอื่น") : `score = votes ÷ ${battle.eligibleVoters} ${t(language, "eligible voters", "ผู้มีสิทธิ์โหวต")} × 100`))
          : t(language, "Competitors in this battle cannot vote in it. Everyone else: vote on your phone.", "เจ้าของพรอมป์ในแบทเทิลนี้โหวตไม่ได้ คนอื่นโหวตผ่านมือถือได้เลย")}</p>
        {next && <button className="btn btn--accent btn--lg" disabled={busy} onClick={() => onCommand?.(next.command)}>{t(language, next.en, next.th)}</button>}
      </div>
    </div>
  </SlideFrame>;
}

// ------------------------------------------------------------ 07 Final results

function ResultsSlide({ state, language, onCommand, busy }: SlideProps) {
  const complete = state.finalStatus === "complete";
  const champion = state.champions[0];
  const rows = state.leaderboard.slice(0, 7);
  const next = onCommand ? nextCommand(state) : null;
  return <SlideFrame kicker={t(language, "final results", "ผลสุดท้าย")} number={7} language={language}>
    {complete && champion ? <div className="results">
      <div className="results-left">
        <p className="slide-eyebrow">// {state.champions.length > 1 ? t(language, "shared champions", "แชมป์ร่วม") : t(language, "champion prompt", "พรอมป์แชมป์")}</p>
        <TerminalWindow className="champion-term" title="winner.prompt" right={<span className="badge badge--good"><Trophy size={16} />#1</span>}>
          <p className="champion-names"><Crown size={34} />{state.champions.map((item) => item.nickname).join(" & ")}</p>
          <p className="champion-prompt">{champion.promptText}</p>
          {state.champions.length > 1 && <p className="mono-dim">+ {state.champions.length - 1} {t(language, "more tied prompt(s) share the title", "พรอมป์ที่เสมอกันได้แชมป์ร่วม")}</p>}
        </TerminalWindow>
        <ul className="takeaways">
          <li><span>01</span>{t(language, "Give context and a role before the task.", "ให้บริบทและบทบาทก่อนสั่งงาน")}</li>
          <li><span>02</span>{t(language, "Name the goal, the reader, and the tone.", "บอกเป้าหมาย ผู้อ่าน และน้ำเสียง")}</li>
          <li><span>03</span>{t(language, "Set limits and a format — then iterate.", "กำหนดขอบเขตและรูปแบบ แล้วปรับให้ดีขึ้น")}</li>
        </ul>
      </div>
      <div className="results-right">
        <h2 className="results-title">{t(language, "Final Rankings", "อันดับสุดท้าย")}</h2>
        {rows.length ? <table className="rank-table">
          <thead><tr><th>#</th><th>{t(language, "name", "ชื่อ")}</th><th>{t(language, "stage", "รอบ")}</th><th>{t(language, "votes", "โหวต")}</th><th>{t(language, "score", "คะแนน")}</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.participantId} className={`is-${row.stage}`}>
            <td>{row.rank}</td>
            <td>{row.nickname}</td>
            <td>{row.stage === "champion" ? "champion" : row.stage === "finalist" ? "finalist" : "battle"}</td>
            <td>{row.finalVotes !== null ? `${row.finalVotes}/${row.finalEligible}` : `${row.battleVotes}/${row.battleEligible}`}</td>
            <td>{row.finalScore ?? row.battleScore}</td>
          </tr>)}</tbody>
        </table> : <p className="mono-dim">{t(language, "The leaderboard appears when the presenter shows final results.", "ตารางอันดับจะแสดงเมื่อผู้สอนเปิดผลสุดท้าย")}</p>}
        <p className="mono-dim results-note">{t(language, "Scores show community preference (votes ÷ eligible voters × 100), not objective quality.", "คะแนนคือความชอบของกลุ่ม (โหวต ÷ ผู้มีสิทธิ์ × 100) ไม่ใช่คุณภาพที่วัดแบบตายตัว")}</p>
        {next && <button className="btn btn--accent btn--lg" disabled={busy} onClick={() => onCommand?.(next.command)}>{t(language, next.en, next.th)}</button>}
      </div>
    </div> : <div className="battle-empty">
      <p className="slide-eyebrow">// {t(language, "final results", "ผลสุดท้าย")}</p>
      <h2>Final Results</h2>
      <TerminalWindow title="results.log" className="battle-empty-term">
        <Cmd>{t(language, "awaiting grand final", "รอรอบชิงชนะเลิศ")}<Cursor /></Cmd>
        <p className="mono-dim"><Users size={18} /> {state.participantCount} {t(language, "participants", "ผู้เข้าร่วม")} · {state.battles.filter((battle) => battle.status === "revealed").length}/{state.battles.length} {t(language, "battles revealed", "แบทเทิลเปิดผลแล้ว")}</p>
        {next && <button className="btn btn--accent btn--lg" disabled={busy} onClick={() => onCommand?.(next.command)}>{t(language, next.en, next.th)}</button>}
      </TerminalWindow>
    </div>}
  </SlideFrame>;
}
