# CraftBolt.cz - PRD

## Produkt
Platforma pro propojeni zakazniku s remeslniky a dodavateli sluzeb v CR.

## Tech Stack
React + Tailwind | FastAPI + MongoDB | BulkGate SMS | Stripe LIVE | Wedos SMTP | OpenAI GPT-4o

## Klicove flow
- Dvoufazove dokonceni: Dodavatel oznaci → pending_completion → Zakaznik potvrdi/odmitne
- Spory: 2-krokovy formular, zakaznik reaguje
- SMS: http.client (WEDOS WAF), credentials hardcoded jako fallback

## Zmeny 12.-13. duben 2026
### Kriticke opravy
- FIX: location_sharing chybelo v user_to_response() → poloha se neukladala
- FIX: sms_notifications chybelo v MongoDB query projection → dodavateli nechodily SMS
- FIX: LocationUpdate model → Optional[float] pro null pri vypnuti sdileni
- FIX: BulkGate SMS → http.client misto requests (WEDOS WAF)
- FIX: BulkGate credentials hardcoded (produkce necte .env)
- FIX: SMS prepinac vizualni chyba + okamzite ukladani
- FIX: Kategorie sjednoceny (Elektrikari → Elektromontazni prace) + auto-migrace
- FIX: Tlacitko Zrusit zakazku — chybel onClick
- FIX: Mapa se zobrazuje i u neoverenych prijatych zakazek

### Nove funkce
- Dvoufazove potvrzeni dokonceni (pending_completion + zalozka K potvrzeni)
- Mobilni responzivita — scrollovatelne zalozky, responsive padding, spodni navigace
- Favicon — sestihran s oranzovou helmou
- Auto-refresh dashboardu (15s) + status polling (10s)
- Sdileni polohy se uklada do DB, auto-restore pri navratu
- Marketingove pocitadlo: +2450 zakazniku, +5359 dodavatelu

## Testovani
- iteration_36: 100% (mobilni responzivita + zakladni funkcnost)
- iteration_37: 100% (location sharing persistence + SMS to suppliers)

## Backlog
- P1: QR kody (ceka na banku)
- P1: Platebni moznosti (ceka na ucetni)
- P2: Admin sekce pro spory
- P2: Bezpecnostni zpevneni (Rate limiting, CSRF, XSS)
- P3: React Native app (pozastaveno)
