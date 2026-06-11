/**
 * Figma: top bar `1021:7343` (white) + ticker `1021:7352` — 50px, black 20px / emoji 24px.
 */
const LINE = "Limited Early Access – Only 10 Founding Members Spots Available";

function MarqueeSegment() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <span key={i} className="inline-flex shrink-0 items-center gap-2 px-8">
          <span className="text-[16px] leading-none" aria-hidden>
            🔥
          </span>
          <span className="text-[14px] font-medium leading-[18px] text-black">
            {LINE}
          </span>
        </span>
      ))}
    </>
  );
}

export function LandingSectionAnnouncement() {
  return (
    <div className="relative z-20 h-10 w-full overflow-hidden bg-white">
      <div className="landing-marquee-track flex h-full items-center">
        <div className="flex shrink-0 items-center">
          <MarqueeSegment />
        </div>
        <div className="flex shrink-0 items-center" aria-hidden>
          <MarqueeSegment />
        </div>
      </div>
    </div>
  );
}
