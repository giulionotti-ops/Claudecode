# Selling Neesmo (owner notes)

This file is not part of the copy buyers get, so keep it out of the download.

## Plan
- **Early access:** $49, paid once (draft price). Full release: $99.
- Early buyers get every update for free, including the full release. There is no subscription.
- 14-day free trial. When it ends, Neesmo stops answering (chat, voice, agent chat, uploads) until a key is added. Settings, the license page and the guide keep working.

## Store: Lemon Squeezy (you set this up; it needs your account)
Why Lemon Squeezy:
- It is the merchant of record, so it handles VAT and sales tax.
- It sends a license key by email.
- It limits how many servers a key can run on.
- There is no monthly fee; it takes a cut of each sale.

1. Create a store and a product called "Neesmo".
   - Add two variants: "Early access" ($49) and later "Full" ($99). Neesmo shows "early access" when the variant name contains "early".
   - Turn on license keys: activation limit 2, no expiry.
2. Put the product id and the checkout URL in `vega/license.py`:
   - `STORE_PRODUCT = "<id>"`
   - `BUY_URL = "https://<store>.lemonsqueezy.com/buy/<…>"`
3. Add the download file (the vega folder as a zip, without this file and without `.venv`). It goes only to buyers.
4. Put the same checkout URL in `site/index.html`, replacing `https://neesmo.example/buy`, and the contact email (now on `neesmo.example`).

Neesmo uses the store's license API with these calls:
- activate
- validate (weekly; 30 days of grace when offline)
- deactivate (when the buyer removes the key)

Signed offline keys still work for gifts or press: `python3 license.py issue --plan "early access" --to "Name"`.

## Piracy and clones: what helps, honestly
Neesmo runs as Python on the buyer's own server, so nobody can stop a determined person from editing the code. What we do:
- **Keys can't be forged.** Store keys are checked with the store. Signed keys use Ed25519, so only you hold the private key.
- **Keys can't be shared widely.** Each key works on 2 servers. A refunded or disabled key stops working within a week.
- **The code stays private.** Keep the GitHub repo private. Buyers get the zip only through the store.
- **Every key is tied to a name.** The buyer's name shows in Settings → License.
- **The trial ends.** After 14 days without a key, the core features stop.

Possible later steps:
- Ship updates only through the store download, or an update check that asks for a valid key.
- Compile the Python with Nuitka or Cython so the code is harder to edit.

Neither stops a determined cracker. Both raise the effort.

## Website
- The draft sales page is `site/index.html`, a static page you can host anywhere: Vercel, Netlify or Cloudflare Pages, all with free tiers.
- It is not published. Publish it once the prices and the checkout link are final.
