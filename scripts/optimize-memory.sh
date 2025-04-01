#!/bin/bash

# This script helps optimize memory usage for React Native development on low-resource systems

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Running memory optimization for low-resource systems...${NC}"

# Clear npm cache
echo -e "Clearing npm cache..."
npm cache clean --force

# Clear Metro bundler cache
echo -e "Clearing Metro bundler cache..."
rm -rf $HOME/.metro

# Clear temp files
echo -e "Clearing temporary files..."
rm -rf /tmp/metro-*
rm -rf /tmp/haste-map-*

# Clean watchman state if installed
if command -v watchman &> /dev/null; then
    echo -e "Resetting Watchman..."
    watchman watch-del-all
fi

# Clear Android build cache
echo -e "Clearing Android build cache..."
if [ -d "android" ]; then
    cd android && ./gradlew cleanBuildCache && cd ..
fi

# Optimize Node.js memory
echo -e "Setting up memory limits for Node.js..."
export NODE_OPTIONS=--max_old_space_size=2048

# Display system memory info
echo -e "${GREEN}Memory optimization complete!${NC}"
echo -e "${YELLOW}Current system memory status:${NC}"
free -h

echo -e "\n${YELLOW}Memory optimization tips:${NC}"
echo -e "1. Close other applications when developing"
echo -e "2. Use physical device instead of emulator"
echo -e "3. Consider adding a swap file if you haven't already:"
echo -e "   sudo fallocate -l 2G /swapfile"
echo -e "   sudo chmod 600 /swapfile"
echo -e "   sudo mkswap /swapfile"
echo -e "   sudo swapon /swapfile"
echo -e "4. Run this script whenever development gets sluggish" 