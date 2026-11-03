import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { SHOTS } from "./shots";

const PICKS = ["dashboard", "project", "rfq", "service"] as const;

/** Real screens from the current build, one at a time. Replaces the old animated console mock. */
export function Preview() {
  const shots = PICKS.map((k) => SHOTS[k]);
  const [k, setK] = useState<(typeof PICKS)[number]>("dashboard");
  const shot = SHOTS[k];
  // Warm the next image when a tab is hovered or focused, so switching never shows an empty frame.
  const warm = (src: string) => {
    const img = new Image();
    img.src = src;
  };
  return (
    <section className="sc-section sc-preview" id="preview" aria-labelledby="sc-preview-title">
      <div className="sc-wrap">
        <div className="sc-head sc-head-split">
          <div>
            <h2 className="sc-h2 t-display" id="sc-preview-title">The workspace, as it is today</h2>
            <p className="sc-lede">Screens from the running demo, not mock-ups. Pick one, then open it and try the actions yourself.</p>
          </div>
          <div className="sc-preview-tabs" role="tablist" aria-label="Screens">
            {shots.map((s) => (
              <button
                key={s.key}
                role="tab"
                aria-selected={s.key === k}
                className={`sc-preview-tab ${s.key === k ? "is-active" : ""}`}
                onClick={() => setK(s.key as (typeof PICKS)[number])}
                onPointerEnter={() => warm(s.src)}
                onFocus={() => warm(s.src)}
              >
                {s.short}
              </button>
            ))}
          </div>
        </div>
        <figure className="sc-frame" role="tabpanel" aria-label={shot.title}>
          <div className="sc-frame-bar" aria-hidden>
            <span className="sc-frame-dots">
              <i />
              <i />
              <i />
            </span>
            <span className="sc-frame-url mono">{shot.route.replace(/^#/, "threadline")}</span>
          </div>
          <img key={shot.key} className="sc-frame-img" src={shot.src} width={shot.w} height={shot.h} alt={shot.alt} loading="lazy" decoding="async" />
          <figcaption className="sc-frame-cap">
            <span>
              <b>{shot.title}.</b> {shot.caption}
            </span>
            <a className="btn btn-secondary btn-sm" href={shot.route}>
              Open this screen <ArrowRight size={14} aria-hidden />
            </a>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
