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
- Registrace/přihlášení (zákazník nepodnikatel/OSVČ/firma, dodavatel nepodnikatel/OSVČ/firma, admin)
- 4-5 krokový registrační proces s ARES, geocodingem, kategoriemi
- Dashboard zákazníka s poptávkami, stat kartami
- Dashboard dodavatele s filtry, 4 taby
- Detail zakázky s chatem, závazným/nezávazným přijetím
- Soft-accept workflow
- Geocoding + ARES integrace
- Mapa s lokacemi
- Systém hodnocení
- Skóre dochvilnosti dodavatelů
- Upload dokumentů a fotek (public i auth endpoint)
- Deaktivace účtu s admin restore
- Emailové + SMS notifikace s rate limitem
- Landing page s konzistentními stat ikonami (SMS/99Kč/RealTime)

### Opravy (2026-04-04)
- **Backend registrace:** Email notifikace přesunuta do BackgroundTasks - okamžitá odpověď
- **Landing page:** Tři stat ikony přepracovány na konzistentní styl s ikonami (SMS notifikace, 99 Kč/měs. bez dalších poplatků, RealTime sledování příjezdů)
- **Custom category suggest:** Opraven field name `category_name` -> `name` v RegisterPage i ProfilePage
- **API timeout mobile:** Zvýšen z 15s na 30s
- **Mobile adresní našeptávač:** FlatList s elevation a zIndex
- **Mobile kategorie:** nestedScrollEnabled
- **Mobile app ikona:** CB černé/oranžové na bílém pozadí

### Mobilní aplikace (HOTOVO)
- Login/Register, Dashboard zákazníka/dodavatele
- Mapa zakázek, Detail zakázky
- Profil, Push notifikace (deaktivovány pro Expo Go)
- EAS Build konfigurace

### Email rate limiting (HOTOVO)
- Chat: max 1 email za 15 min na konverzaci
- Nové poptávky: max 20 dodavatelů
- Denní limit: 400 emailů

## Testování (2026-04-04)
- Iteration 8: 17/17 backend API testů prošlo (100%)
- Iteration 9: Kompletní E2E frontend testování - všechny flows prošly (registrace, login, dashboardy, poptávky, profil, admin)

## Zbývající úkoly

### P0 (Kritické)
- Uživatel otestuje opravy na telefonu a PC
- Uživatel aktualizuje produkční deployment na craftbolt.cz (EMAIL_NOT_VERIFIED chyba nereprodukována na preview)

### P1 (Důležité)
- Service Area Map selection v registraci dodavatele (mobilní app)
- Push notifikace re-integrace pro produkční APK
- Synchronizace mobilní app s webovou platformou

### P2 (Nice to have)
- Crop screen text viditelnost (mobilní)
- Dark mode
- Biometrické přihlášení

## Mocked integrace
- Stripe (platby) — MOCKED

## Klíčové API endpointy
- POST /api/auth/register (BackgroundTasks pro email)
- POST /api/auth/login
- GET /api/auth/me
- GET /api/geocode/search?q={query}
- GET /api/categories
- POST /api/categories/suggest (field: name)
- GET /api/ares/{ico}
- POST /api/upload (auth), POST /api/upload/public (no auth)
- POST /api/demands
- GET /api/demands/my
