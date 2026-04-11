# CraftBolt.cz - PRD (Product Requirements Document)

## Produkt
Platforma pro propojeni zakazniku s remeslniky a dodavateli sluzeb v Ceske republice.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Vite
- **Backend**: FastAPI, MongoDB
- **Mobile**: React Native (Expo), react-native-maps, expo-notifications
- **Integrace**: OpenAI GPT-4o (Emergent LLM Key), BulkGate SMS, Stripe (LIVE), Wedos SMTP, Expo Push

## Cenovy model (duben 2026)
- **Zakaznik**: ZDARMA, volitelne overeni poptavky za 49 Kc
- **Dodavatel**: 190 Kc/mesic NEBO 1.890 Kc/rok (uspora 390 Kc)
- **Reklamni banner**: 39 Kc/den NEBO 990 Kc/mesic
- Vsechny ceny vcetne 21% DPH, 14denni trial ZRUSEN
- Registrace pouze 2 role: Zakaznik, Dodavatel (mesicni/rocni)

## Posledni zmeny (11. duben 2026)
- Prepis ceniku: zakaznik zdarma, dodavatel 190/1890 Kc, promo 39/990 Kc
- Odstraneni 14denni trial periody kompletne
- Registrace: 3 moznosti (zakaznik, dodavatel mesicni, dodavatel rocni)
- Overeni poptavky za 49 Kc (Stripe checkout)
- Sekce "Vyhody" prepsana dle wireframu (2x5 karet)
- YouTube video sekce odstranena
- Dark mode audit: vsechny sekce responzivni light/dark
- Mobilni layout hero: Nadpis -> Fotka -> Kategorie -> CTA
- Footer logo opraveno (onDark prop)
- Komponentizace HomePage (820 -> 208 radku + 11 komponent)
- CustomerDashboard kompletne prestaveny (sidebar navigace, profil, vydaje, poptavky dle statusu)
- SupplierDashboard kompletne prestaveny (sidebar, profil, prijmy, overene/neoverene zakazky)
- Promo checkout opraven (STRIPE_LIVE_KEY)
- Countdown timer na promo bannerech
- Cas v headeru widgetu (aktualizace kazdych 30s)
- Client-side komprese fotek pred uploadem (max 1200px, JPEG 80%)
- Info o max rozmerech u vsech upload policek
- Oddelene mini mapy pod kazdou adresou v registraci
- BulkGate credentials aktualizovany (App ID 37414, profil odesilatele 18254)
- SMS error handling opraven (non-JSON response)
- FAQ: odstranena otazka o zpoplatneni
- "Nejlevnejsi platforma" popis zmenen na "Nepotrebujeme zbohatnout. Pomahame lidem."

## Backlog
- Overit SMS na produkci (BulkGate za WEDOS WAF)
- Overit upload fotek na produkci
- Overit promo platbu na produkci
- Dalsi vylepseni dle pozadavku uzivatele
- React Native mobilni app (PAUSED)
