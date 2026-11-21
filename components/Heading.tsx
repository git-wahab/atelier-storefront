/** A caption above a serif heading whose second half is set in bronze italic. */
export default function Heading({
  cap,
  lead,
  tail,
  as: Tag = "h2",
  size = "section",
  className = "",
}: {
  cap?: string;
  lead: string;
  tail?: string;
  as?: "h1" | "h2";
  size?: "section" | "side";
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-[18px] ${className}`}>
      {cap && <span className="cap">{cap}</span>}
      <Tag className={size === "section" ? "h-section" : "h-side"}>
        {lead}
        {tail && (
          <>
            {" "}
            <em>{tail}</em>
          </>
        )}
      </Tag>
    </div>
  );
}
