#!/bin/bash

# This script helps create and manage dev builds for low-resource systems

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting lightweight dev build process...${NC}"

# Function to check if Android device is connected
check_device() {
  adb devices | grep -q "device$"
  if [ $? -ne 0 ]; then
    echo -e "${RED}No Android device detected!${NC}"
    echo -e "${YELLOW}Please connect your Android device via USB and enable USB debugging.${NC}"
    echo -e "Instructions:"
    echo -e "1. Enable Developer Options (tap Build Number 7 times in Settings > About phone)"
    echo -e "2. Enable USB debugging in Developer Options"
    echo -e "3. Connect your device via USB"
    echo -e "4. Accept the debugging prompt on your device"
    exit 1
  else
    echo -e "${GREEN}Android device detected!${NC}"
  fi
}

# Check if we need to create a new build
if [ "$1" == "build" ]; then
  echo -e "${YELLOW}Preparing for build...${NC}"
  
  # Set environment variables to reduce memory usage
  export NODE_OPTIONS=--max_old_space_size=2048
  
  # Clean up node_modules/.cache to free up space
  rm -rf node_modules/.cache
  
  # Generate native code
  echo -e "${YELLOW}Generating native code... This may take a while on low-resource systems.${NC}"
  npx expo prebuild --clean --no-install
  
  # Build Android app
  echo -e "${YELLOW}Building Android development app...${NC}"
  cd android && ./gradlew assembleDebug -Dorg.gradle.jvmargs="-Xmx1536m" && cd ..
  
  echo -e "${GREEN}Build complete!${NC}"
  echo -e "${YELLOW}Now run 'bash scripts/dev-build.sh install' to install on your device.${NC}"
  
  exit 0
fi

# Install the build on a connected device
if [ "$1" == "install" ]; then
  check_device
  
  echo -e "${YELLOW}Installing app on device...${NC}"
  adb install -r android/app/build/outputs/apk/debug/app-debug.apk
  
  echo -e "${GREEN}Installation complete!${NC}"
  echo -e "${YELLOW}Now run 'npx expo start --dev-client' to start development server.${NC}"
  
  exit 0
fi

# Start the dev server with optimized settings
if [ "$1" == "start" ]; then
  # Set environment variables to reduce memory usage
  export NODE_OPTIONS=--max_old_space_size=2048
  
  # Start dev server
  echo -e "${YELLOW}Starting development server...${NC}"
  npx expo start --dev-client
  
  exit 0
fi

# Display help if no valid argument is provided
echo -e "${YELLOW}Lightweight Dev Build Helper${NC}"
echo -e "Usage:"
echo -e "  ${GREEN}bash scripts/dev-build.sh build${NC}   - Create a development build"
echo -e "  ${GREEN}bash scripts/dev-build.sh install${NC} - Install build on connected device"
echo -e "  ${GREEN}bash scripts/dev-build.sh start${NC}   - Start development server"
echo -e ""
echo -e "${YELLOW}Recommended workflow:${NC}"
echo -e "1. Connect your Android device via USB"
echo -e "2. Run 'bash scripts/dev-build.sh build' to create the build (only needed once or when adding native modules)"
echo -e "3. Run 'bash scripts/dev-build.sh install' to install on your device"
echo -e "4. Run 'bash scripts/dev-build.sh start' to start development"
echo -e "5. Scan the QR code with your device or open the development client manually" 