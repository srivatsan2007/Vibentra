package com.srivatsan.vibentra.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.srivatsan.vibentra.theme.PrimaryCyan
import com.srivatsan.vibentra.theme.PrimaryPurple
import com.srivatsan.vibentra.theme.SecondaryCyan

/**
 * Animated Sound Wave Indicator replicating the 5 oscillating bars
 * in Vibentra's Splash Screen (.soundwave .bar).
 */
@Composable
fun SoundWaveIndicator(
    modifier: Modifier = Modifier,
    barCount: Int = 5,
    maxHeight: Dp = 40.dp,
    barWidth: Dp = 4.dp,
    spacing: Dp = 6.dp
) {
    val infiniteTransition = rememberInfiniteTransition(label = "soundwave")

    // Heights specs for each bar to create rhythm
    val durations = listOf(700, 950, 600, 850, 750)
    val minFractions = listOf(0.2f, 0.35f, 0.25f, 0.4f, 0.2f)
    val maxFractions = listOf(0.9f, 0.75f, 1.0f, 0.85f, 0.95f)

    Row(
        modifier = modifier.height(maxHeight),
        horizontalArrangement = Arrangement.spacedBy(spacing),
        verticalAlignment = Alignment.CenterVertically
    ) {
        for (i in 0 until barCount) {
            val duration = durations.getOrElse(i) { 800 }
            val minF = minFractions.getOrElse(i) { 0.2f }
            val maxF = maxFractions.getOrElse(i) { 0.9f }

            val fraction by infiniteTransition.animateFloat(
                initialValue = minF,
                targetValue = maxF,
                animationSpec = infiniteRepeatable(
                    animation = tween(durationMillis = duration, easing = EaseInOutCubic),
                    repeatMode = RepeatMode.Reverse
                ),
                label = "bar_$i"
            )

            Box(
                modifier = Modifier
                    .width(barWidth)
                    .fillMaxHeight(fraction)
                    .background(
                        brush = Brush.verticalGradient(
                            colors = listOf(
                                PrimaryPurple,
                                PrimaryCyan,
                                SecondaryCyan
                            )
                        ),
                        shape = RoundedCornerShape(percent = 50)
                    )
            )
        }
    }
}
