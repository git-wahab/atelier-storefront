import Image from "next/image";
import Link from "next/link";
import { products } from "@/lib/products";
import { faqs } from "@/lib/faq";
import { money, notes, priceOf } from "@/lib/config";
import Photo from "@/components/Photo";
import Heading from "@/components/Heading";
import FactsStrip from "@/components/FactsStrip";
import FaqList from "@/components/FaqList";
import Newsletter from "@/components/Newsletter";

const [crane, bloom] = products;

const craft = [
  { title: "Sleeve to sleeve", body: "The scene runs the full length of both arms, not a single patch." },
  { title: "Raised relief", body: "Dense stitching lifts each petal, feather and bud off the fleece." },
  { title: "A mirrored pair", body: "Left and right sleeves reflect each other across the body." },
  { title: "One plain body", body: "The hoodie stays quiet so the sleeves carry the design." },
];

const details = [
  { src: "/images/crane-detail.jpg", alt: "Blossom embroidery on the crane hoodie shoulder", cap: "Blossom · Crane", ratio: "1/1", pos: "50% 50%" },
  { src: "/images/bloom-sleeve-right.jpg", alt: "Lavender sleeve on the Midnight Bloom hoodie", cap: "Lavender sleeve · Bloom", ratio: "3/4", pos: "50% 20%" },
  { src: "/images/crane-sleeve-right.jpg", alt: "Crane on the right sleeve", cap: "Crane in flight · Crane", ratio: "3/4", pos: "50% 40%" },
  { src: "/images/bloom-detail.jpg", alt: "Lavender buds on the Midnight Bloom shoulder", cap: "Buds · Bloom", ratio: "1/1", pos: "50% 50%" },
];

const compareRows: [string, string, string][] = [
  ["Fleece", crane.fleece, bloom.fleece],
  ["Motif", "Two cranes and cherry blossom", "Lavender sprigs"],
  ["Thread", crane.threads, bloom.threads],
  ["Embroidery", "Both sleeves, shoulder to cuff", "Both sleeves, shoulder to cuff"],
  ["Fabric", notes.fabric, notes.fabric],
  ["Price", money(priceOf(crane.slug)), money(priceOf(bloom.slug))],
];

