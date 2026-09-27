"use client";

export function ScrollTop() {
  return (
    <button
      className="scroll-top"
      type="button"
      aria-label="Scroll to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={2}>
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}
