import { ArrowRight } from "lucide-react";
import { API_MODE } from "../api/store";
import { ThreadArt } from "./ThreadArt";

/** Minimal hero: the threads are the art; the foreground is one claim, one sentence, two actions. */
export function Hero() {
  return (
    <section className="sc-hero" id="top">
      <ThreadArt />
      <div className="sc-hero-veil" aria-hidden />
      <div className="sc-wrap sc-hero-inner">
        <p className="sc-hero-kicker">ERP for engineering, panel and field-service firms</p>
        <h1 className="sc-hero-title t-display">
          Every job, one <span className="sc-hero-accent">unbroken thread.</span>
        </h1>
        <p className="sc-hero-lede">
          Threadline carries a job from the first enquiry to the installed asset and its service contract, with cost, people and approvals on the same record.
        </p>
        <div className="sc-hero-ctas">
          <a className="btn btn-primary btn-lg sc-cta" href="#/app/dashboard">
            Open the live demo <ArrowRight size={18} aria-hidden />
          </a>
          <a
            className="btn btn-inverse btn-lg"
            href="#/?s=thread"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById("thread")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Follow one job
          </a>
        </div>
        <p className="sc-hero-facts">
          <span>11 modules</span>
          <span>7 business verticals</span>
          <span>12 end-to-end flows</span>
          <span>{API_MODE === "remote" ? "Sign in with a demo account" : "Demo data, runs in your browser"}</span>
        </p>
      </div>
    </section>
  );
}
