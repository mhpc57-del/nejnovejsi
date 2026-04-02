# Sestavení APK pro Google Play Store

## Předpoklady
1. Nainstalujte EAS CLI:
```bash
npm install -g eas-cli
```

2. Přihlaste se do Expo:
```bash
eas login
```
(Pokud nemáte účet, vytvořte si na https://expo.dev)

## Sestavení Preview APK (pro testování)

```bash
cd mobile
eas build -p android --profile preview
```

Toto vytvoří `.apk` soubor, který si můžete stáhnout a nainstalovat přímo na telefon.

## Sestavení Production AAB (pro Google Play)

```bash
cd mobile
eas build -p android --profile production
```

Toto vytvoří `.aab` (Android App Bundle) soubor pro nahrání do Google Play Console.

## Google Play Console

1. Jděte na https://play.google.com/console
2. Vytvořte novou aplikaci "CraftBolt"
3. Nastavte:
   - Název: CraftBolt
   - Package: cz.craftbolt.app
   - Kategorie: Služby / Řemeslníci
4. Nahrajte `.aab` soubor do sekce "Production" > "Create new release"
5. Vyplňte popis, screenshoty, ikonu
6. Odešlete ke kontrole

## Důležité poznámky

### Google Maps API klíč
Pro mapu v aplikaci potřebujete Google Maps API klíč:
1. Jděte na https://console.cloud.google.com
2. Vytvořte projekt
3. Zapněte "Maps SDK for Android"
4. Vytvořte API klíč
5. Vložte do `app.json` → `android.config.googleMaps.apiKey`

### Push notifikace
Push notifikace fungují automaticky přes Expo Push Service.
Pro produkci doporučujeme nastavit Firebase Cloud Messaging:
1. Vytvořte projekt na https://console.firebase.google.com
2. Stáhněte `google-services.json`
3. Vložte do složky `mobile/`

### EAS Project ID
Po prvním `eas build` se automaticky vygeneruje Project ID.
Bude přidán do `app.json` → `extra.eas.projectId`.
