/**
 * "Ask Threadline". In the API build the question goes to POST /api/assist first; when the
 * server has Claude configured the answer is Claude's, grounded in records the user may
 * view. Otherwise (and always in the browser demo) the built-in matcher answers from the
 * same data. Every answer says which of the two produced it and lists the records it used.
 */
import { ArrowUp, BookOpenCheck, Calculator, CornerDownLeft, RotateCcw, Sparkles } from "lucide-react";
import { useId, useRef, useState, type FormEvent } from "react";
import { http } from "../../api/http";
import { ApiError } from "../../api/store";
import { API_MODE, moduleForId } from "../../api/client";
import { Button, Card, CardHeader, Input, RecordLink, Tag, Tooltip, cx } from "../../ds/components";
import { answerLocally, suggestions } from "./ask";
import type { Analysis, Dataset } from "./engine";
import { RefText, useCanOpen } from "./RefText";

type Source = "claude" | "local";
interface Exchange {
  id: number;
  question: string;
  text: string;
  points: string[];
  cites: string[];
  source: Source;
  model?: string;
  note?: string;
}

/** Remembered for the session: once the server says Claude isn't configured, stop asking it. */
let claudeState: "unknown" | "available" | "off" = API_MODE === "remote" ? "unknown" : "off";
let history: Exchange[] = [];
let seq = 0;

async function askServer(question: string): Promise<{ answer: string; points: string[]; citations: string[]; model: string } | null> {
  if (claudeState === "off") return null;
  try {
    const r = await http.post<{ answer: string; points: string[]; citations: string[]; model: string }>("/assist", { question });
    claudeState = "available";
    return r;
  } catch (e) {
    if (e instanceof ApiError && String(e.code) === "NOT_CONFIGURED") claudeState = "off";
    if (e instanceof ApiError && e.code === "UNAUTHENTICATED") throw e;
    throw e instanceof ApiError ? e : new ApiError("Claude couldn't be reached.", "NETWORK");
  }
}

export function AskPanel({ ds, analysis }: { ds: Dataset; analysis: Analysis }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Exchange[]>(history);
  const [pending, setPending] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const sugg = suggestions(ds, analysis);

  const push = (x: Exchange) => {
    history = [x, ...history].slice(0, 6);
    setItems(history);
  };

  const ask = async (question: string) => {
    const text = question.trim();
    if (!text || pending) return;
    setPending(text);
    setQ("");
    let note: string | undefined;
    try {
      const r = await askServer(text);
      if (r) {
        push({ id: ++seq, question: text, text: r.answer, points: r.points, cites: r.citations.filter((c) => moduleForId(c)), source: "claude", model: r.model });
        return;
      }
    } catch (e) {
      if (e instanceof ApiError && e.code === "UNAUTHENTICATED") return;
      note = "Claude couldn't answer just now, so this was computed from your ERP data instead.";
    } finally {
      setPending(null);
    }
    const a = answerLocally(text, ds, analysis);
    push({ id: ++seq, question: text, text: a.text, points: a.points, cites: a.cites, source: "local", note });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void ask(q);
  };

  const latest = items[0];
  const older = items.slice(1);

  return (
    <Card className="ins-ask" aria-labelledby={`${inputId}-title`}>
      <CardHeader
        icon={Sparkles}
        title={<span id={`${inputId}-title`}>Ask Threadline</span>}
        description={claudeState === "off" ? "Questions about the records your role can see. Answers are computed from your ERP data and cite every record they use." : "Questions about the records your role can see. Claude answers when the server has it configured; otherwise the answer is computed. Either way it cites its records."}
        actions={
          items.length > 0 ? (
            <Button
              size="sm"
              variant="ghost"
              icon={RotateCcw}
              onClick={() => {
                history = [];
                setItems([]);
                inputRef.current?.focus();
              }}
            >
              Clear
            </Button>
          ) : undefined
        }
      />
      <form className="ins-ask-form" onSubmit={submit}>
        <label htmlFor={inputId} className="sr-only">
          Ask a question about your ERP data
        </label>
        <Input ref={inputRef} id={inputId} icon={Sparkles} value={q} maxLength={400} onChange={(e) => setQ(e.target.value)} placeholder="Ask about a project, shortages, tickets, approvals, people or billing…" suffix={<span className="ins-ask-enter" aria-hidden><CornerDownLeft size={13} /></span>} />
        <Button type="submit" variant="primary" icon={ArrowUp} loading={!!pending} disabled={!q.trim()}>
          Ask
        </Button>
      </form>
      <div className="ins-sugg" role="group" aria-label="Suggested questions">
        {sugg.map((s) => (
          <button key={s} type="button" className="chip ins-sugg-chip" onClick={() => void ask(s)} disabled={!!pending}>
            {s}
          </button>
        ))}
      </div>

      <div className="ins-answers" aria-live="polite">
        {pending && (
          <div className="ins-answer is-pending" aria-busy="true">
            <p className="ins-q">{pending}</p>
            <div className="ins-thinking">
              <span />
              <span />
              <span />
            </div>
            <p className="ins-answer-meta">Reading the records your role can see…</p>
          </div>
        )}
        {!pending && latest && <AnswerView x={latest} />}
        {older.length > 0 && (
          <details className="ins-older">
            <summary>Earlier questions ({older.length})</summary>
            {older.map((x) => (
              <AnswerView key={x.id} x={x} compact />
            ))}
          </details>
        )}
      </div>
    </Card>
  );
}

function AnswerView({ x, compact }: { x: Exchange; compact?: boolean }) {
  const canOpen = useCanOpen();
  const cites = x.cites.filter(canOpen);
  const claude = x.source === "claude";
  return (
    <article className={cx("ins-answer", compact && "is-compact")}>
      <p className="ins-q">{x.question}</p>
      <p className="ins-a">
        <RefText text={x.text} />
      </p>
      {x.points.length > 0 && (
        <ul className="ins-points">
          {x.points.map((p, i) => (
            <li key={i}>
              <RefText text={p} />
            </li>
          ))}
        </ul>
      )}
      <div className="ins-answer-foot">
        <Tooltip content={claude ? `Written by Claude (${x.model}) from records your role can see. It can be wrong: check the cited records before acting.` : "Matched to a built-in question and calculated from records your role can see. No AI model is involved."}>
          <span tabIndex={0} className="ins-source">
            <Tag tone={claude ? "violet" : "accent"} icon={claude ? Sparkles : Calculator}>
              {claude ? "Answered by Claude from your ERP data" : "Computed from your ERP data"}
            </Tag>
          </span>
        </Tooltip>
        {cites.length > 0 && (
          <span className="ins-cites">
            <BookOpenCheck size={14} aria-hidden />
            <span className="sr-only">Sources:</span>
            {cites.map((c) => (
              <RecordLink key={c} id={c} quiet />
            ))}
          </span>
        )}
      </div>
      {x.note && <p className="ins-answer-meta">{x.note}</p>}
    </article>
  );
}
