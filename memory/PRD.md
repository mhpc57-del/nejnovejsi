# CraftBolt - PRD & Project Status

## Popis projektu
CraftBolt.cz — webová a mobilní platforma propojující řemeslníky/dodavatele se zákazníky v České republice.

## Architektura
- **Frontend Web:** React, Tailwind CSS, Vite
- **Frontend Mobilní:** React Native, Expo SDK 54
- **Backend:** FastAPI, MongoDB
- **Integrace:** Wedos SMTP, Twilio SMS, Expo Push Notifications, Stripe (MOCKED), ARES, OpenStreetMap Geocoding

## Co je implementováno

### Web (HOTOVO)
- Registrace/přihlášení se 4-5 krokovým procesem
- **Email verifikace:** Po registraci se zobrazí "Ověřte svůj email" obrazovka. Uživatel nemůže přihlásit bez ověření. Endpoint /api/auth/verify-email/:token. Možnost znovu odeslat verifikační email.
- Dashboard zákazníka s poptávkami, stat kartami
- Dashboard dodavatele s filtry, 4 taby
- Detail zakázky s chatem, závazným/nezávazným přijetím
- Soft-accept workflow
- Geocoding + ARES integrace
- Mapa s lokacemi
- Systém hodnocení
- Upload dokumentů a fotek (public i auth endpoint)
- Deaktivace účtu s admin restore
- Emailové + SMS notifikace s rate limitem
- Landing page s konzistentními stat ikonami

### Mobilní aplikace (HOTOVO)
- Login/Register, Dashboard zákazníka/dodavatele
- Mapa zakázek, Detail zakázky, Profil
- EAS Build konfigurace

### Klíčové opravy (2026-04-04)
- **Email verifikace kompletní flow** (backend + frontend)
- **Fotografie při registraci** - zjednodušeno na přímý file input (bez dropdown menu)
- **Profil nepodnikatel** - skryty firemní pole (IČO, DIČ, Název firmy, Sídlo, Pobočka)
- **Login stránka** - zobrazí oranžovou zprávu "Email nebyl ověřen" s tlačítkem pro znovu odeslání
- **Landing page ikony** - SMS/99Kč/RealTime s konzistentními ikonami
- **Custom category suggest** - opraven field name
- **Backend registrace** - email v BackgroundTasks

## Testování (2026-04-04)
- Iteration 8: 17/17 backend testů (100%)
- Iteration 9: Kompletní E2E testování (100%)
- Iteration 10: 15/15 backend + E2E frontend testů (100%) - email verifikace

## Zbývající úkoly

### P1 (Důležité)
- Service Area Map v mobilní registraci
- Push notifikace re-integrace pro produkční APK
- Synchronizace mobilní app s webovou platformou (email verifikace flow)

### P2 (Nice to have)
- Crop screen text viditelnost (mobilní)
- Dark mode
- Biometrické přihlášení
- Shadcn calendar místo nativního date pickeru

## Mocked integrace
- Stripe (platby) — MOCKED

## Klíčové API endpointy
- POST /api/auth/register → {message, email, requires_verification:true}
- GET /api/auth/verify-email/:token → ověří email
- POST /api/auth/resend-verification → znovu odešle verifikační email
- POST /api/auth/login → 403 EMAIL_NOT_VERIFIED pro neověřené, 200 + token pro ověřené
- GET /api/auth/me
- GET /api/geocode/search?q={query}
- GET /api/categories
- POST /api/categories/suggest (field: name)
- GET /api/ares/{ico}
- POST /api/upload (auth), POST /api/upload/public (no auth)
