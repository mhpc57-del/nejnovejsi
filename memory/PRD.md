# CraftBolt - PRD & Project Status

## Popis projektu
CraftBolt.cz — webová a mobilní platforma propojující řemeslníky/dodavatele se zákazníky v České republice.

## Architektura
- **Frontend Web:** React, Tailwind CSS, Vite
- **Frontend Mobilní:** React Native, Expo SDK 54
- **Backend:** FastAPI, MongoDB
- **Integrace:** Wedos SMTP, Twilio SMS, Stripe (MOCKED), ARES

## Co je implementováno

### Web (HOTOVO)
- Registrace/přihlášení (zákazník, dodavatel, admin)
- Dashboard zákazníka s poptávkami, stat kartami
- Dashboard dodavatele s filtry (dostupné/probíhající/dokončené/nedokončené)
- Detail zakázky s chatem v reálném čase, závazným/nezávazným přijetím
- Soft-accept workflow (5 předem definovaných důvodů)
- Geocoding + ARES integrace
- Mapa s lokacemi zákazníků a dodavatelů
- Systém hodnocení s procentuálním skóre
- Skóre dochvilnosti dodavatelů (0-100%)
- Upload dokumentů a fotek
- Deaktivace účtu (soft delete) s admin restore
- Termín realizace v poptávce
- Emailové + SMS notifikace
- Admin dashboard
- Profil s fotoaparátem/galerií (mobilní web)
- Spodní navigační lišta (mobilní web)
- Klikatelné profily zákazníků/dodavatelů

### Mobilní aplikace (HOTOVO - 2026-04-01)
- **Login/Register:** Ionicons ikony, zobrazení hesla, 3-krokový registrační proces s progress bar
- **Dashboard zákazníka:** Stat karty s filtrováním, FAB tlačítko, nová poptávka s fotkami
- **Dashboard dodavatele:** 4 taby (Dostupné/Rozdělané/Dokončené/Nedokončené), badge počty, celkové příjmy
- **Detail zakázky:** Závazné/nezávazné přijetí, chat, dorazil jsem, dokončit, zrušit, fotky
- **Oznámení (Notifications):** Obrazovka se soft-accepty, přijatými zakázkami, dokončenými, příjezdy
- **Profil:** Upload profilové fotky (fotoaparát/galerie → backend), editace, hodnocení, dochvilnost, kategorie
- **Hodnocení:** Modal s 1-5 hvězdami a komentářem po dokončení zakázky
- **Fotky v poptávce:** Zákazník může přidávat fotky z galerie/fotoaparátu
- **Navigace:** Bottom tabs (Přehled, Oznámení, Profil) s Ionicons
- **Safe Area:** Respektuje notch a navigační gesta telefonu
- **API:** Plně napojeno na craftbolt.cz/api

### Email rate limiting (HOTOVO - 2026-04-01)
- Chat notifikace: max 1 email za 15 min na konverzaci
- Nové poptávky: max 20 dodavatelů obdrží email
- Denní limit: 400 emailů (pod Wedos limitem 500)

## Zbývající úkoly

### P0 (Kritické)
- (žádné)

### P1 (Důležité)
- Push notifikace (Firebase Cloud Messaging) pro mobilní app
- Sestavení .apk pro Google Play (`eas build -p android`)
- Plná parita funkcí s webem (mapové zobrazení v mobilu, admin v mobilu)

### P2 (Nice to have)
- Offline podpora v mobilní app
- Animace přechodů mezi obrazovkami
- Dark mode
- Biometrické přihlášení (otisk prstu)

## Mocked integrace
- Stripe (platby) — MOCKED

## Přihlašovací údaje
Viz `/app/memory/test_credentials.md`
