# CraftBolt - PRD & Architecture

## Popis
Servisni trziste CraftBolt.cz - React + Vite + FastAPI + MongoDB

## Implementovano
- JWT auth + email verifikace + zapomenute heslo
- 3 role + admin, registrace (OSVC/Firma/Nepodnikatel), ARES
- Dark mode, SMS (Twilio), SMTP (Wedos), Stripe (199/299/399 Kc)
- Poptavky s mapou, chat s read tracking, profily, certifikaty, service area
- AI Chat (GPT), Quick Demand, Weather widget
- 3-option dokonceni, Nemohu provest, Financni prehled, Fotodokumentace
- Potvrzeni ceny dodavatelem, Prijmy dodavatele
- Admin Panel: uzivatele, zakazky, kategorie, faktury, REKLAMA
- Fakturacni system (PDF/XML/ZIP)
- Persistentni upload do MongoDB
- Rozsireny registracni formular: Oblast pusobeni + Portfolio (2026-04-09)
- Seskupene kategorie: Remesla (46) + Sluzby (78) = 124 (2026-04-10)
- Zabraneni prekladu prohlizecem: lang=cs, notranslate (2026-04-10)
- Kompletni UI/UX Redesign (2026-04-10)
- Homepage: "Jednoduše," oranzove, rocni cenovy prepinac, "TOPOVANI DODAVATELE" sekce (2026-04-11)
- Bug fixy (2026-04-11): SMS (Messaging Service SID), Chat dark mode, Promoted suppliers API
- Admin Reklama tab (2026-04-11): statistiky, tabulka, akce (prodlouzit/deaktivovat/smazat)
- **UI zmeny (2026-04-11)**:
  - Hero: "Jednoduše," oranzovou barvou
  - Promoted sekce: nadpis "TOPOVANÍ DODAVATELÉ" (oranžový, uppercase)
  - Zákaznický dashboard: přepracovaný modální seznam poptávek se 3 řádky (jméno, místo, datum) + ikony
  - Testováno: iterace 30 (5/5, 100%)

## Architektura
- Frontend: React + Vite + Tailwind CSS + Framer Motion (/app/frontend)
- Backend: FastAPI + MongoDB (/app/backend)
- Mobile: React Native Expo (/app/mobile) - PAUSOVANO

## Backlog
- P0: Stripe reklamni karty - nastavit spravny Stripe klic (ceka na uzivatele)
- P1: Stripe Live finalizace (ceka na uzivatele + ucetni)
- P1: Overeni Twilio SMS doruceni na produkci (po deployi)
- P2: Sledovani rychlosti dorucovani e-mailu pres Wedos SMTP
- P2: Mobilni aplikace - PAUSOVANO
