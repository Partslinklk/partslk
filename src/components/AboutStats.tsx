import { ImageSlot } from "./ImageSlot";

const STATS = [
  { value: "18+", label: "Years" },
  { value: "200+", label: "Employees" },
  { value: "85%", label: "Repeat customers" },
  { value: "27+", label: "Awards" },
];

export function AboutStats() {
  return (
    <section className="about-stats">
      <ImageSlot shape="rect" placeholder="" className="about-stats-bg" src="/about/stats.jpg" alt="Mechanic working under a car bonnet" />
      <div className="about-stats-overlay" />
      <div className="wrap about-stats-grid">
        {STATS.map((s) => (
          <div className="about-stat" key={s.label}>
            <span className="about-stat-num">{s.value}</span>
            <span className="about-stat-label">{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
