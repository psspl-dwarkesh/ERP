import { ArrowRight, ArrowUpRight, Github, Linkedin, Mail, MapPin, Menu as MenuIcon, Phone, X } from "lucide-react";
import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Logo } from "../app/brand";
import { navigate, useRoute } from "../app/router";
import { Reveal } from "./motion";
import { Flows } from "./Flows";
import { Hero } from "./Hero";
import { JobThread } from "./JobThread";
import { ModuleMap } from "./ModuleMap";
import { Preview } from "./Preview";
import { Controls, Delivery } from "./Sections";
import { Verticals } from "./Verticals";
import "./showcase.css";

const CaseStudy = lazy(() => import("./CaseStudy"));

type Page = "home" | "case-study";

/** Section links on the product tour, plus the case study page. */
const LINKS: { id: string; label: string }[] = [
  { id: "thread", label: "How it works" },
  { id: "modules", label: "Modules" },
  { id: "industries", label: "Industries" },
  { id: "flows", label: "Flows" },
  { id: "controls", label: "Controls" },
  { id: "case-study", label: "Case study" },
];

const NAV_OFFSET = 88;

function scrollToSection(id: string, behavior: ScrollBehavior = "smooth") {
  const el = document.getElementById(id);
  if (!el) return;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - NAV_OFFSET + 8, behavior });
}

/** Which tour section sits under the reading line (35% down the viewport). */
function useActiveSection(page: Page) {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(page === "case-study" ? "case-study" : null);
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      setScrolled(window.scrollY > 12);
      if (page === "case-study") {
        setActive("case-study");
        return;
      }
      const line = window.innerHeight * 0.35;
      let hit: string | null = null;
      for (const { id } of LINKS) {
        const el = document.getElementById(id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top <= line && r.bottom > line) hit = id;
      }
      setActive(hit);
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      cancelAnimationFrame(raf);
    };
  }, [page]);
  return { scrolled, active };
}

function Nav({ page }: { page: Page }) {
  const { scrolled, active } = useActiveSection(page);
  const [open, setOpen] = useState(false);
  const linksRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [ind, setInd] = useState<{ x: number; w: number } | null>(null);

  // Slide the indicator under the active link; re-measure when fonts or widths change.
  const place = useCallback(() => {
    const box = linksRef.current;
    const a = active && box?.querySelector<HTMLElement>(`[data-id="${active}"]`);
    setInd(a ? { x: a.offsetLeft, w: a.offsetWidth } : null);
  }, [active]);
  useLayoutEffect(place, [place]);
  useEffect(() => {
    const box = linksRef.current;
    if (!box || !("ResizeObserver" in window)) return;
    const ro = new ResizeObserver(place);
    ro.observe(box);
    return () => ro.disconnect();
  }, [place]);

  // Mobile menu: close on Escape, outside click, or widening past the breakpoint.
  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>("a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !toggleRef.current?.contains(t)) setOpen(false);
    };
    const mq = window.matchMedia("(min-width: 1081px)");
    const onMq = () => mq.matches && setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    mq.addEventListener("change", onMq);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
      mq.removeEventListener("change", onMq);
    };
  }, [open]);

  const go = (id: string) => (e: MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    if (id === "case-study") navigate("/case-study");
    else if (page === "home") scrollToSection(id);
    else navigate(`/?s=${id}`);
  };
  const hrefFor = (id: string) => (id === "case-study" ? "#/case-study" : `#/?s=${id}`);

  return (
    <header className={`sc-nav ${scrolled || open ? "is-floating" : ""} ${open ? "is-open" : ""}`}>
      <div className="sc-nav-bar">
        <a
          href="#/"
          className="sc-nav-brand"
          aria-label="Threadline, product tour"
          onClick={(e) => {
            e.preventDefault();
            setOpen(false);
            if (page === "home") window.scrollTo({ top: 0, behavior: "smooth" });
            else navigate("/");
          }}
        >
          <Logo inverse={scrolled || open} />
        </a>
        <nav className="sc-nav-links" aria-label="Product tour" ref={linksRef}>
          <span className={`sc-nav-ind ${ind ? "is-on" : ""}`} style={ind ? { transform: `translateX(${ind.x}px)`, width: ind.w } : undefined} aria-hidden />
          {LINKS.map((l) => (
            <a key={l.id} data-id={l.id} href={hrefFor(l.id)} onClick={go(l.id)} className={active === l.id ? "is-active" : ""} aria-current={active === l.id ? (l.id === "case-study" ? "page" : "location") : undefined}>
              {l.label}
            </a>
          ))}
        </nav>
        <div className="sc-nav-end">
          <a className="btn btn-primary btn-sm sc-nav-cta" href="#/app/dashboard">
            <span>Open live demo</span> <ArrowRight size={14} aria-hidden />
          </a>
          <button ref={toggleRef} className="sc-nav-toggle" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="sc-nav-panel" onClick={() => setOpen((o) => !o)}>
            {open ? <X size={18} aria-hidden /> : <MenuIcon size={18} aria-hidden />}
          </button>
        </div>
      </div>
      <div className="sc-nav-panel" id="sc-nav-panel" ref={panelRef} hidden={!open}>
        <nav aria-label="Product tour, menu">
          {LINKS.map((l) => (
            <a key={l.id} href={hrefFor(l.id)} onClick={go(l.id)} className={active === l.id ? "is-active" : ""} aria-current={active === l.id ? "location" : undefined}>
              {l.label}
              <ArrowRight size={15} aria-hidden />
            </a>
          ))}
        </nav>
        <a className="btn btn-primary btn-block" href="#/app/dashboard">
          Open the live demo <ArrowRight size={16} aria-hidden />
        </a>
      </div>
    </header>
  );
}

