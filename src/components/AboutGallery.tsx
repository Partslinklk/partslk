import { ImageSlot } from "./ImageSlot";

const SHOTS = [
  { id: "tall", src: "/about/gal-tall.jpg", alt: "Mechanic working on a car engine", cls: "about-gal-tall" },
  { id: "wide", src: "/about/gal-wide.jpg", alt: "Chrome car engine", cls: "about-gal-wide" },
  { id: "a", src: "/about/gal-a.jpg", alt: "Brake disc and caliper", cls: "about-gal-a" },
  { id: "b", src: "/about/gal-b.jpg", alt: "Classic car in a garage", cls: "about-gal-b" },
];

export function AboutGallery() {
  return (
    <section className="about-gal-section">
      <div className="wrap">
        <div className="about-gal">
          {SHOTS.map((s) => (
            <div className={`about-gal-item ${s.cls}`} key={s.id}>
              <ImageSlot shape="rect" placeholder="" src={s.src} alt={s.alt} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
