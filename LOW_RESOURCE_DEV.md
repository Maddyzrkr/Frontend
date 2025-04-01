# Optimized Development on Low-Resource Systems for MatchMyRide

This guide provides step-by-step instructions for developing the MatchMyRide app on low-resource systems (like a 4GB RAM laptop with Xubuntu).

## Why Use Expo Dev Build (Development Client)?

The app uses MapLibre GL for mapping, which requires native code that isn't supported in the standard Expo Go client. A development build is necessary, but we've optimized the process to work well on systems with limited resources.

## Initial Setup (One-Time)

### 1. Prerequisites (Already installed)

- Android SDK Command-line Tools
- ADB (Android Debug Bridge)
- Node.js and npm

### 2. Prepare Your Android Device (Physical Device)

1. Enable Developer Options:
   - Go to Settings > About phone
   - Tap Build Number 7 times until you see "You are now a developer!"

2. Enable USB Debugging:
   - Go to Settings > System > Developer options
   - Enable USB debugging
   - Connect your device via USB
   - Accept the debugging authorization prompt on your device

3. Test Connection:
   ```bash
   adb devices
   ```
   - You should see your device listed as "device"

## Development Workflow

### First-Time Build

Run this command only once initially, or when adding new native modules:

```bash
npm run build-dev
```

This will:
- Generate the native code required by MapLibre GL
- Build a debug APK for your Android device
- Use optimized memory settings for your low-resource system

### Install on Device

After the build is complete, install it on your connected device:

```bash
npm run install-dev
```

### Start Development

Once installed, start the development server with:

```bash
npm run start-dev
```

Your device will need to connect to this server. Either:
- Scan the QR code with your device's camera
- Open the development client app directly on your device

### Memory Optimization

If your system starts to slow down during development:

```bash
npm run optimize
```

This clears caches and optimizes memory usage.

## Troubleshooting

### Device Not Detected

```bash
adb kill-server
adb start-server
adb devices
```

### Development Client Not Connecting

1. Ensure your phone and computer are on the same WiFi network
2. Try using a USB connection instead
3. Check if you need to manually enter the IP address of your computer

### App Crashing

If the app crashes when starting MapLibre GL:
1. Ensure you built with `npm run build-dev`
2. If you add any new dependencies related to mapping, rebuild with `npm run build-dev`

### System Too Slow

1. Close other applications
2. Run `npm run optimize`
3. Consider adding a swap file:
   ```bash
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

## Key Commands Reference

| Command | Description |
|---------|-------------|
| `npm run build-dev` | Build development client (once or when adding native modules) |
| `npm run install-dev` | Install the build on your device |
| `npm run start-dev` | Start development server |
| `npm run optimize` | Optimize memory usage |
| `adb devices` | Check connected devices | 