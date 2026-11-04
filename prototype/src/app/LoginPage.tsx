import { ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound, LockKeyhole, Mail } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { demoAccounts, signIn, type DemoAccount } from "../api/session";
import { Avatar, Button, Callout, Field, Input } from "../ds/components";
import { ThreadArt } from "../showcase/ThreadArt";
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
    // #/login?as=<email> (from the showcase "open the demo as" links) pre-fills that demo account.
    const as = route.query.get("as")?.toLowerCase();
    demoAccounts()
      .then((list) => {
        setAccounts(list);
        const a = as && list.find((x) => x.email.toLowerCase() === as);
        if (a) {
          setEmail(a.email);
          setPassword(DEMO_PASSWORD);
        }
      })
      .catch(() => setAccounts([]));
  }, []);

  // Return to where the user was headed, or the dashboard.
  const afterSignIn = () => {
    const next = route.query.get("next");
    navigate(next && next.startsWith("/app") ? next : "/app/dashboard", { replace: true });
  };

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
      afterSignIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setPending(false);
    }
  };

  // One click on a demo role fills the form (for feedback) and signs straight in.
  const loginAs = async (a: DemoAccount) => {
    setEmail(a.email);
    setPassword(DEMO_PASSWORD);
    setError(null);
    setPending(true);
    try {
      await signIn(a.email, DEMO_PASSWORD);
      afterSignIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="login">
      <aside className="login-brand" aria-hidden>
        <ThreadArt align="xMaxYMid" parallax={false} />
        <Logo inverse />
        <div className="login-brand-copy">
          <p className="login-brand-title t-display">One job. Every handoff. One record.</p>
          <p className="login-brand-text">Projects, materials, panel assembly, installed assets and AMC service for Pinnacle Engineering, with approvals and an audit trail on every decision.</p>
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
            <h1 className="login-title">Sign in to Pinnacle Engineering</h1>
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
              <p className="login-demo-title">Sign in as a role</p>
              <p className="login-demo-sub">
                Click a role to sign in instantly. Each role sees only what its permissions allow.
              </p>
              <ul className="login-accounts">
                {accounts.map((a) => (
                  <li key={a.email}>
                    <button type="button" className={`login-account ${email === a.email ? "is-on" : ""}`} onClick={() => loginAs(a)} disabled={pending}>
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
        <p className="login-foot">Threadline, a Prakash Software Solutions product</p>
      </main>
    </div>
  );
}
