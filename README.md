# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
    npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

# MatchMyRide Map Configuration

## Map Styling and API Keys

The app uses MapLibre GL Native to display detailed maps with streets, buildings, and proper coloring. For the best map experience, you should get a free MapTiler API key.

### Getting a MapTiler API Key

1. Visit [MapTiler Cloud](https://cloud.maptiler.com/account/keys/)
2. Sign up for a free account
3. Go to your account and create a new API key
4. Copy the API key

### Adding Your API Key to the App

1. Open the file: `MMRF/utils/config.ts`
2. Replace the placeholder API key:

```typescript
// Change this:
export const MAPTILER_API_KEY = 'get_your_own_OpIi9ZULNHzrESv6T6MK';

// To your actual API key:
export const MAPTILER_API_KEY = 'your_actual_key_here';
```

### Map Features

The map has been configured with:

- Detailed OpenStreetMap styles showing buildings, roads, and proper coloring
- Zoom controls (positioned at bottom-right)
- Working pinch-to-zoom and pan gestures
- User location tracking
- Fallback map styles that work even without an API key

### Troubleshooting Map Issues

If you see "Request failed due to a permanent error: Canceled" in the logs, try these solutions:

1. Check your internet connection
2. Verify your MapTiler API key is valid
3. The app will automatically try different map styles if one fails
4. As a last resort, it will use a local OpenStreetMap style that works offline

### Customizing Map Appearance

You can customize the map appearance by changing the style URLs in `MMRF/utils/config.ts`. MapTiler offers various styles like:

- OpenStreetMap
- Streets
- Outdoor
- Satellite
- Basic

Visit [MapTiler Styles](https://cloud.maptiler.com/maps/) to explore different options.