function FinalCta() {
  return (
    <section className="sc-final">
      <Reveal className="sc-wrap sc-final-inner">
        <h2 className="sc-h2 t-display">See PRJ-0264 for yourself</h2>
        <p className="sc-lede">Approve the requisition, try to issue held stock, move the panel through its stages and dispatch an engineer to the P1 ticket.</p>
        <div className="sc-hero-ctas">
          <a className="btn btn-primary btn-lg sc-cta" href="#/app/dashboard">
            Open the live demo <ArrowRight size={18} aria-hidden />
          </a>
          <a className="btn btn-inverse btn-lg" href="#/app/projects/PRJ-0264">
            Start at the project
          </a>
        </div>
        <a className="sc-final-link" href="#/case-study">
          Or read how it was designed and built <ArrowRight size={14} aria-hidden />
        </a>
      </Reveal>
    </section>
  );
}

function Footer() {
  return (
    <footer className="sc-footer">
      <div className="sc-wrap">
        <div className="sc-footer-grid">
          <div className="sc-footer-brand">
            <Logo />
            <p className="sc-footer-note">
              A working product from Prakash Software Solutions: one connected ERP for engineering,
              panel-manufacturing and field-service firms. Every record inside belongs to a fictional sample
              workspace.
            </p>
            <div className="sc-footer-social">
              <a href="https://www.linkedin.com/company/prakash-software-solutions-pvt--ltd/" target="_blank" rel="noreferrer noopener" aria-label="Prakash Software Solutions on LinkedIn">
                <Linkedin size={16} aria-hidden />
              </a>
              <a href="https://github.com/prakashinfotech/" target="_blank" rel="noreferrer noopener" aria-label="Prakash Software Solutions on GitHub">
                <Github size={16} aria-hidden />
              </a>
            </div>
          </div>

          <div className="sc-footer-col">
            <p className="sc-footer-head">Designed and built by</p>
            <a className="sc-footer-org" href="https://prakashinfotech.com" target="_blank" rel="noreferrer noopener">
              Prakash Software Solutions Pvt. Ltd. <ArrowUpRight size={14} aria-hidden />
            </a>
            <p>Software engineering since 2000. ISO 9001 and ISO 27001 certified, and a Microsoft Solutions Partner for Data &amp; AI and for Digital &amp; App Innovation.</p>
            <p>Development centres in Vadodara, Ahmedabad and Indore, with client teams across the US, Europe and Asia.</p>
          </div>

          <div className="sc-footer-col">
            <p className="sc-footer-head">Talk to us</p>
            <a className="sc-footer-contact" href="mailto:info@prakashinfotech.com">
              <Mail size={15} aria-hidden /> info@prakashinfotech.com
            </a>
            <a className="sc-footer-contact" href="tel:+918799465558">
              <Phone size={15} aria-hidden /> +91 87994 65558
            </a>
            <p className="sc-footer-address">
              <MapPin size={15} aria-hidden />
              <span>
                601 Ananta Stallion, Gotri&ndash;Sevasi Road,
                <br />
                Vadodara 391101, Gujarat, India
              </span>
            </p>
          </div>

          <div className="sc-footer-col">
            <p className="sc-footer-head">This demonstration</p>
            <a href="#/">Product tour</a>
            <a href="#/case-study">Case study</a>
            <a href="#/app/dashboard">Live demo</a>
            <a href="mailto:info@prakashinfotech.com?subject=Threadline%20demo">Request a walkthrough</a>
          </div>
        </div>

        <div className="sc-footer-bar">
          <p className="sc-footer-meta">&copy; 2026 Prakash Software Solutions Pvt. Ltd. &middot; CIN U72200GJ2001PTC039384</p>
          <p className="sc-footer-meta">Threadline prototype &middot; November 2026</p>
        </div>
      </div>
    </footer>
  );
}

