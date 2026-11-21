export type Fact = { label: string; value: string; note: string };

/** Four facts in a row under a hairline, each column divided by a rule. */
export default function FactsStrip({ facts }: { facts: Fact[] }) {
  return (
    <div className="grid border-t border-line [grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))]">
      {facts.map((f, i) => (
        <div
          key={f.label}
          className={`flex flex-col gap-2 py-7 ${i === 0 ? "pr-6" : "px-6 border-l border-line"}`}
        >
          <span className="cap">{f.label}</span>
          <span className="display text-[28px] leading-[1.1]">{f.value}</span>
          <p className="copy text-sm leading-[1.6]">{f.note}</p>
        </div>
      ))}
    </div>
  );
}
