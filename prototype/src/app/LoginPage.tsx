import { ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound, LockKeyhole, Mail } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { demoAccounts, signIn, type DemoAccount } from "../api/session";
import { Avatar, Button, Callout, Field, Input } from "../ds/components";
import { Logo } from "./brand";
import { navigate, useRoute } from "./router";

/** Shown on the sign-in screen so reviewers can try every role. Disable server-side with DEMO_ACCOUNTS=false. */
const DEMO_PASSWORD = "Threadline@2026";

export function LoginPage() {
  const route = useRoute();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [accounts, setAccounts] = useState<DemoAccount[]>([]);

  useEffect(() => {
    document.title = "Sign in · Threadline";
    demoAccounts().then(setAccounts).catch(() => setAccounts([]));
  }, []);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Enter your work email and password.");
      return;
    }
    setPending(true);
    try {
      await signIn(email, password);
      // Return to where the user was headed, or the dashboard.
      const next = route.query.get("next");
      navigate(next && next.startsWith("/app") ? next : "/app/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setPending(false);
    }
  };

  const pick = (a: DemoAccount) => {
    setEmail(a.email);
    setPassword(DEMO_PASSWORD);
    setError(null);
  };

  return (
    <div className="login">
      <aside className="login-brand" aria-hidden>
        <div className="login-grid" />
        <svg className="login-thread" viewBox="0 0 600 800" preserveAspectRatio="none">
          <path d="M-20 620 C 120 620, 160 420, 300 420 S 460 260, 640 220" />
          <path className="login-thread-pulse" d="M-20 620 C 120 620, 160 420, 300 420 S 460 260, 640 220" />
        </svg>
        <Logo inverse />
        <div className="login-brand-copy">
          <p className="login-brand-title t-display">One job. Every handoff. One record.</p>
          <p className="login-brand-text">Projects, materials, panel assembly, installed assets and AMC service for ABC Limited, with approvals and an audit trail on every decision.</p>
        </div>
        <ul className="login-brand-facts">
          <li><b>11</b> modules</li>
          <li><b>7</b> verticals</li>
          <li><b>1</b> legal entity</li>
        </ul>
      </aside>

      <main className="login-main">
        <a className="login-back" href="#/">
          <ArrowLeft size={15} aria-hidden /> Product tour
        </a>
        <div className="login-card">
          <div className="login-head">
            <span className="login-icon">
              <LockKeyhole size={20} aria-hidden />
            </span>
            <h1 className="login-title">Sign in to ABC Limited</h1>
            <p className="login-sub">Use your work email. Sessions end after 12 hours or when you sign out.</p>
          </div>

          <form className="stack" onSubmit={submit} noValidate>
            <Field label="Work email" htmlFor="login-email">
              <Input id="login-email" icon={Mail} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@abc.example" autoFocus invalid={!!error} />
            </Field>
            <Field label="Password" htmlFor="login-password">
              <Input
                id="login-password"
                icon={KeyRound}
                type={show ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                invalid={!!error}
                suffix={
                  <button type="button" className="input-clear" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow((s) => !s)}>
                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                }
              />
            </Field>
            {error && (
              <Callout tone="risk" title="Couldn't sign you in">
                {error}
              </Callout>
            )}
            <Button type="submit" variant="primary" size="lg" block loading={pending} iconRight={ArrowRight}>
              Sign in
            </Button>
          </form>

          {accounts.length > 0 && (
            <div className="login-demo">
              <p className="login-demo-title">Demo accounts · one per role</p>
              <p className="login-demo-sub">
                Pick one to fill the form. Password <span className="mono">{DEMO_PASSWORD}</span>. Each role sees only what its permissions allow.
              </p>
              <ul className="login-accounts">
                {accounts.map((a) => (
                  <li key={a.email}>
                    <button type="button" className={`login-account ${email === a.email ? "is-on" : ""}`} onClick={() => pick(a)}>
                      <Avatar name={a.name} size="sm" />
                      <span className="login-account-text">
                        <b>{a.name}</b>
                        <small>{a.role}</small>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <p className="login-foot">Threadline demonstration workspace · illustrative data</p>
      </main>
    </div>
  );
}
