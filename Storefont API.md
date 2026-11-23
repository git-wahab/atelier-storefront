# Storefront API

The public JSON API the Next.js storefront reads. Eleven endpoints, no
authentication, versioned in the path.

Every example below is a real response captured from the running application,
not an invented one. Figures come from the Settings screen, so your own
responses will differ in the amounts; the shapes will not.

- [Before you start](#before-you-start)
- [Conventions](#conventions)
- [Reads](#reads)
  - [`GET /products`](#get-products)
  - [`GET /products/{slug}`](#get-productsslug)
  - [`GET /collections`](#get-collections)
  - [`GET /collections/{slug}`](#get-collectionsslug)
  - [`GET /faqs`](#get-faqs)
  - [`GET /settings`](#get-settings)
- [Writes](#writes)
  - [`POST /orders`](#post-orders)
  - [`POST /orders/lookup`](#post-orderslookup)
  - [`POST /discounts/validate`](#post-discountsvalidate)
  - [`POST /contact`](#post-contact)
  - [`POST /newsletter`](#post-newsletter)
- [Errors](#errors)
- [Rate limits](#rate-limits)
- [Caching](#caching)
- [TypeScript types](#typescript-types)

---

## Before you start

**Base URL.** `https://your-admin-host/api/v1`. The `v1` is fixed by
`apiPrefix` in `bootstrap/app.php`. A breaking change to a response shape gets
a `v2` beside it, never an edit in place — at the moment you deploy, a
storefront build already in a visitor's browser is still asking for the old
shape.

**CORS.** Nothing works from a browser until the storefront's origins are
listed. Comma-separated, no trailing slash, scheme included:

```
STOREFRONT_ORIGINS=https://atelier.example,https://staging.atelier.example
```

Preview deployments get their own entry. There is no wildcard: these endpoints
create orders, and an origin list is the one thing standing between this API
and a form on somebody else's site posting to it. Only `GET`, `POST` and
`OPTIONS` are allowed, only `Accept`, `Content-Type` and `X-Requested-With` are
accepted as request headers, and no credentials are sent — there are no cookies
on this API.

**Server-side fetches ignore CORS**, so `generateStaticParams`, ISR and route
handlers work whatever that list says. It is the browser that enforces it.

---

## Conventions

**Money is always an integer in minor units.** `12000` is $120.00. No endpoint
accepts or returns a decimal amount, because `0.1 + 0.2` is not `0.3` and a
price that has been through a float is a price you cannot reconcile. Divide by
100 at the moment you render, and nowhere else.

**No amount is ever accepted from the client.** The order endpoint takes
slugs, sizes and quantities; it reads prices from the database, applies the
discount itself and computes the total under a row lock. A caller who posts a
`total` has posted a field that is ignored.

**Keys are camelCase**, and every documented key is always present. A key that
appears only sometimes is a key the storefront has to guard on every read, so
`shippedAt`, `trackingNumber` and the rest are `null` until they are not.

**Timestamps are ISO 8601 in UTC**, Zulu suffix: `2026-11-23T15:22:25Z`.

**Success bodies are wrapped.** Reads and the order endpoints return
`{ "data": … }`; listings add `{ "meta": …, "links": … }`. The two form
endpoints return `{ "ok": true }`, because that is the shape the storefront's
existing forms already check with `if (!res.ok)`.

**Request bodies are JSON.** Send `Content-Type: application/json`, and send
`Accept: application/json` so a validation failure comes back as JSON rather
than a redirect.

**Every response carries** `X-Content-Type-Options: nosniff`,
`X-Frame-Options: DENY` and `Referrer-Policy: no-referrer`.

---

## Reads

All six are cacheable, anonymous, and share one rate limit of **120 requests a
minute**.

### `GET /products`

The catalogue, paginated, as cards. Card fields only — `description`, `story`,
`variants`, `gallery` and `figures` live in the single-product shape. With
forty products the full shape would ship most of a megabyte of story copy the
grid never displays, on every cold render.

**Query parameters**

| Parameter | Type | Default | Notes |
| --- | --- | --- | --- |
| `q` | string | — | Substring match on name, number, motif, threads or slug |
| `collection` | slug | — | Members of one collection |
| `featured` | `1` | — | Featured products only. Any other value is ignored |
| `sort` | enum | `position` | `position`, `newest`, `price_asc`, `price_desc` |
| `page` | integer | `1` | |
| `per_page` | integer | `24` | Capped at `60` |

An unrecognised `sort` falls back to `position` rather than erroring — a stale
storefront build sending an old value still renders. `per_page=500` returns 60.

```bash
curl 'https://your-admin-host/api/v1/products?sort=price_desc&per_page=24'
```

**`200`**

```json
{
    "data": [
        {
            "slug": "whispering-crane-bird",
            "name": "Whispering Crane Bird",
            "nameLead": "Whispering Crane",
            "nameTail": "Bird",
            "number": "01",
            "fleece": "Ivory",
            "dot": "#C98763",
            "threads": "Blue, silver, copper-rose",
            "short": "Two cranes in flight among cherry blossom, embroidered in blue, silver and copper-rose on ivory fleece.",
            "motif": "Cranes and blossom",
            "motifNote": "Two cranes, facing each other across the body.",
            "price": 12000,
            "currency": "USD",
            "isFeatured": true,
            "inStock": true,
            "hoodie": {
                "src": "https://your-admin-host/storage/products/crane-hoodie.jpg",
                "alt": "Whispering Crane Bird hoodie in ivory with embroidered sleeves",
                "width": 843,
                "height": 1264
            }
        }
    ],
    "meta": {
        "page": 1,
        "perPage": 24,
        "total": 2,
        "lastPage": 1
    },
    "links": {
        "next": null
    }
}
```

`nameLead` and `nameTail` are the name already split for a two-line heading, so
the layout does not have to guess the break from punctuation. `dot` is the
accent hex the storefront uses for that product's marker. Image dimensions
travel with the source because the grid reserves the space before the file
arrives — that is what `next/image` wants, and it is what stops the page
reflowing as each image loads.

`links.next` is a full URL with your query string preserved, or `null` on the
last page. An empty result is `"data": []` with `total: 0`, never a 404.

`inStock` is rolled up from the variants so a card can be marked sold out
without carrying the variant array. Like everything behind a five-minute cache
it is **advisory** — the authoritative check is the locked read inside
`POST /orders`.

### `GET /products/{slug}`

Everything the product page renders, in one request. The card fields repeat
here, and `related` and `collections` are resolved rather than referenced, so
rendering a product is one round trip rather than one plus a fan-out.

```bash
curl 'https://your-admin-host/api/v1/products/whispering-crane-bird'
```

**`200`** — the card fields above, plus:

```json
{
    "data": {
        "description": "Two cranes in flight among cherry blossom, embroidered the full length of both sleeves on soft ivory fleece. The body stays plain, so the sleeves carry the whole design.",
        "story": "A pair of cranes lifts through branches of cherry blossom, drawn in fine lines and filled with blue, silver and copper-rose thread. One half runs down each sleeve.",
        "artHeading": ["Two cranes,", "mirrored."],
        "closeHeading": ["Every feather,", "in thread."],
        "pair": "https://your-admin-host/storage/products/crane-pair.webp",
        "sizes": ["XS", "S", "M", "L", "XL"],
        "variants": [
            { "size": "XS", "inStock": true, "price": 12000 },
            { "size": "S", "inStock": true, "price": 12000 },
            { "size": "M", "inStock": true, "price": 12000 },
            { "size": "L", "inStock": true, "price": 12000 },
            { "size": "XL", "inStock": true, "price": 12000 }
        ],
        "gallery": [
            {
                "src": "https://your-admin-host/storage/products/crane-sleeve-left.jpg",
                "alt": "Left sleeve embroidery",
                "width": 600,
                "height": 1480
            }
        ],
        "figures": [
            {
                "src": "https://your-admin-host/storage/products/crane-art-left.webp",
                "alt": "Left sleeve artwork",
                "caption": "1 · The artwork",
                "note": "One sleeve, drawn flat.",
                "ratio": "3/4",
                "plain": true,
                "position": null
            }
        ],
        "collections": [{ "slug": "winter-weights", "name": "Winter Weights" }],
        "related": ["…card shape…"]
    }
}
```

`artHeading` and `closeHeading` are arrays of one or two lines, empty parts
filtered out, because the storefront sets them on separate lines with the
second indented.

**Build the size picker from `sizes` or `variants` here, not from
`GET /settings`.** The global set is the default for a *new* product and the
column order of the admin's variant matrix; across a larger catalogue it stops
describing any particular product, and a picker built from it offers sizes this
design does not come in.

`stock` is never sent. A shopper needs to know whether they can buy the size,
not how many are left, and a public count of remaining units is a competitor's
inventory feed. The one place a number appears is a `409` on checkout, as the
correction needed to fix the cart.

**`404`** for an unknown slug, an inactive product, or one not published yet.
All three answer identically, because the difference between "no such product"
and "not published yet" is a fact about the shop's plans. This is what
`notFound()` expects.

### `GET /collections`

Every published collection, in the editor's order, with no member products
attached.

```bash
curl 'https://your-admin-host/api/v1/collections'
```

**`200`**

```json
{
    "data": [
        {
            "slug": "winter-weights",
            "name": "Winter Weights",
            "nameLead": "Winter",
            "nameTail": "Weights",
            "short": "The heavier fleeces, for the months that need them.",
            "heroImage": null,
            "productCount": 2
        }
    ]
}
```

Not paginated. `productCount` counts published members only, so a collection
holding six products of which two are drafts does not promise six and then
render four.

`heroImage` has the same `{ src, alt, width, height }` shape as a product
image, but a collection stores only a path — so `width` and `height` are always
`null` and the collection's name stands in for the alt text. It is `null`
entirely when no hero has been set.

### `GET /collections/{slug}`

The collection page: its own copy, plus its members card-shaped in the editor's
order for that collection. Equivalent to `GET /products?collection={slug}` with
the heading and description attached, which saves the page a second request.

Takes the same query parameters as `GET /products`. Inside a collection
`position` means that collection's own running order; an explicit `sort` still
wins, because somebody who asked for cheapest first means it.

```bash
curl 'https://your-admin-host/api/v1/collections/winter-weights'
```

**`200`**

```json
{
    "data": {
        "slug": "winter-weights",
        "name": "Winter Weights",
        "nameLead": "Winter",
        "nameTail": "Weights",
        "short": "The heavier fleeces, for the months that need them.",
        "heroImage": null,
        "productCount": 2,
        "description": "Everything cut from the 480gsm loopback, gathered in one place.",
        "products": ["…card shape…"]
    },
    "meta": { "page": 1, "perPage": 24, "total": 2, "lastPage": 1 },
    "links": { "next": null }
}
```

`meta` and `links` describe `data.products`, not the collection. **`404`** for
an unknown or unpublished slug.

### `GET /faqs`

```bash
curl 'https://your-admin-host/api/v1/faqs'
```

**`200`**

```json
{
    "data": [
        {
            "question": "Where is the embroidery on the hoodie?",
            "answer": "On both sleeves, from the shoulder down to the cuff. The body is left plain so the design stands out."
        }
    ]
}
```

Active entries only, in the editor's order. Not paginated: the list is the
length of a page of questions, and a page size would be a parameter nobody
would ever send.

### `GET /settings`

The shop's copy and commerce figures — an allowlist, not everything in the
Settings screen.

```bash
curl 'https://your-admin-host/api/v1/settings'
```

**`200`**

```json
{
    "data": {
        "brandName": "Atelier",
        "currency": "USD",
        "currencySymbol": "$",
        "shippingFlat": 500,
        "taxRateBp": 850,
        "sizes": ["XS", "S", "M", "L", "XL"],
        "notes": {
            "shipping": "…",
            "returns": "…",
            "fabric": "…",
            "fit": "…",
            "care": "…",
            "sizeGuide": "…",
            "delivery": "…",
            "deliveryMethods": "…",
            "embroidery": "Both sleeves, shoulder to cuff"
        },
        "contact": {
            "email": "…",
            "instagram": "…",
            "otherSocial": "…",
            "hours": "…",
            "responseTime": "…"
        }
    }
}
```

`shippingFlat` is minor units. `taxRateBp` is basis points, so `850` is 8.5% —
both are shown here for reference, and **neither should be used to compute what
a customer is charged.** `POST /orders` returns the authoritative figures.

`sizes` is the union of sizes actually on sale, ordered by the admin's default
set. It exists so the storefront's old `sizes` export has somewhere to point
during the migration; see the warning under `GET /products/{slug}`.

Deliberately absent: `lowStockThreshold`, `featuredLimit` and
`paymentInstructions`. The first two are how the panel runs the shop and tell a
visitor nothing. The third reaches the visitor through the order response,
where it belongs to an order rather than to the site.

---

## Writes

### `POST /orders`

Checkout. One database transaction: the variant rows are locked, every line
re-validated against the locked rows, totals recomputed, the order and its
items written, stock moved, and the discount's redemption counter incremented.
Either all of that happens or none of it does.

**Request**

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `items` | array | yes | 1–20 lines |
| `items[].slug` | string | yes | Must be an active product |
| `items[].size` | string | yes | Must be an active variant of that product |
| `items[].qty` | integer | yes | 1–10 |
| `email` | string | yes | ≤190. Lower-cased before storing |
| `firstName` | string | yes | ≤80 |
| `lastName` | string | yes | ≤80 |
| `address1` | string | yes | ≤190 |
| `address2` | string | no | ≤190 |
| `city` | string | yes | ≤120 |
| `postcode` | string | yes | ≤32 |
| `country` | string | yes | ≤80 |
| `phone` | string | no | ≤40 |
| `discountCode` | string | no | ≤40 |
| `customerNote` | string | no | ≤1000 |

The cart sends **what it displays** — a slug and a size — never a variant id.
A cart saved in `localStorage` before a variant was rebuilt still checks out,
and a crafted id buys nothing.

Duplicate `slug` + `size` lines are summed before anything is validated. The
cart already dedupes this way, so two lines of the same size are a transport
artefact; summing first also closes the obvious way round the per-line cap —
ten lines of ten is one line of a hundred, and is rejected as one.

Twenty lines and ten of each is a ceiling, not a business rule: an unbounded
cart is an unbounded transaction holding row locks for as long as the request
takes to build.

In production the email is checked for a deliverable domain (`email:rfc,dns`),
because the confirmation is the only thing that tells this customer how to pay.
Set `VERIFY_EMAIL_DNS=false` if a slow resolver ever stalls checkout.

```bash
curl -X POST 'https://your-admin-host/api/v1/orders' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d '{
    "items": [
      { "slug": "whispering-crane-bird", "size": "M", "qty": 1 },
      { "slug": "midnight-bloom", "size": "L", "qty": 1 }
    ],
    "email": "rowan.vale@example.com",
    "firstName": "Rowan",
    "lastName": "Vale",
    "address1": "14 Mercer Street",
    "address2": "Flat 3",
    "city": "Leeds",
    "postcode": "LS1 6DQ",
    "country": "United Kingdom",
    "phone": "+44 7700 900123",
    "discountCode": "WELCOME10",
    "customerNote": "Please leave with a neighbour if I am out."
  }'
```

**`201`**

```json
{
    "data": {
        "orderNumber": "AT-62AFSB",
        "status": "awaiting_payment",
        "email": "rowan.vale@example.com",
        "subtotal": 24000,
        "discount": 2400,
        "shipping": 500,
        "tax": 1836,
        "total": 23936,
        "currency": "USD",
        "discountApplied": true,
        "discountCode": "WELCOME10",
        "items": [
            {
                "slug": "whispering-crane-bird",
                "name": "Whispering Crane Bird",
                "size": "M",
                "qty": 1,
                "unitPrice": 12000,
                "lineTotal": 12000
            },
            {
                "slug": "midnight-bloom",
                "name": "Midnight Bloom",
                "size": "L",
                "qty": 1,
                "unitPrice": 12000,
                "lineTotal": 12000
            }
        ],
        "paymentInstructions": "Transfer the total to Atelier, sort code 00-00-00, account 00000000, using your order number as the reference. We make your hoodie once the payment lands.",
        "shippedAt": null,
        "trackingCarrier": null,
        "trackingNumber": null,
        "createdAt": "2026-11-23T15:21:02Z"
    }
}
```

**How the total is reached.** Tax is charged on the discounted subtotal;
shipping is flat and is not taxed:

```
taxable  = subtotal − discount        21600 = 24000 − 2400
tax      = round(taxable × bp ÷ 10000) 1836 = round(21600 × 850 ÷ 10000)
total    = taxable + tax + shipping   23936 = 21600 + 1836 + 500
```

Render these figures; do not recompute them. The order keeps them forever, so
changing the tax rate tomorrow cannot rewrite what somebody paid.

The item fields are a snapshot written at purchase, which is why `name` is
there beside `slug`: renaming or repricing a product afterwards leaves this
order exactly as it was sold.

`status` is one of `awaiting_payment`, `paid`, `shipped`, `cancelled`,
`refunded`. A new order is always `awaiting_payment` — there is no online
payment yet, which is what `paymentInstructions` is for. A thank-you page that
says nothing about paying reads as a broken checkout.

**`discountApplied` is not the same as "I sent a code".** A code can be valid
when the cart checks it and unredeemable a few seconds later at checkout — its
last redemption taken, or its window closed. Rather than fail the order, the
order is placed at full price with `discountApplied: false` and `discountCode:
null`. Say so on the thank-you page; do not compare totals and guess why they
differ.

The confirmation email and the staff notification are queued after the
transaction commits, never inside it — a mail queued from within would be sent
for an order a rollback had erased.

**`409` — a line cannot be bought.** Not a validation failure: nothing the
customer typed is wrong, and the same request would have succeeded a minute
earlier.

```json
{
    "message": "Some items are no longer available",
    "errors": [
        {
            "slug": "midnight-bloom",
            "size": "S",
            "reason": "insufficient_stock",
            "available": 2
        }
    ]
}
```

Note that `errors` here is an **array**, not the object a `422` returns. Every
failing line is listed, so a customer with three bad lines is told about all
three at once instead of discovering them one request at a time.

| `reason` | Meaning |
| --- | --- |
| `insufficient_stock` | Fewer in stock than asked for. `available` is how many there are |
| `unavailable` | The size was deactivated or removed. No `available` key |

`available` appears only on `insufficient_stock`, and only as the number needed
to correct the cart.

**`422`** for anything wrong with the request itself, including a size that is
not available for that design:

```json
{
    "message": "The email field must be a valid email address. (and 2 more errors)",
    "errors": {
        "email": ["The email field must be a valid email address."],
        "items.0.size": ["That size is not available for this design."],
        "items.1.size": ["That size is not available for this design."]
    }
}
```

Keys are indexed by position in the array **after** duplicate lines were
summed, so map them back by index to the cart you sent.

### `POST /orders/lookup`

"Where is my order?" — the order number and the email address together are the
credential.

A `POST` although it only reads: a query string lands in server logs, proxy
logs and `Referer` headers, and personal data does not belong in a URL.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `orderNumber` | string | yes | ≤20. Upper-cased before matching |
| `email` | string | yes | ≤190. Lower-cased before matching |

Both halves are normalised the way they were stored, so a customer reading
their number off a confirmation in lowercase is not given a 404 for it.

```bash
curl -X POST 'https://your-admin-host/api/v1/orders/lookup' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d '{ "orderNumber": "AT-62AFSB", "email": "rowan.vale@example.com" }'
```

**`200`** — byte-for-byte the shape `POST /orders` returns, so the storefront
types it once and a visitor looking their order up a week later sees the same
figures in the same places as the page that confirmed it. Once the parcel
moves, the three tracking keys fill in:

```json
{
    "data": {
        "orderNumber": "AT-62AFSB",
        "status": "shipped",
        "total": 23936,
        "shippedAt": "2026-11-23T15:22:25Z",
        "trackingCarrier": "Royal Mail",
        "trackingNumber": "AB123456789GB"
    }
}
```

The storefront builds its own tracking link if it wants one; the carrier URL
template lives in the admin and is used for the shipping email.

**`404`** — one message for every cause: wrong number, wrong email, or both.

```json
{ "message": "We could not find an order with that number and email address." }
```

Distinguishing them would turn this endpoint into an oracle — "wrong email"
confirms the order number exists, which is precisely the signal somebody
enumerating numbers is looking for. Show this message as it is.

### `POST /discounts/validate`

What the cart calls while the visitor is still typing. **Advisory only.** It
increments nothing, and its answer can go stale in the seconds before checkout
— the authoritative validation is the one inside the order transaction with the
code row locked.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `code` | string | yes | ≤40. Case-insensitive |
| `subtotal` | integer | yes | ≥0, minor units. Used for the minimum-spend check only |

Always answers `200`, valid or not: a code that does not exist is a normal
outcome of typing one, not a failed request. Check `data.valid`, not the status.

```bash
curl -X POST 'https://your-admin-host/api/v1/discounts/validate' \
  -H 'Content-Type: application/json' \
  -d '{ "code": "welcome10", "subtotal": 24000 }'
```

**`200`, valid**

```json
{
    "data": {
        "valid": true,
        "code": "WELCOME10",
        "type": "percent",
        "discount": 2400,
        "message": "10% off applied"
    }
}
```

`code` comes back normalised to the stored form. `type` is `percent` or
`fixed`. `discount` is what would come off this subtotal, already clamped so it
can never exceed it.

**`200`, not valid**

```json
{
    "data": {
        "valid": false,
        "reason": "below_minimum",
        "message": "Spend $50.00 to use this code"
    }
}
```

`message` is written for a shopper and already formatted in the shop's
currency — show it. `reason` is for your own branching:

| `reason` | |
| --- | --- |
| `not_found` | No such code |
| `inactive` | Switched off |
| `not_started` | Its window has not opened |
| `expired` | Its window has closed |
| `exhausted` | Fully redeemed |
| `below_minimum` | Subtotal under the minimum spend |

Checks run in a fixed order and the first failure is the one reported, chosen
so the message a visitor sees is the most useful one rather than the first that
happens to fail. The two shapes are a discriminated union on `valid`: `code`,
`type` and `discount` exist only when `true`, `reason` only when `false`.

### `POST /contact`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `name` | string | yes | ≤120 |
| `email` | string | yes | ≤190 |
| `topic` | string | yes | ≤160 |
| `order` | string | no | ≤40. An order number, if the message is about one |
| `message` | string | yes | 10–5000 |
| `website` | string | no | Honeypot — see below |

These are the fields the storefront's existing form already sends, so
`ContactForm` needs nothing but a changed URL.

```bash
curl -X POST 'https://your-admin-host/api/v1/contact' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d '{
    "name": "Rowan Vale",
    "email": "rowan.vale@example.com",
    "topic": "Sizing",
    "order": "AT-62AFSB",
    "message": "I usually wear a medium in sweatshirts. Does this run large?"
  }'
```

**`201`**

```json
{ "ok": true }
```

The message lands on the admin's Messages screen and the active staff accounts
are emailed.

**The honeypot.** Render a `website` field, hidden from people and left empty.
If it arrives with anything in it the request is **accepted and silently
discarded** — same `201`, nothing stored, nothing emailed. Refusing would tell
the sender which field gave them away, and the next attempt would leave it
empty. It is optional, so a form that does not render it keeps working; a form
that adds it gains the protection.

Hide it with CSS, not `type="hidden"`, and give it `tabindex="-1"` and
`autocomplete="off"` so it is not offered to a password manager or reachable by
keyboard.

**`422`** in the standard shape for a message under 10 characters, a bad
address, or a missing field.

### `POST /newsletter`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `email` | string | yes | ≤190. Lower-cased and trimmed |
| `source` | string | no | ≤40. Where they signed up, e.g. `footer` |
| `website` | string | no | Honeypot, as above |

```bash
curl -X POST 'https://your-admin-host/api/v1/newsletter' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d '{ "email": "rowan.vale@example.com", "source": "footer" }'
```

**`201`**

```json
{ "ok": true }
```

**Always `{ "ok": true }`, including for an address already on the list.**
Telling a caller whether an address is subscribed makes this endpoint a
membership oracle for any address somebody cares to test — and the answer is of
no use to the person actually signing up, who gets what they asked for either
way. Show one thank-you message and nothing conditional.

---

## Errors

| Status | When | Body |
| --- | --- | --- |
| `404` | Unknown product or collection slug | `{ "message": "" }` |
| `404` | Order lookup found nothing | `{ "message": "We could not find an order…" }` |
| `404` | No such route | `{ "message": "The route api/v1/… could not be found." }` |
| `405` | Wrong method | `{ "message": "The POST method is not supported…" }` |
| `409` | Cart line cannot be bought | `{ "message": …, "errors": [ … ] }` |
| `422` | Validation failed | `{ "message": …, "errors": { field: [ … ] } }` |
| `429` | Rate limited | `{ "message": "Too Many Attempts." }` |
| `500` | Server fault | `{ "message": "Server Error" }` |

A `404` on a slug has an **empty** message — branch on the status, never the
body. The `message` on a `422` is the first failure with a count of the rest;
it is serviceable as a fallback, but render the per-field `errors` where you
can.

`errors` is an object keyed by field on a `422` and an **array of lines** on a
`409`. Those are the only two shapes, and the status tells you which you have.

In production `APP_DEBUG=false` keeps stack traces out of these bodies. Check
it before you go live: with debug on, a `404` returns the whole trace.

---

## Rate limits

Keyed on an HMAC of the caller's IP — the raw address is never stored.

| Endpoint | Limit |
| --- | --- |
| All six reads, together | 120 / minute |
| `POST /orders` | 5 / minute, 20 / hour |
| `POST /orders/lookup` | 10 / minute, 30 / hour, **plus 10 / minute per order number** |
| `POST /discounts/validate` | 20 / minute |
| `POST /contact` | 3 / minute, 10 / hour |
| `POST /newsletter` | 3 / minute, 10 / hour |

Each write has its own limiter because the cost of abuse differs: a flood of
lookups is an attempt to walk the order book, a flood of contact messages is
spam, and a flood of orders is staff attention wasted.

The third limit on lookup is the one that matters. It counts attempts against
the *submitted order number*, whoever is asking — without it, a botnet spread
across many addresses could brute-force the email for one known order number
while every individual address stayed under its own limit.

A `429` carries `Retry-After` in seconds. `X-RateLimit-Limit` and
`X-RateLimit-Remaining` are also set, but **only `Retry-After` is exposed to
cross-origin JavaScript** — the others are readable from a server-side fetch
only.

Debounce the discount check in the cart. At 20 a minute, a call per keystroke
will hit the limit on a six-character code typed twice.

---

## Caching

`Cache-Control: public, max-age=…` is set on **successful** read responses
only. A failure is never cached: a 404 held for five minutes keeps a product
published a moment ago missing for five more, and a cached 500 spreads one bad
render across every visitor.

| Endpoints | Window |
| --- | --- |
| `products`, `products/{slug}`, `collections`, `collections/{slug}` | 5 minutes |
| `faqs`, `settings` | 15 minutes |

Writes, and failed reads, carry Laravel's default `Cache-Control: no-cache,
private` instead.

**This is why a sold-out size can still render as available for a few
minutes.** The picker is advisory by design; `POST /orders` is what is
authoritative, and its `409` is a normal path through checkout, not an edge
case. Handle it in the cart UI from the start.

For ISR, `revalidate: 300` on catalogue pages and `900` on FAQ and settings
matches these windows.

---

## TypeScript types

Enough to type the client. The fixed shapes are deliberate: every key is always
present, so these need no optional properties except where a value is genuinely
nullable.

```ts
type Minor = number; // integer minor units: 12000 is $120.00

export type Image = {
  src: string;
  alt: string;
  width: number | null;  // always null on a collection hero
  height: number | null;
};

/* Only `nameTail` is nullable: every other copy field on a product is
   required by the admin, so it is a string or the product does not exist. */
export type ProductCard = {
  slug: string;
  name: string;
  nameLead: string;
  nameTail: string | null;
  number: string;
  fleece: string;
  dot: string;        // 7-char hex, e.g. "#C98763"
  threads: string;
  short: string;
  motif: string;
  motifNote: string;
  price: Minor;
  currency: string;
  isFeatured: boolean;
  inStock: boolean;
  hoodie: Image | null;
};

export type Variant = { size: string; inStock: boolean; price: Minor };

export type Figure = {
  src: string;
  alt: string;
  caption: string | null;
  note: string | null;
  ratio: '3/4' | '1/1' | '4/5' | null;
  plain: boolean;
  position: string | null;
};

export type Product = ProductCard & {
  description: string;
  story: string;
  artHeading: string[];    // one or two lines
  closeHeading: string[];
  pair: string | null;
  sizes: string[];
  variants: Variant[];
  gallery: Image[];
  figures: Figure[];
  collections: { slug: string; name: string }[];
  related: ProductCard[];
};

export type CollectionCard = {
  slug: string;
  name: string;
  nameLead: string;
  nameTail: string | null;
  short: string;
  heroImage: Image | null;
  productCount: number;
};

export type Collection = CollectionCard & {
  description: string | null;
  products: ProductCard[];
};

export type Faq = { question: string; answer: string };

export type Settings = {
  brandName: string | null;
  currency: string | null;
  currencySymbol: string | null;
  shippingFlat: Minor | null;
  taxRateBp: number | null;
  sizes: string[];
  notes: Record<
    | 'shipping' | 'returns' | 'fabric' | 'fit' | 'care'
    | 'sizeGuide' | 'delivery' | 'deliveryMethods' | 'embroidery',
    string | null
  >;
  contact: Record<
    'email' | 'instagram' | 'otherSocial' | 'hours' | 'responseTime',
    string | null
  >;
};

export type OrderStatus =
  | 'awaiting_payment' | 'paid' | 'shipped' | 'cancelled' | 'refunded';

export type Order = {
  orderNumber: string;
  status: OrderStatus;
  email: string;
  subtotal: Minor;
  discount: Minor;
  shipping: Minor;
  tax: Minor;
  total: Minor;
  currency: string;
  discountApplied: boolean;
  discountCode: string | null;
  items: {
    slug: string;
    name: string;
    size: string;
    qty: number;
    unitPrice: Minor;
    lineTotal: Minor;
  }[];
  paymentInstructions: string;
  shippedAt: string | null;       // ISO 8601 UTC
  trackingCarrier: string | null;
  trackingNumber: string | null;
  createdAt: string;              // ISO 8601 UTC
};

export type CartLine = { slug: string; size: string; qty: number };

export type DiscountCheck =
  | {
      valid: true;
      code: string;
      type: 'percent' | 'fixed';
      discount: Minor;
      message: string;
    }
  | {
      valid: false;
      reason:
        | 'not_found' | 'inactive' | 'not_started'
        | 'expired' | 'exhausted' | 'below_minimum';
      message: string;
    };

/* Envelopes */
export type Single<T> = { data: T };
export type Paginated<T> = {
  data: T[];
  meta: { page: number; perPage: number; total: number; lastPage: number };
  links: { next: string | null };
};
export type Accepted = { ok: true };

/* Failures */
export type ValidationError = {
  message: string;
  errors: Record<string, string[]>;
};

export type CartConflict = {
  message: string;
  errors: {
    slug: string;
    size: string;
    reason: 'insufficient_stock' | 'unavailable';
    available?: number;  // insufficient_stock only
  }[];
};
```

A checkout handler has three outcomes to tell apart, and the status code is
what distinguishes them:

```ts
const res = await fetch(`${base}/orders`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify(order),
});

if (res.status === 201) {
  const { data }: Single<Order> = await res.json();
  return { ok: true, order: data };
}

if (res.status === 409) {
  // Stock moved under the customer. Correct the cart from `available`
  // and let them try again — nothing they typed was wrong.
  const conflict: CartConflict = await res.json();
  return { ok: false, conflict };
}

if (res.status === 422) {
  const invalid: ValidationError = await res.json();
  return { ok: false, invalid };
}

if (res.status === 429) {
  const wait = Number(res.headers.get('Retry-After') ?? 60);
  return { ok: false, retryAfter: wait };
}

throw new Error(`Checkout failed: ${res.status}`);
```
