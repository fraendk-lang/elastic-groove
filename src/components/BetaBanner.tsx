/**
 * Persistent beta notice — visible on every session so testers know the app
 * is still in active development.
 */
export function BetaBanner() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 px-3 py-1.5 border-b border-amber-500/25 bg-amber-500/[0.07] text-[10px] leading-snug text-amber-100/90 shrink-0"
    >
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-black tracking-[0.12em] uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
        Beta
      </span>
      <span className="text-center">
        Elastic Groove is in beta and actively being developed — features may change. Feedback welcome.
      </span>
    </div>
  );
}
