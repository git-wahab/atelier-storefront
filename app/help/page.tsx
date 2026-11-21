import type { Metadata } from "next";
import { faqs } from "@/lib/faq";
import { contact } from "@/lib/config";
import Heading from "@/components/Heading";
import FaqList from "@/components/FaqList";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = { title: "Help and Contact · Embroidered Hoodies" };

export default function HelpPage() {
  return (
    <>
      <section className="gut flex max-w-[900px] flex-col gap-6 pb-[clamp(56px,7vw,100px)] pt-[clamp(40px,5vw,72px)]">
        <span className="cap">Help</span>
        <h1 className="display text-[clamp(56px,8vw,120px)] leading-[0.94]">
          How can we <em>help?</em>
        </h1>
        <p className="copy max-w-[520px]">
          Short answers below. If yours is not there, write to us and a person will reply. {contact.responseTime}
        </p>
      </section>

      <section id="questions" className="gut scroll-mt-6 pb-[clamp(72px,9vw,140px)]">
        <div className="flex flex-wrap items-start gap-x-16 gap-y-10 border-t border-line pt-10">
          <Heading className="max-w-[380px] flex-[1_1_280px]" cap="Questions" lead="The short" tail="answers." size="side" />
          <div className="min-w-0 flex-[2_1_520px]">
            <FaqList items={faqs} />
          </div>
        </div>
      </section>

      <section id="contact" className="scroll-mt-6 border-y border-line bg-paper">
        <div className="gut flex flex-wrap items-start gap-x-20 gap-y-14 py-[clamp(72px,9vw,140px)]">
          <div className="flex max-w-[420px] flex-[1_1_300px] flex-col gap-[22px]">
            <Heading cap="Contact" lead="Write to" tail="us." />
            <p className="copy">Questions about sizing, an order, or a custom piece.</p>
            <div className="flex flex-col gap-[18px] pt-3">
              {[
                ["Email", contact.email],
                ["Instagram", contact.instagram],
                ["Hours", contact.hours],
              ].map(([k, v]) => (
                <div key={k} className="flex flex-col gap-1.5 border-t border-line pt-4">
                  <span className="cap">{k}</span>
                  <span className="select-all text-base">{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="min-w-0 max-w-[640px] flex-[1.4_1_420px]">
            <ContactForm />
          </div>
        </div>
      </section>
    </>
  );
}
