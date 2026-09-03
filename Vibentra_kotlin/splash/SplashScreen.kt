package com.srivatsan.vibentra.splash

import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.srivatsan.vibentra.components.LiquidGlassBackground
import com.srivatsan.vibentra.components.SoundWaveIndicator
import com.srivatsan.vibentra.theme.*
import kotlinx.coroutines.delay

/**
 * Vibentra Native Splash Screen
 * Exact visual & animation replica of frontend/index.html & app.js
 */
@Composable
fun SplashScreen(
    onNavigateToHome: () -> Unit,
    onNavigateToAuth: () -> Unit,
    isUserLoggedIn: Boolean = false
) {
    // Pulse animation for the logo
    val infiniteTransition = rememberInfiniteTransition(label = "splash_logo_pulse")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 0.96f,
        targetValue = 1.04f,
        animationSpec = infiniteRepeatable(
            animation = tween(1500, easing = EaseInOutSine),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseScale"
    )

    // Fade-in animation on launch
    var contentVisible by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        contentVisible = true
        // 1.5 second display matching app.js fallback timeout
        delay(1500)
        if (isUserLoggedIn) {
            onNavigateToHome()
        } else {
            onNavigateToAuth()
        }
    }

    LiquidGlassBackground {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                // Circular Glowing Logo (120dp) matching index.html
                Box(
                    modifier = Modifier
                        .scale(pulseScale)
                        .size(120.dp)
                        .shadow(
                            elevation = 30.dp,
                            shape = CircleShape,
                            spotColor = PrimaryPurple,
                            ambientColor = PrimaryCyan
                        )
                        .clip(CircleShape)
                        .background(
                            brush = Brush.radialGradient(
                                colors = listOf(Color(0xFF1E1B4B), DarkSurface)
                            )
                        )
                        .border(
                            BorderStroke(
                                2.dp,
                                Brush.sweepGradient(listOf(PrimaryPurple, PrimaryCyan, SecondaryCyan, PrimaryPurple))
                            ),
                            shape = CircleShape
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.MusicNote,
                        contentDescription = "Vibentra Logo",
                        tint = SecondaryCyan,
                        modifier = Modifier.size(56.dp)
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Brand Title: VIBENTRA
                Text(
                    text = "VIBENTRA",
                    fontSize = 32.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Color.White,
                    letterSpacing = 4.sp
                )

                Spacer(modifier = Modifier.height(8.dp))

                // Tagline: "Sound of India"
                Text(
                    text = "\"Sound of India\"",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Normal,
                    color = SecondaryCyan,
                    letterSpacing = 1.sp
                )

                Spacer(modifier = Modifier.height(36.dp))

                // 5-bar animated soundwave matching .soundwave in index.html
                SoundWaveIndicator(
                    barCount = 5,
                    maxHeight = 36.dp,
                    barWidth = 4.dp,
                    spacing = 7.dp
                )
            }
        }
    }
}
