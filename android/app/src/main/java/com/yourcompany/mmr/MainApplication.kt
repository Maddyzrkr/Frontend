package com.yourcompany.mmr

import android.app.Application

/**
 * Simplified MainApplication that doesn't rely on React Native or Expo
 * This is just to get the build working with Firebase
 */
class MainApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        // Initialize Firebase here if needed
    }
}
