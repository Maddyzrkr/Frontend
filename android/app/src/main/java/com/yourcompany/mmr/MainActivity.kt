package com.yourcompany.mmr

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity

/**
 * Simplified MainActivity that doesn't rely on React Native or Expo
 * This is just to get the build working with Firebase
 */
class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Set a simple content view
        setContentView(android.R.layout.simple_list_item_1)
    }
}
