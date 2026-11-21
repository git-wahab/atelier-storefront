/**
 * Placeholder for the brand logo. Replace the text with your logo file, e.g.
 * <Image src="/logo.svg" alt="Brand name" width={132} height={44} />
 */
export default function LogoMark({ tone = "light" }: { tone?: "light" | "dark" }) {
  const cls =
    tone === "light"
      ? "border-ink/45 text-body"
      : "border-bone/45 text-dark-soft";
  return (
    <span
      className={`flex h-11 min-w-[132px] items-center justify-center border border-dashed px-4 text-[11px] uppercase tracking-cap ${cls}`}
    >
      Your logo
    </span>
  );
}
