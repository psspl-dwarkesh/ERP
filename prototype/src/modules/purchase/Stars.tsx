import { Star, StarHalf } from "lucide-react";

/** Vendor rating out of 5, in half-star steps. */
export function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  const halves = Math.round(rating * 2);
  return (
    <span className="pur-stars" role="img" aria-label={`Rated ${rating.toFixed(1)} of 5`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const full = halves >= (i + 1) * 2;
        const half = !full && halves === i * 2 + 1;
        return (
          <span key={i} className="pur-star">
            <Star size={size} className="pur-star-empty" aria-hidden />
            {(full || half) && (half ? <StarHalf size={size} className="pur-star-fill" aria-hidden /> : <Star size={size} className="pur-star-fill" aria-hidden />)}
          </span>
        );
      })}
      <span className="pur-stars-num t-num">{rating.toFixed(1)}</span>
    </span>
  );
}
