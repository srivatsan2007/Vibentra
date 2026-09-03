package com.srivatsan.vibentra.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.srivatsan.vibentra.theme.*

/**
 * Hardware-accelerated Liquid Glass Ambient Background replicating
 * the orbs, glass grid, and background music wave bars from Vibentra auth.html.
 */
@Composable
fun LiquidGlassBackground(
    modifier: Modifier = Modifier,
    content: @Composable BoxScope.() -> Unit
) {
    val infiniteTransition = rememberInfiniteTransition(label = "ambient_orbs")

    // Smooth floating orbital shifts
    val orb1Offset by infiniteTransition.animateFloat(
        initialValue = -50f,
        targetValue = 60f,
        animationSpec = infiniteRepeatable(
            animation = tween( durationMillis = 8000, easing = EaseInOutSine),
            repeatMode = RepeatMode.Reverse
        ),
        label = "orb1"
    )

    val orb2Offset by infiniteTransition.animateFloat(
        initialValue = 40f,
        targetValue = -70f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 10000, easing = EaseInOutSine),
            repeatMode = RepeatMode.Reverse
        ),
        label = "orb2"
    )

    val orbScale by infiniteTransition.animateFloat(
        initialValue = 0.85f,
        targetValue = 1.15f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 6000, easing = EaseInOutSine),
            repeatMode = RepeatMode.Reverse
        ),
        label = "orbScale"
    )

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(DarkBackground, Color(0xFF030D0E), DarkBackground)
                )
            )
    ) {
        // GPU Canvas Drawing for Ambient Liquid Glow Orbs
        Canvas(modifier = Modifier.fillMaxSize()) {
            val width = size.width
            val height = size.height

            // Orb 1 - Top Left Purple Glow
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(OrbPurple, Color.Transparent),
                    center = Offset(width * 0.15f + orb1Offset, height * 0.2f + orb2Offset),
                    radius = width * 0.55f * orbScale
                ),
                radius = width * 0.55f * orbScale,
                center = Offset(width * 0.15f + orb1Offset, height * 0.2f + orb2Offset)
            )

            // Orb 2 - Top Right Cyan Glow
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(OrbCyan, Color.Transparent),
                    center = Offset(width * 0.85f - orb2Offset, height * 0.35f + orb1Offset),
                    radius = width * 0.6f
                ),
                radius = width * 0.6f,
                center = Offset(width * 0.85f - orb2Offset, height * 0.35f + orb1Offset)
            )

            // Orb 3 - Bottom Left Pink/Magenta Accent
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(OrbPink, Color.Transparent),
                    center = Offset(width * 0.25f - orb1Offset, height * 0.85f - orb2Offset),
                    radius = width * 0.5f * orbScale
                ),
                radius = width * 0.5f * orbScale,
                center = Offset(width * 0.25f - orb1Offset, height * 0.85f - orb2Offset)
            )

            // Orb 4 - Bottom Center Deep Cyan
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(OrbDeepBlue, Color.Transparent),
                    center = Offset(width * 0.7f + orb2Offset, height * 0.9f),
                    radius = width * 0.45f
                ),
                radius = width * 0.45f,
                center = Offset(width * 0.7f + orb2Offset, height * 0.9f)
            )
        }

        // Background Ambient Music Wave Bars at Bottom
        BackgroundMusicWave(modifier = Modifier.align(Alignment.BottomCenter))

        // Main Foreground Content
        content()
    }
}

/**
 * Ambient Equalizer wave bars matching .music-wave-bg in auth.html
 */
@Composable
fun BackgroundMusicWave(modifier: Modifier = Modifier) {
    val barCount = 12
    val infiniteTransition = rememberInfiniteTransition(label = "music_waves")

    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp, vertical = 20.dp)
            .height(50.dp),
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.Bottom
    ) {
        for (i in 0 until barCount) {
            val duration = 800 + (i * 130) % 900
            val heightPercent by infiniteTransition.animateFloat(
                initialValue = 0.15f + ((i % 4) * 0.1f),
                targetValue = 0.75f + ((i % 3) * 0.1f),
                animationSpec = infiniteRepeatable(
                    animation = tween(durationMillis = duration, easing = EaseInOutSine),
                    repeatMode = RepeatMode.Reverse
                ),
                label = "bar_$i"
            )

            Box(
                modifier = Modifier
                    .width(3.dp)
                    .fillMaxHeight(heightPercent)
                    .background(
                        brush = Brush.verticalGradient(
                            colors = listOf(
                                PrimaryCyan.copy(alpha = 0.5f),
                                PrimaryCyan.copy(alpha = 0.1f)
                            )
                        ),
                        shape = androidx.compose.foundation.shape.RoundedCornerShape(2.dp)
                    )
            )
        }
    }
}
