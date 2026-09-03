package com.srivatsan.vibentra

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.srivatsan.vibentra.navigation.AppNavigation
import com.srivatsan.vibentra.theme.DarkBackground
import com.srivatsan.vibentra.theme.VibentraTheme

/**
 * MainActivity for Vibentra Native Kotlin UI
 * Edge-to-edge hardware accelerated presentation with zero WebView lag.
 */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Enable modern immersive edge-to-edge display
        enableEdgeToEdge()

        setContent {
            VibentraTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = DarkBackground
                ) {
                    AppNavigation()
                }
            }
        }
    }
}
