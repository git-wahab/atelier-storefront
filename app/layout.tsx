import type { Metadata } from "next";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "@fontsource/hanken-grotesk/300.css";
import "@fontsource/hanken-grotesk/400.css";
import "@fontsource/hanken-grotesk/500.css";
import "@fontsource/hanken-grotesk/600.css";
import "./globals.css";
import { CartProvider } from "@/lib/cart";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Embroidered Hoodies",
  description:
    "Two hoodies where the design is the point. Embroidery runs from shoulder to cuff on both sleeves.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
          <div id="top" className="mx-auto w-full max-w-page">
            <SiteHeader />
            <main>{children}</main>
            <SiteFooter />
          </div>
        </CartProvider>
      </body>
    </html>
  );
}
