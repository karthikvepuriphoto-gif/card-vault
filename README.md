# Card Vault

Card Vault is a private, ad-free collection tracker for sports cards and Pokémon cards. It is a progressive web app aimed at an iPad (Safari → Add to Home Screen) and it also works on iPhone.

Nothing in the collection is uploaded. Cards, photos, and prices stay in IndexedDB on the device. There is no account, no ads, and no analytics.

Live app, after GitHub Pages is enabled: <https://karthikvepuriphoto-gif.github.io/card-vault/>

## What you can do

- Add a card from the camera or the photo library. The front is enough; the back is optional. In-browser OCR (Tesseract.js) tries to fill the name, year, set, number, brand, and category. You review everything before it is saved. Typing a card in with no photo works too.
- Track condition (a raw note, or a PSA / BGS / SGC / CGC grade), quantity, what you paid, current value, when that value was last checked, where the card lives, notes, and a star.
- Browse big card tiles. Search, filter by category or stars, and sort by date added, name, or value. The total is “My collection is worth $X”, counted with quantity. A value older than 30 days is marked stale.
- For Pokémon, look the card up on the free [Pokémon TCG API](https://api.pokemontcg.io) and save a TCGplayer market price. Refresh it later. If the lookup fails, type a price instead.
- For sports cards — and as a fallback for anything — **Check sold prices** opens eBay sold and completed listings (`LH_Sold=1` and `LH_Complete=1`), including the grade when the card is graded. You type the value you want to keep.
- **Back up** writes one JSON file (photos included) through the iOS share sheet or a download, so it can be saved to iCloud Drive. Restore can merge or replace. There is also a CSV export without photos. If the last backup is older than 14 days, the collection reminds you.

## Develop

```bash
npm install
npm test
npm run dev
```

The dev server uses the GitHub Pages base path, so open `http://localhost:5173/card-vault/`.

```bash
npm run build
npm run preview
```

## Deploy

Pushes to `main` run `.github/workflows/pages.yml`, which tests, builds, and deploys `dist` with GitHub Actions. In the repository settings, set Pages → Build and deployment → Source to **GitHub Actions**. The site base path is `/card-vault/`.

The first photo read downloads the English OCR reader from jsDelivr. After that, the service worker and Tesseract’s own cache keep it on the device. Price lookup needs a connection. The rest of the app works offline.
