# CraftBolt Mobile App - Build Guide

## Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g @expo/cli`
- Expo Go app on your phone (for development testing)

## Setup
```bash
cd /app/mobile
yarn install
```

## Development
```bash
npx expo start
```
Scan the QR code with Expo Go app on your phone.

## Push Notifications
Push notifications are automatically set up:
1. When user logs in, the app requests notification permissions
2. Expo Push Token is registered with the backend
3. Backend sends push notifications for:
   - New demands matching supplier categories
   - New offers from suppliers
   - New chat messages
   - Demand status changes

**Note:** Push notifications require a physical device (not emulator).
For production, you need to configure `projectId` in `notifications.js` with your actual Expo project ID.

## Production Build
```bash
# For Android
npx expo build:android

# For iOS
npx expo build:ios
```

Or using EAS Build (recommended):
```bash
npx eas-cli build --platform all
```

## API Configuration
The app connects to `https://craftbolt.cz/api`. 
To change the API URL, edit `src/services/api.js`.

## Project Structure
```
mobile/
  App.js                  # Entry point + push notification setup
  src/
    components/           # Reusable components
    navigation/           # Bottom tabs + stack navigator
    screens/
      LoginScreen.js      # Login with pricing info
      RegisterScreen.js   # 4-step registration wizard
      CustomerDashboard.js # Customer demands + creation
      SupplierDashboard.js # Available/in-progress/completed demands
      DemandDetailScreen.js # Demand detail + chat + actions
      ProfileScreen.js    # Profile editing + reviews
      NotificationsScreen.js # Notification list
      MapScreen.js        # Demand map view
    services/
      api.js              # Axios API client
    utils/
      AuthContext.js       # Auth state management
      theme.js             # Colors, shadows, fonts, radius
      notifications.js     # Expo push notification helpers
```

## Pricing Model (Current)
- **Customer**: FREE (demand creation)
  - Optional demand verification: 49 CZK
- **Supplier**: One-time payment
  - Monthly: 190 CZK
  - Annual: 1,890 CZK (save 390 CZK)
- All prices include 21% VAT
