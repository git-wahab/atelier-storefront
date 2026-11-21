# Embroidered Hoodies: minimal luxury

A Next.js 14 (App Router) + Tailwind CSS + TypeScript storefront in the light, gallery-style design:
bone paper, serif headlines, hairline rules, one bronze accent.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:3000. For a production build: `npm run build` then `npm start`.
You need Node.js 18.17 or newer.

## Pages

| Route | What it is |
| --- | --- |
| `/` | Homepage: hero, facts, collection, artwork, artwork-to-sleeve, detail gallery, craft, comparison, FAQ, newsletter |
| `/products/whispering-crane-bird` | Product page |
| `/products/midnight-bloom` | Product page |
| `/cart` | Cart and checkout |
| `/help` | FAQ and contact form (`/help#contact`) |
| `/api/contact` | Receives the contact form |

## Where to change things

- **Prices, sizes, shipping, placeholder notes, contact details:** `lib/config.ts`.
  Prices there are sample values so the cart can add up.
- **Product text and images:** `lib/products.ts`. Add a third product by adding an entry;
  its page is created automatically.
- **FAQ:** `lib/faq.ts`.
- **Colours and fonts:** `tailwind.config.ts` (tokens) and `app/globals.css` (buttons, captions, animations).
- **Logo:** `components/LogoMark.tsx`. Put your file in `public/` and swap the placeholder for an `<Image>`.
- **Images:** `public/images/`.

Any text in `[BRACKETS]` is placeholder copy to replace.

## Tests

```bash
npm test             # run once
npm run test:watch   # re-run on change
npm run test:coverage
```

Vitest with React Testing Library and jsdom; specs live in `tests/`, one file per
module. They cover the cart logic and its `localStorage` fallbacks, the contact
route's validation, every component's behaviour and accessible names, and the
product, cart and help pages. There is no browser-level test yet: the add-to-cart
journey across a reload, and the cross-tab sync, would suit Playwright.

Two notes on what the suite deliberately pins:

- `tests/products.test.ts` asserts that `otherProduct()` only ever returns the
  first non-matching design. Adding a third product should make that test fail.
- `tests/cart-view-shipping.test.tsx` stubs `shippingFlat` to a real rate, since
  delivery is free in the shipped config and that branch would otherwise never run.

## Before launch

- **Checkout:** `components/CartView.tsx` → `placeOrder`. It currently clears the cart and shows a
  thank-you. Connect Stripe Checkout, Shopify or your platform there. No payment is taken.
- **Contact form:** `app/api/contact/route.ts` only validates and logs. Send the message to your inbox
  (Resend, Postmark, a helpdesk) there.
- **Newsletter:** `components/Newsletter.tsx` → `onSubmit`. Connect your mailing list provider.
- **Cart storage:** the cart is saved in the visitor's browser (`localStorage` key `luxCart`).

## Motion

Scroll-linked reveals use CSS scroll timelines (`.rise`, `.plate-in`, `.drift` in `globals.css`).
Browsers without support simply show the content without the animation, and the motion is turned off
for visitors who ask for reduced motion.
