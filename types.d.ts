/// <reference types="react" />
/// <reference types="react-native" />

declare module 'expo-router' {
  import { NavigationState } from '@react-navigation/native';
  import type { ExpoConfig } from 'expo/config';
  import { ComponentProps } from 'react';
  
  export interface RouterProps {
    initialState?: NavigationState;
  }
  
  export function useRouter(): {
    push: (route: string) => void;
    replace: (route: string) => void;
    back: () => void;
  };
  
  export interface ScreenProps {
    name: string;
    options?: any;
    children?: React.ReactNode;
  }

  export interface TabsProps {
    screenOptions?: {
      tabBarIcon?: ({ color, size }: { color: string; size: number }) => React.ReactNode;
      tabBarLabel?: string;
      headerShown?: boolean;
      tabBarStyle?: any;
      tabBarActiveTintColor?: string;
      tabBarInactiveTintColor?: string;
      headerBackTitle?: string;
      headerBackTitleVisible?: boolean;
      headerTitle?: string;
      headerTintColor?: string;
      headerStyle?: any;
      headerTitleStyle?: any;
    };
    initialRouteName?: string;
    children?: React.ReactNode;
  }

  export const Tabs: React.ComponentType<TabsProps> & {
    Screen: React.ComponentType<ScreenProps>;
  };
  
  export const Stack: React.ComponentType<TabsProps> & {
    Screen: React.ComponentType<ScreenProps>;
  };

  export function useLocalSearchParams<T = any>(): T;
  
  export function useNavigation(): any;

  export const Link: React.ComponentType<{
    href: string;
    children: React.ReactNode;
    [key: string]: any;
  }>;

  export const Redirect: React.ComponentType<{
    href: string;
  }>;
}

declare module '@expo/vector-icons' {
  import { ComponentProps } from 'react';
  import { TextStyle, ViewStyle, StyleProp } from 'react-native';

  export interface IconProps {
    size?: number;
    color?: string;
    style?: StyleProp<TextStyle | ViewStyle>;
  }

  export const Ionicons: React.ComponentType<IconProps & {
    name: string;
  }>;

  export const MaterialIcons: React.ComponentType<IconProps & {
    name: string;
  }>;
}

declare module 'expo-status-bar' {
  import { StatusBarStyle } from 'react-native';
  
  interface StatusBarProps {
    style?: StatusBarStyle | 'auto' | 'inverted' | 'light' | 'dark';
  }
  
  export const StatusBar: React.ComponentType<StatusBarProps>;
}

declare module 'expo-image-picker' {
  export interface ImagePickerResult {
    canceled: boolean;
    assets?: Array<{
      uri: string;
      width: number;
      height: number;
      type?: string;
      fileName?: string;
    }>;
  }

  export interface ImagePickerOptions {
    mediaTypes: MediaTypeOptions;
    allowsEditing?: boolean;
    aspect?: [number, number];
    quality?: number;
  }

  export enum MediaTypeOptions {
    All = 'All',
    Videos = 'Videos',
    Images = 'Images',
  }

  export function requestCameraPermissionsAsync(): Promise<{ status: string }>;
  export function requestMediaLibraryPermissionsAsync(): Promise<{ status: string }>;
  export function launchImageLibraryAsync(options?: ImagePickerOptions): Promise<ImagePickerResult>;
  export function launchCameraAsync(options?: ImagePickerOptions): Promise<ImagePickerResult>;
}

declare module '@react-native-async-storage/async-storage' {
  export interface AsyncStorage {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
    clear(): Promise<void>;
    getAllKeys(): Promise<string[]>;
  }
  const AsyncStorage: AsyncStorage;
  export default AsyncStorage;
}

declare module '@react-navigation/stack' {
  export function createStackNavigator(): any;
}

// Add interfaces for your custom types
export interface Ride {
  id: string;
  provider: string;
  destination: string;
  fare: string;
}

export interface Location {
  latitude: number;
  longitude: number;
}

export interface Provider {
  id: string;
  name: string;
} 