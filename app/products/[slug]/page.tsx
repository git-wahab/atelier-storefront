import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, otherProduct, products } from "@/lib/products";
import { notes } from "@/lib/config";
import Photo from "@/components/Photo";
import Heading from "@/components/Heading";
import FactsStrip from "@/components/FactsStrip";
import ProductGallery from "@/components/ProductGallery";
import ProductBuy from "@/components/ProductBuy";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const p = getProduct(params.slug);
  return p ? { title: `${p.name} · Embroidered Hoodies`, description: p.short } : {};
}

export default function ProductPage({ params }: { params: { slug: string } }) {
  const p = getProduct(params.slug);
  if (!p) notFound();
  const other = otherProduct(p.slug);

  const specs: [string, string][] = [
    ["Fleece", p.fleece],
    ["Embroidery", "Both sleeves, shoulder to cuff, mirrored"],
    ["Thread", p.threads],
    ["Fabric", notes.fabric],
    ["Fit", notes.fit],
    ["Care", notes.care],
  ];

  return (
    <>
      <nav aria-label="Breadcrumb" className="gut flex flex-wrap items-center gap-2.5 pt-7">
        <Link className="nav text-muted" href="/">Home</Link>
        <span className="cap" aria-hidden>/</span>
        <Link className="nav text-muted" href="/#collection">Collection</Link>
        <span className="cap" aria-hidden>/</span>
        <span className="cap text-ink" aria-current="page">{p.name}</span>
      </nav>

      {/* PRODUCT */}
      <section className="gut flex flex-wrap items-start gap-x-[72px] gap-y-12 pb-[clamp(64px,8vw,120px)] pt-8">
        <div className="min-w-0 flex-[1.4_1_480px]">
          <ProductGallery images={p.gallery} />
        </div>
        <div className="min-w-0 max-w-[520px] flex-[1_1_380px] md:sticky md:top-6">
          <ProductBuy product={p} />
        </div>
      </section>

      {/* FACTS */}
      <section className="gut pb-[clamp(72px,9vw,140px)]">
        <FactsStrip
          facts={[
            { label: "Placement", value: "Both sleeves", note: "Shoulder to cuff, on each arm." },
            { label: "Motif", value: p.motif, note: p.motifNote },
            { label: "Surface", value: "Raised stitch", note: "Dense thread that lifts off the fleece." },
            { label: "Fleece", value: p.fleece, note: notes.fabric },
          ]}
        />
      </section>

      {/* ARTWORK */}
      <section className="border-y border-line bg-paper">
        <div className="gut flex flex-wrap items-center gap-x-20 gap-y-14 py-[clamp(72px,9vw,140px)]">
          <div className="rise flex max-w-[480px] flex-[1_1_340px] flex-col gap-[22px]">
            <Heading cap="The artwork" lead={p.artHeading[0]} tail={p.artHeading[1]} />
            <p className="copy">{p.story}</p>
            <p className="copy">The two sleeves mirror each other, so the scene meets across your chest when your arms come together.</p>
          </div>
          {p.pair && (
            <div className="flex min-w-0 flex-[1.2_1_420px] justify-center">
              <Image className="drift h-auto w-[min(520px,100%)]" src={p.pair} alt={`${p.name} artwork, left and right sleeve`} width={1023} height={1400} sizes="520px" />
            </div>
          )}
        </div>
      </section>

      {/* CLOSE TO THE THREAD */}
      <section className="gut py-[clamp(72px,9vw,140px)]">
        <Heading className="rise pb-12" cap="Close to the thread" lead={p.closeHeading[0]} tail={p.closeHeading[1]} />
        <div className="grid items-start gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))]">
          {p.figures.map((f) => (
            <figure key={f.caption} className="hoverable m-0 flex flex-col gap-3.5">
              <Photo src={f.src} alt={f.alt} ratio={f.ratio ?? undefined} position={f.position ?? "50% 30%"} plain={f.plain} sizes="(max-width: 860px) 100vw, 33vw" />
              <figcaption className="flex flex-col gap-1.5"><span className="cap">{f.caption}</span><span className="copy text-[15px]">{f.note}</span></figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* SPECIFICATION */}
      <section className="gut pb-[clamp(72px,9vw,140px)]">
        <div className="flex flex-wrap gap-x-16 gap-y-10 border-t border-line pt-10">
          <Heading className="rise max-w-[380px] flex-[1_1_280px]" cap="Specification" lead="The" tail="details." size="side" />
          <dl className="m-0 min-w-0 flex-[2_1_520px] border-t border-ink">
            {specs.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[minmax(110px,180px)_1fr] gap-x-8 border-b border-line py-5">
                <dt className="cap">{k}</dt>
                <dd className="copy m-0 text-[15px]">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* THE OTHER DESIGN */}
      <section className="gut pb-[clamp(80px,10vw,160px)]">
        <div className="flex flex-wrap items-center gap-x-16 gap-y-10 border-t border-line pt-10">
          <Link href={`/products/${other.slug}`} className="hoverable max-w-[460px] flex-[1_1_320px]" aria-label={other.name}>
            <Photo src={other.hoodie.src} alt={other.hoodie.alt} ratio="4/5" />
          </Link>
          <div className="flex max-w-[520px] flex-[1_1_320px] flex-col gap-5">
            <Heading cap="The other design" lead={other.nameLead} tail={other.nameTail} />
            <p className="copy">{other.short}</p>
            <div><Link className="btn-ink" href={`/products/${other.slug}`}>View {other.name}</Link></div>
          </div>
        </div>
      </section>
    </>
  );
}
