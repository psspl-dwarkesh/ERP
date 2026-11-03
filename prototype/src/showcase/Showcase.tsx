import { ArrowRight, Menu as MenuIcon, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Logo } from "../app/brand";
import { useRoute } from "../app/router";
import { CountUp, Reveal } from "./motion";
import { Flows } from "./Flows";
import { Hero } from "./Hero";
import { JobThread } from "./JobThread";
import { ModuleMap } from "./ModuleMap";
import { Controls, Delivery, Roles } from "./Sections";
import { Verticals } from "./Verticals";
import "./showcase.css";

const LINKS = [
  ["thread", "How it works"],
  ["modules", "Modules"],
  ["industries", "Industries"],
  ["flows", "Flows"],
  ["controls", "Controls"],
  ["delivery", "Delivery"],
] as const;

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header className={`sc-nav ${scrolled ? "is-scrolled" : ""} ${open ? "is-open" : ""}`}>
      <div className="sc-wrap sc-nav-inner">
        <a href="#/" className="sc-nav-brand" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
          <Logo inverse={!scrolled} />
        </a>
        <nav className="sc-nav-links" aria-label="Sections">
          {LINKS.map(([id, label]) => (
            <a key={id} href={`#/?s=${id}`} onClick={(e) => { e.preventDefault(); setOpen(false); scrollTo(id); }}>
              {label}
            </a>
          ))}
        </nav>
        <div className="sc-nav-end">
          <a className="btn btn-primary btn-sm" href="#/app/dashboard">
            Open live demo <ArrowRight size={14} aria-hidden />
          </a>
          <button className="sc-nav-toggle icon-btn" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? <X size={18} /> : <MenuIcon size={18} />}
          </button>
        </div>
      </div>
    </header>
  );
}

function Proof() {
  const items: [number, string, string][] = [
    [11, "", "connected modules in one release"],
    [7, "", "business verticals on one data model"],
    [219, "", "scope requirements mapped to screens"],
    [12, "", "end-to-end flows across modules"],
    [200, "+", "named users planned for"],
  ];
  return (
    <section className="sc-proof" aria-label="Scope at a glance">
      <div className="sc-wrap sc-proof-inner">
        {items.map(([n, s, l]) => (
          <div key={l} className="sc-proof-item">
            <span className="sc-proof-n t-display">
              <CountUp to={n} suffix={s} />
            </span>
            <span className="sc-proof-l">{l}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="sc-final">
      <div className="sc-grid-bg" aria-hidden />
      <Reveal className="sc-wrap sc-final-inner">
        <h2 className="sc-h2 t-display">See PRJ-0264 for yourself</h2>
        <p className="sc-lede">Approve the requisition, try to issue held stock, move the panel through its stages and dispatch an engineer to the P1 ticket. It's all running in your browser.</p>
        <div className="sc-hero-ctas">
          <a className="btn btn-primary btn-lg sc-cta" href="#/app/dashboard">
            Open the live demo <ArrowRight size={18} aria-hidden />
          </a>
          <a className="btn btn-inverse btn-lg" href="#/app/projects/PRJ-0264">
            Start at the project
          </a>
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  return (
    <footer className="sc-footer">
      <div className="sc-wrap sc-footer-inner">
        <Logo />
        <p>Threadline is a demonstration ERP designed and engineered by Prakash Infotech. Records shown belong to a fictional ABC Limited workspace and are illustrative only.</p>
        <p className="sc-footer-meta">Prototype v1.0 · November 2026</p>
      </div>
    </footer>
  );
}

export default function Showcase() {
  const route = useRoute();
  useEffect(() => {
    document.title = "Threadline · One connected ERP for engineering, panels and field service";
  }, []);
  // Deep link to a section: #/?s=flows
  useEffect(() => {
    const s = route.query.get("s");
    if (s) setTimeout(() => scrollTo(s), 60);
  }, [route.query]);
  // Dev-only: #/?only=flows renders a single section for visual checks.
  const only = import.meta.env.DEV ? route.query.get("only") : null;
  if (only) {
    const one: Record<string, ReactNode> = { thread: <JobThread />, modules: <ModuleMap />, industries: <Verticals />, flows: <Flows />, controls: <Controls />, roles: <Roles />, delivery: <Delivery />, final: <FinalCta /> };
    return <div className="sc">{one[only]}</div>;
  }
  return (
    <div className="sc">
      <Nav />
      <main>
        <Hero />
        <Proof />
        <JobThread />
        <ModuleMap />
        <Verticals />
        <Flows />
        <Controls />
        <Roles />
        <Delivery />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
