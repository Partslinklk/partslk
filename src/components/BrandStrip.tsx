import { readCollection, type Make } from "@/lib/db";

export async function BrandStrip() {
  const makes = await readCollection<Make>("makes");
  if (makes.length === 0) return null;

  return (
    <section className="brand-strip" aria-label="Brands we carry parts for">
      <div className="wrap">
        <div className="brand-row">
          {makes.map((b) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img className="brand-mark" src={b.logo} alt={b.name} key={b.id} />
          ))}
        </div>
      </div>
    </section>
  );
}
