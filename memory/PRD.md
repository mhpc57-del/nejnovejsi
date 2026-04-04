# CraftBolt - PRD & Project Status

## Popis projektu
CraftBolt.cz — webová a mobilní platforma propojující řemeslníky/dodavatele se zákazníky v ČR.

## Architektura
- **Frontend Web:** React, Tailwind CSS, Vite
- **Frontend Mobilní:** React Native, Expo SDK 54
- **Backend:** FastAPI, MongoDB
- **Integrace:** Wedos SMTP, Twilio SMS, ARES, OpenStreetMap Geocoding, Stripe (MOCKED)

## Implementováno

### Web
- Registrace (4-5 kroků) + email verifikace + SMS notifikace
- Login s ověřením emailu (admin bypass)
- Dashboard zákazníka/dodavatele/admina
- Detail zakázky s editací (zákazník upraví název, popis, adresu, rozpočet, termín, fotky)
- Chat (zákazník vidí až po přijetí dodavatelem)
- Soft-accept workflow
- Geocoding + ARES + adresní autocomplete
- Mapa, hodnocení, upload fotek, deaktivace účtu
- Email + SMS notifikace s rate limitem
- Emergent badge + PostHog odstraněny
- Logo ve více rozlišeních (PNG, SVG)
- Robustní getImageUrl() pro správné zobrazení fotek

### Klíčové opravy (2026-04-04)
- Email verifikace kompletní flow
- SMS "Registrace proběhla úspěšně" při registraci
- getImageUrl() - řeší /api/uploads/, /uploads/, full URLs, None
- Profil nepodnikatel - skryty firemní pole
- Úprava zakázky zákazníkem (PUT /api/demands/{id})
- Chat skryt na otevřených poptávkách
- Admin demands endpoint - fix empty budget strings

## Testování (2026-04-04)
- Iteration 8-12: Všechny testy 100%

## Zbývající úkoly
### P1
- Synchronizace mobilní app s webem
- Service Area Map v mobilní registraci
- Push notifikace pro produkční APK

### P2
- Date picker (shadcn calendar)
- Dark mode, Biometrické přihlášení

## Mocked: Stripe (platby)
