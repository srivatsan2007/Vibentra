package com.srivatsan.vibentra.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.dp

/**
 * Echo Music Skeleton Shimmer Loading Modifier
 * Smooth linear gradient shine across translucent components.
 */
fun Modifier.echoShimmer(
    shape: Shape = RoundedCornerShape(8.dp),
    baseColor: Color = Color(0x0AFFFFFF),
    highlightColor: Color = Color(0x24FFFFFF),
    durationMillis: Int = 1400
): Modifier = composed {
    val transition = rememberInfiniteTransition(label = "echo_shimmer_transition")
    val translateAnim by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1200f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = durationMillis, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "echo_shimmer_translate"
    )

    val brush = Brush.linearGradient(
        colors = listOf(baseColor, highlightColor, baseColor),
        start = Offset(translateAnim - 400f, translateAnim - 400f),
        end = Offset(translateAnim, translateAnim)
    )

    this.background(brush = brush, shape = shape)
}

/**
 * Single Shimmer Track Row matching Echo Music search & list items
 */
@Composable
fun ShimmerTrackItem(modifier: Modifier = Modifier) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 5.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(Color(0x08FFFFFF))
            .padding(10.dp)
    ) {
        // 48x48 rounded square thumbnail
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(RoundedCornerShape(10.dp))
                .echoShimmer(shape = RoundedCornerShape(10.dp))
        )

        Spacer(modifier = Modifier.width(12.dp))

        Column(modifier = Modifier.weight(1f)) {
            // Title bar
            Box(
                modifier = Modifier
                    .fillMaxWidth(0.65f)
                    .height(14.dp)
                    .clip(RoundedCornerShape(7.dp))
                    .echoShimmer(shape = RoundedCornerShape(7.dp))
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Subtitle / Artist bar
            Box(
                modifier = Modifier
                    .fillMaxWidth(0.40f)
                    .height(11.dp)
                    .clip(RoundedCornerShape(6.dp))
                    .echoShimmer(shape = RoundedCornerShape(6.dp))
            )
        }
    }
}

/**
 * 2-Row Quick Picks Skeleton Grid matching Echo Music Home
 */
@Composable
fun ShimmerQuickPicksGrid(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp)
    ) {
        // Section Title Placeholder
        Box(
            modifier = Modifier
                .padding(horizontal = 16.dp, vertical = 6.dp)
                .width(140.dp)
                .height(18.dp)
                .clip(RoundedCornerShape(6.dp))
                .echoShimmer(shape = RoundedCornerShape(6.dp))
        )

        Spacer(modifier = Modifier.height(6.dp))

        repeat(6) {
            ShimmerTrackItem()
        }
    }
}

/**
 * Search Results Shimmer Skeleton List
 */
@Composable
fun ShimmerSearchList(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(vertical = 8.dp)
    ) {
        repeat(7) {
            ShimmerTrackItem()
        }
    }
}

/**
 * Full Player Synced Lyrics Shimmer Skeleton
 */
@Composable
fun ShimmerLyricsList(modifier: Modifier = Modifier) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp, vertical = 40.dp)
    ) {
        val widths = listOf(0.55f, 0.80f, 0.65f, 0.90f, 0.50f, 0.75f, 0.60f)
        widths.forEach { widthFraction ->
            Box(
                modifier = Modifier
                    .fillMaxWidth(widthFraction)
                    .height(20.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .echoShimmer(shape = RoundedCornerShape(10.dp))
            )
            Spacer(modifier = Modifier.height(20.dp))
        }
    }
}
