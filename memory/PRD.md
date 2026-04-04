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
- Registrace/přihlášení (zákazník, dodavatel, admin)
- Dashboard zákazníka s poptávkami, stat kartami
- Dashboard dodavatele s filtry
- Detail zakázky s chatem, závazným/nezávazným přijetím
- Soft-accept workflow (5 důvodů)
- Geocoding + ARES integrace
- Mapa s lokacemi
- Systém hodnocení
- Skóre dochvilnosti dodavatelů
- Upload dokumentů a fotek
- Deaktivace účtu s admin restore
- Emailové + SMS notifikace s rate limitem

### Mobilní aplikace (HOTOVO)
- **Login/Register:** Ionicons, 4-krokový registrační proces (dodavatel: login údaje -> typ účtu -> osobní + firemní údaje -> kategorie)
- **Dashboard zákazníka:** Stat karty, FAB, nová poptávka s fotkami (kamera + galerie)
- **Dashboard dodavatele:** 4 taby, badge počty, celkové příjmy
- **Mapa zakázek:** react-native-maps, filtrování podle stavu, GPS lokace uživatele, callout s detailem
- **Detail zakázky:** Závazné/nezávazné přijetí, chat, dorazil jsem, dokončit, zrušit, fotky, hodnocení
- **Oznámení:** Soft-accepty, přijaté zakázky, dokončené, příjezdy
- **Profil:** Upload fotky -> backend, editace, hodnocení, dochvilnost, kategorie, recenze
- **Navigace:** 4 bottom taby (Přehled, Mapa, Oznámení, Profil)
- **EAS Build:** Konfigurace pro preview APK a production AAB

### Opravy bugů (2026-04-04)
- **Registrace:** Email notifikace přesunuta do BackgroundTasks - odpověď se neblokuje SMTP odesíláním
- **Registrace:** Vylepšený error handling - rozlišení duplicitního emailu, validačních chyb, obecných chyb
- **Adresní našeptávač:** FlatList s nestedScrollEnabled, elevation, správný zIndex v RegisterScreen i CustomerDashboard
- **Kategorie:** FlatList s nestedScrollEnabled pro plynulé scrollování v modalu
- **API timeout:** Zvýšen z 15s na 30s pro spolehlivější spojení
- **App ikona:** Nová ikona CB (černé C, oranžové B na bílém pozadí)

### Backend push notifications (HOTOVO)
- Endpoint `POST /api/users/push-token` pro ukládání push tokenů
- `push_notifications.py` — Expo Push API sender
- Integrace do všech notification metod

### Email rate limiting (HOTOVO)
- Chat notifikace: max 1 email za 15 min na konverzaci
- Nové poptávky: max 20 dodavatelů
- Denní limit: 400 emailů

## Zbývající úkoly

### P0 (Kritické)
- Uživatel otestuje opravy na telefonu (registrace, našeptávač, kategorie)

### P1 (Důležité)
- Service Area Map selection v registraci dodavatele (IN PROGRESS)
- Push notifikace re-integrace pro produkční APK (Expo Go crash v SDK 54)
- Google Maps API klíč pro mapu na Androidu (nutné pro produkci)

### P2 (Nice to have)
- Crop screen text ("Oříznout") špatně viditelný
- Offline podpora v mobilní app
- Dark mode
- Biometrické přihlášení

## Mocked integrace
- Stripe (platby) — MOCKED

## Klíčové API endpointy
- POST /api/auth/register (BackgroundTasks pro email)
- POST /api/auth/login
- GET /api/auth/me
- GET /api/geocode/search?q={query}
- GET /api/geocode/reverse?lat={lat}&lon={lon}
- GET /api/categories
- POST /api/categories/suggest
- GET /api/ares/{ico}
- POST /api/demands
- GET /api/demands
