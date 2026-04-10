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
- Admin Panel: uzivatele, zakazky, kategorie, faktury
- Fakturacni system (PDF/XML/ZIP)
- Persistentni upload do MongoDB
- Rozsireny registracni formular: Oblast pusobeni + Portfolio (2026-04-09)
- Seskupene kategorie: Remesla (46) + Sluzby (78) = 124 (2026-04-10)
- Zabraneni prekladu prohlizecem: lang=cs, notranslate (2026-04-10)
- Kompletni UI/UX Redesign (2026-04-10)
- Homepage updaty: "spolehlive", rocni cenovy prepinac, Promoted Suppliers sekce (2026-04-10)
- **Bug fixy (2026-04-11)**:
  - SMS: Opraveno pouzitim Twilio Messaging Service SID s Alpha Sender 'CraftBolt'
  - Chat dark mode: Opravena viditelnost textu v tmavem rezimu
  - Promoted suppliers: Opraveny 3 bugy (STRIPE_API_KEY, FRONTEND_URL, Plus import)
  - notifications.py: Opraveno self.sms_service.send_sms() na 2 mistech
- **Admin Reklama tab (2026-04-11)**:
  - Nova zalozka "Reklama" v Admin Panelu (Megaphone ikona)
  - 4 statisticke karty: Aktivni bannery, Expirovane, Prijmy za mesic, Prijmy celkem
  - Tabulka vsech promo dodavatelu s akcemi: prodlouzit (+1 den), deaktivovat, smazat
  - Backend endpointy: GET /api/admin/promoted-stats, DELETE/PUT /api/admin/promoted/{id}
  - Testovano: iterace 28 (100%) + iterace 29 (12/12 testu, 100%)

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
