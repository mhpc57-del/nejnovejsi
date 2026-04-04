# CraftBolt - PRD & Project Status

## Popis projektu
CraftBolt.cz — webová a mobilní platforma propojující řemeslníky/dodavatele se zákazníky v České republice.

## Architektura
- **Frontend Web:** React, Tailwind CSS, Vite
- **Frontend Mobilní:** React Native, Expo SDK 54
- **Backend:** FastAPI, MongoDB
- **Integrace:** Wedos SMTP, Twilio SMS, ARES, OpenStreetMap Geocoding, Stripe (MOCKED)

## Co je implementováno

### Web (HOTOVO)
- Registrace se 4-5 krokovým procesem + email verifikace + SMS notifikace
- Login s ověřením emailu (admin bypasses verifikaci)
- Dashboard zákazníka (stat karty, poptávky, nová poptávka s fotkami)
- Dashboard dodavatele (4 taby, filtry, badge počty)
- **Detail zakázky s editací** - zákazník může upravit název, popis, adresu, rozpočet, termín, přidat/odebrat fotografie
- Chat - zákazník vidí chat až po přijetí zakázky dodavatelem (ne na otevřených)
- Soft-accept workflow (5 důvodů)
- Geocoding + ARES integrace
- Mapa s lokacemi, live tracking
- Systém hodnocení (hvězdy + procenta)
- Upload dokumentů a fotek (public i auth endpoint)
- Deaktivace účtu s admin restore
- Emailové + SMS notifikace s rate limitem
- Landing page (SMS/99Kč/RealTime ikony, bez Emergent badge)

### Klíčové opravy (2026-04-04)
- Email verifikace kompletní flow
- SMS notifikace při registraci
- Fotografie při registraci (přímý file input)
- Profil nepodnikatel - skryty firemní pole
- Úprava zakázky zákazníkem (PUT /api/demands/{id})
- Chat skryt pro zákazníky na otevřených poptávkách
- Emergent badge + PostHog analytics kompletně odstraněny
- Title stránky: "CraftBolt | Platforma pro řemeslníky"
- Logo ve více rozlišeních (PNG 16-1024px, SVG vector, transparent, wordmark)

### Mobilní aplikace (HOTOVO)
- Login/Register, Dashboard zákazníka/dodavatele
- Mapa zakázek, Detail zakázky, Profil
- EAS Build konfigurace

## Testování (2026-04-04)
- Iteration 8: 17/17 backend (100%)
- Iteration 9: Kompletní E2E (100%)
- Iteration 10: Email verifikace (100%)
- Iteration 11: Úprava zakázky + Emergent badge (17/17 backend + E2E frontend, 100%)

## Zbývající úkoly

### P1 (Důležité)
- Synchronizace mobilní app s webovou platformou (email verifikace, edit demand)
- Service Area Map v mobilní registraci
- Push notifikace re-integrace pro produkční APK

### P2 (Nice to have)
- Shadcn calendar místo nativního date pickeru
- Dark mode, Biometrické přihlášení
- Crop screen text viditelnost (mobilní)

## Logo soubory
Dostupné na: /logo/ (relativní cesta na webu)
- cb-icon-{16,32,64,128,192,256,512,1024}.png (bílé pozadí)
- cb-icon-{128,256,512,1024}-transparent.png (průhledné pozadí)
- cb-icon.svg, cb-icon-transparent.svg (vektorové)
- craftbolt-wordmark-{600x150,1200x300,2400x600}.png
- craftbolt-wordmark.svg (vektorový wordmark)

## Klíčové API endpointy
- POST /api/auth/register → {message, email, requires_verification:true}
- GET /api/auth/verify-email/:token
- POST /api/auth/resend-verification
- POST /api/auth/login → 403 EMAIL_NOT_VERIFIED / 200 + token
- PUT /api/demands/{id} → edit demand (customer owner or admin)
- GET /api/geocode/search?q={query}
- GET /api/categories / POST /api/categories/suggest
- GET /api/ares/{ico}
- POST /api/upload / POST /api/upload/public

## Mocked integrace
- Stripe (platby) — MOCKED