export default function Home() {
  return (
    <>
      {/* HERO */}
      <section className="gut flex flex-wrap items-end gap-x-16 gap-y-14 pb-[clamp(56px,7vw,110px)] pt-[clamp(48px,6vw,96px)]">
        <div className="flex max-w-[560px] flex-[1_1_380px] flex-col gap-8 pb-3">
          <span className="cap">Embroidered hoodies · Two designs</span>
          <h1 className="display text-[clamp(60px,8.6vw,136px)] leading-[0.92]">
            The design is the <em>garment.</em>
          </h1>
          <p className="copy max-w-[440px]">
            Most hoodies are plain. These carry a full embroidered scene from shoulder to cuff on both
            sleeves, so the artwork is what you notice first.
          </p>
          <div className="flex flex-wrap gap-3.5">
            <Link className="btn-ink" href="#collection">Shop the collection</Link>
            <Link className="btn-out" href="#artwork">See the artwork</Link>
          </div>
        </div>
        <div className="flex min-w-0 flex-[1.5_1_520px] items-start gap-5">
          <Link href={`/products/${crane.slug}`} className="hoverable flex min-w-0 flex-[1.5_1_0] flex-col gap-3.5 text-inherit no-underline">
            <Photo className="plate-in" src={crane.hoodie.src} alt={crane.hoodie.alt} ratio="843/1264" position="50% 50%" priority sizes="(max-width: 860px) 60vw, 35vw" />
            <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><span className="cap text-ink">{crane.name}</span><span className="cap">{crane.fleece}</span></div>
          </Link>
          <Link href={`/products/${bloom.slug}`} className="hoverable flex min-w-0 flex-[1_1_0] flex-col gap-3.5 text-inherit no-underline md:mt-[120px]">
            <Photo className="plate-in" src={bloom.hoodie.src} alt={bloom.hoodie.alt} ratio="912/1172" position="50% 50%" priority sizes="(max-width: 860px) 40vw, 25vw" />
            <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><span className="cap text-ink">{bloom.name}</span><span className="cap">{bloom.fleece}</span></div>
          </Link>
        </div>
      </section>

      {/* FACTS */}
      <section className="gut pb-[clamp(72px,9vw,140px)]">
        <FactsStrip
          facts={[
            { label: "Placement", value: "Both sleeves", note: "Shoulder to cuff, on each arm." },
            { label: "Designs", value: "Two, mirrored", note: "Left and right reflect each other." },
            { label: "Surface", value: "Raised stitch", note: "Dense thread that lifts off the fleece." },
            { label: "Colourways", value: "Ivory, charcoal", note: "One fleece colour per design." },
          ]}
        />
      </section>

      {/* COLLECTION */}
      <section id="collection" className="gut scroll-mt-6 pb-[clamp(80px,10vw,160px)]">
        <div className="rise flex flex-wrap items-end justify-between gap-x-12 gap-y-6 pb-10">
          <Heading cap="The collection" lead="Two designs," tail="one silhouette." />
          <p className="copy max-w-[340px]">Same fit, same fleece. The difference is the story stitched into the arms.</p>
        </div>
        <div className="grid gap-x-8 gap-y-12 [grid-template-columns:repeat(auto-fit,minmax(min(100%,440px),1fr))]">
          {products.map((p) => (
            <article key={p.slug} className="hoverable flex flex-col gap-[22px]">
              <Link href={`/products/${p.slug}`} aria-label={p.name}>
                <Photo src={p.hoodie.src} alt={p.hoodie.alt} ratio="4/5" position="50% 22%" />
              </Link>
              <div className="flex flex-wrap items-baseline justify-between gap-4">
                <h3 className="display text-[clamp(32px,3.4vw,46px)] leading-none">{p.name}</h3>
                <span className="text-base">{money(priceOf(p.slug))}</span>
              </div>
              <p className="copy max-w-[460px]">{p.short}</p>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <span className="inline-flex items-center gap-2.5">
                  <i className="inline-block h-3 w-3 rounded-full" style={{ background: p.dot }} />
                  <span className="cap">{p.fleece} fleece</span>
                </span>
                <Link className="tlink" href={`/products/${p.slug}`}>View the design</Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ARTWORK */}
      <section id="artwork" className="scroll-mt-6 border-y border-line bg-paper">
        <div className="gut py-[clamp(72px,9vw,140px)]">
          <div className="rise flex max-w-[760px] flex-col gap-[18px] pb-14">
            <Heading cap="The artwork" lead="Drawn once, stitched" tail="twice." />
            <p className="copy max-w-[520px]">Each design is a pair. This is the artwork before it meets the fleece, one half for each sleeve.</p>
          </div>
          <div className="grid border-t border-line [grid-template-columns:repeat(auto-fit,minmax(min(100%,440px),1fr))]">
            {products.map((p, i) => (
              <div key={p.slug} className={`flex flex-col items-center gap-7 py-12 text-center ${i === 0 ? "md:pr-8" : "md:border-l md:border-line md:pl-8"}`}>
                <Image className="drift h-auto w-[min(420px,100%)]" src={p.pair} alt={`${p.name} artwork, left and right sleeve`} width={1023} height={1400} sizes="420px" />
                <div className="flex flex-col gap-2">
                  <span className="cap">Design {p.number}</span>
                  <span className="display text-[34px] leading-[1.05]">{p.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FROM ARTWORK TO SLEEVE */}
      <section className="gut py-[clamp(72px,9vw,140px)]">
        <div className="rise flex flex-wrap items-end justify-between gap-x-12 gap-y-6 pb-12">
          <Heading cap="From artwork to sleeve" lead="Flat on paper," tail="worn in motion." />
          <Link className="tlink" href={`/products/${crane.slug}`}>Shop the crane hoodie</Link>
        </div>
        <div className="grid gap-8 [grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))]">
          {[
            { src: "/images/crane-art-left.webp", alt: "Left sleeve artwork on its own", cap: "1 · The artwork", note: "One sleeve, drawn flat.", plain: true },
            { src: "/images/crane-sleeve-left.jpg", alt: "The same artwork stitched on the sleeve", cap: "2 · On the sleeve", note: "The same scene in thread, from shoulder down." },
            { src: crane.hoodie.src, alt: "The finished hoodie worn", cap: "3 · Worn", note: "Both sleeves together, crane facing crane." },
          ].map((f) => (
            <figure key={f.cap} className="m-0 flex flex-col gap-4">
              <Photo src={f.src} alt={f.alt} ratio="3/4" position="50% 30%" plain={f.plain} sizes="(max-width: 860px) 100vw, 33vw" />
              <figcaption className="flex flex-col gap-1.5"><span className="cap">{f.cap}</span><span className="copy text-[15px]">{f.note}</span></figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* DETAIL GALLERY */}
      <section className="gut pb-[clamp(72px,9vw,140px)]">
        <div className="border-t border-line pb-12 pt-10">
          <Heading className="rise" cap="Detail" lead="Close to the" tail="thread." />
        </div>
        <div className="grid items-start gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))]">
          {details.map((d) => (
            <figure key={d.cap} className="hoverable m-0 flex flex-col gap-3">
              <Photo src={d.src} alt={d.alt} ratio={d.ratio} position={d.pos} sizes="(max-width: 860px) 100vw, 25vw" />
              <figcaption className="cap">{d.cap}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* CRAFT */}
      <section id="craft" className="gut scroll-mt-6 pb-[clamp(72px,9vw,140px)]">
        <div className="flex flex-wrap gap-x-16 gap-y-10 border-t border-line pt-10">
          <Heading className="rise max-w-[380px] flex-[1_1_280px]" cap="The craft" lead="Thread you can" tail="see rise." size="side" />
          <div className="grid min-w-0 flex-[2_1_520px] gap-x-8 gap-y-10 [grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr))]">
            {craft.map((c) => (
              <div key={c.title} className="flex flex-col gap-3 border-t border-ink pt-5">
                <span className="display text-[28px] leading-[1.1]">{c.title}</span>
                <p className="copy text-[15px]">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARE */}
      <section className="gut pb-[clamp(72px,9vw,140px)]">
        <Heading className="rise pb-10" cap="Side by side" lead="Choose your" tail="sleeves." />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse border-t border-ink text-left">
            <thead>
              <tr className="border-b border-line">
                <th className="w-[200px] py-[22px]"><span className="sr-only">Feature</span></th>
                {products.map((p) => (
                  <th key={p.slug} scope="col" className="py-[22px] pr-8 font-serif text-[30px] font-normal leading-[1.1]">{p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compareRows.map(([label, a, b]) => (
                <tr key={label} className="border-b border-line">
                  <th scope="row" className="cap py-5 pr-8 align-top">{label}</th>
                  <td className="copy py-5 pr-8 text-[15px]">{a}</td>
                  <td className="copy py-5 pr-8 text-[15px]">{b}</td>
                </tr>
              ))}
              <tr>
                <td className="py-7" />
                {products.map((p) => (
                  <td key={p.slug} className="py-7 pr-8">
                    <Link className="btn-ink" href={`/products/${p.slug}`}>View {p.nameLead.split(" ").pop()}</Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section id="questions" className="gut scroll-mt-6 pb-[clamp(80px,10vw,160px)]">
        <div className="flex flex-wrap items-start gap-x-16 gap-y-10 border-t border-line pt-10">
          <div className="flex max-w-[380px] flex-[1_1_280px] flex-col gap-[18px]">
            <Heading cap="Questions" lead="The short" tail="answers." size="side" />
            <Link className="tlink self-start" href="/help#contact">Write to us</Link>
          </div>
          <div className="min-w-0 flex-[2_1_520px]">
            <FaqList items={faqs.slice(0, 4)} />
          </div>
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="dark-band bg-ink text-bone">
        <div className="gut flex flex-wrap items-end justify-between gap-x-[72px] gap-y-10 border-b border-bone/15 pb-[clamp(56px,7vw,96px)] pt-[clamp(64px,8vw,112px)]">
          <div className="flex max-w-[560px] flex-[1_1_360px] flex-col gap-[18px]">
            <span className="cap text-dark-dim">Letter</span>
            <h2 className="h-side text-bone">
              Hear about the <em className="!text-dark-accent">next design.</em>
            </h2>
            <p className="m-0 max-w-[440px] text-base leading-[1.7] text-dark-soft">One note when a new design is ready. [NEWSLETTER FREQUENCY]</p>
          </div>
          <div className="max-w-[520px] flex-[1_1_380px]">
            <Newsletter />
          </div>
        </div>
      </section>
    </>
  );
}
