import type { Metadata } from "next";
import CartView from "@/components/CartView";

export const metadata: Metadata = { title: "Cart · Embroidered Hoodies" };

export default function CartPage() {
  return (
    <section className="gut pb-[clamp(72px,9vw,140px)] pt-[clamp(40px,5vw,72px)]">
      <div className="flex flex-col gap-[18px] pb-12">
        <span className="cap">Your cart</span>
        <h1 className="display text-[clamp(52px,7vw,104px)] leading-[0.95]">
          Almost <em>yours.</em>
        </h1>
      </div>
      <CartView />
    </section>
  );
}
