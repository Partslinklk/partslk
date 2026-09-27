const BRANDS = [
  { src: "/car-logo.png", alt: "Jeep" },
  { src: "/jaguar.png", alt: "Honda" },
  { src: "/taggart.png", alt: "Jaguar" },
  { src: "/princess-auto.png", alt: "MINI" },
  { src: "/thaco-bus.png", alt: "Bentley" },
  { src: "/bentley.png", alt: "Thaco Bus" },
  { src: "/mini.png", alt: "Princess Auto" },
  { src: "/honda.png", alt: "Auto Fast" },
  { src: "/jeep.png", alt: "Taggart" },
  { src: "/jj-corporate.png", alt: "JJ Corporate" },
];

export function BrandStrip() {
  return (
    <section className="brand-strip" aria-label="Brands we carry parts for">
      <div className="wrap">
        <div className="brand-row">
          {BRANDS.map((b) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img className="brand-mark" src={b.src} alt={b.alt} key={b.src} />
          ))}
        </div>
      </div>
    </section>
  );
}