function Home() {
  return (
    <>
      <Hero />
      <Preview />
      <JobThread />
      <ModuleMap />
      <Verticals />
      <Flows />
      <Controls />
      <Delivery />
      <FinalCta />
    </>
  );
}

export default function Showcase() {
  const route = useRoute();
  const page: Page = route.path[0] === "case-study" ? "case-study" : "home";
  const lastPage = useRef<Page | null>(null);

  useEffect(() => {
    document.title = page === "case-study" ? "Case study · Threadline" : "Threadline · One connected ERP for engineering, panels and field service";
  }, [page]);

  // The router keeps scroll position inside the showcase; a new page starts at the top,
  // and a deep link (#/?s=flows) lands on its section.
  const s = route.query.get("s");
  useLayoutEffect(() => {
    const changed = lastPage.current !== null && lastPage.current !== page;
    lastPage.current = page;
    if (changed && !s) window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [page, s]);
  useEffect(() => {
    if (!s || page !== "home") return;
    const t = setTimeout(() => scrollToSection(s, window.scrollY < 40 ? "smooth" : "instant"), 60);
    return () => clearTimeout(t);
  }, [s, page, route.query]);

  // Dev-only: #/?only=flows renders a single section for visual checks.
  const only = import.meta.env.DEV ? route.query.get("only") : null;
  if (only && page === "home") {
    const one: Record<string, ReactNode> = { hero: <Hero />, preview: <Preview />, thread: <JobThread />, modules: <ModuleMap />, industries: <Verticals />, flows: <Flows />, controls: <Controls />, delivery: <Delivery />, final: <FinalCta /> };
    return <div className="sc">{one[only]}</div>;
  }
  return (
    <div className="sc">
      <a className="sc-skip" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById("main")?.focus(); }}>
        Skip to content
      </a>
      <Nav page={page} />
      <main id="main" tabIndex={-1}>
        {page === "case-study" ? (
          <Suspense fallback={<div className="cs-fallback" aria-busy="true" />}>
            <CaseStudy />
          </Suspense>
        ) : (
          <Home />
        )}
      </main>
      <Footer />
    </div>
  );
}
