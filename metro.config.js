// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add resolution for native modules
config.resolver.sourceExts = process.env.RN_SRC_EXT
  ? [...process.env.RN_SRC_EXT.split(',').concat(config.resolver.sourceExts), 'mjs']
  : [...config.resolver.sourceExts, 'mjs'];

// Ensure we can resolve node_modules packages correctly
config.resolver.disableHierarchicalLookup = false;
config.resolver.nodeModulesPaths = ['node_modules'];

// Create a simple no-op polyfill
const noopModule = {
  __esModule: true,
  default: () => {},
};

// Add Node.js module polyfills for React Native
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'debug': require.resolve('debug'),
  'ws': require.resolve('react-native-tcp-socket'),
  'net': require.resolve('react-native-tcp-socket'),
  'dgram': require.resolve('react-native-udp'),
  'crypto': require.resolve('react-native-randombytes'),
  'http': require.resolve('@tradle/react-native-http'),
  'https': require.resolve('@tradle/react-native-http'),
  'stream': require.resolve('stream-browserify'),
  'buffer': require.resolve('buffer'),
  // Use simple empty objects for these modules
  'child_process': { __esModule: true, default: () => {} },
  'fs': { __esModule: true, default: () => {} },
  'os': { __esModule: true, default: () => {} },
  'tls': { __esModule: true, default: () => {} },
  'zlib': { __esModule: true, default: () => {} },
};

// Add any packages that need to be included in the bundling
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config; 