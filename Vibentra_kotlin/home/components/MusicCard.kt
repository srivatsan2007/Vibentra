package com.srivatsan.vibentra.home.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.srivatsan.vibentra.data.model.Song
import com.srivatsan.vibentra.theme.DarkSurface
import com.srivatsan.vibentra.theme.PrimaryCyan
import com.srivatsan.vibentra.theme.TextSecondary

/**
 * Music Card replicating the card styling from user reference screenshot:
 * - Square rounded image
 * - 4-grid image collage support
 * - Play button overlay support
 * - Bold title + lighter artist description
 */
@Composable
fun MusicCard(
    song: Song,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    cardSize: Dp = 145.dp
) {
    Column(
        modifier = modifier
            .width(cardSize)
            .clickable { onClick() }
    ) {
        // Square Album Artwork Container
        Box(
            modifier = Modifier
                .size(cardSize)
                .shadow(8.dp, RoundedCornerShape(12.dp))
                .clip(RoundedCornerShape(12.dp))
                .background(DarkSurface)
        ) {
            if (song.isCollage && song.collageUrls.size >= 4) {
                // 4-Grid Collage Cover (e.g. "melody", "Karuppu")
                CollageCover(urls = song.collageUrls, size = cardSize)
            } else {
                // Single Artwork Cover
                AsyncImage(
                    model = song.coverUrl,
                    contentDescription = song.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
            }

            // Play button overlay in bottom right corner (e.g. "Thullatha Manamum Thullum")
            if (song.hasPlayOverlay) {
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(8.dp)
                        .size(32.dp)
                        .clip(CircleShape)
                        .background(Color(0x99000000)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.PlayArrow,
                        contentDescription = "Play",
                        tint = Color.White,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Title (Bold white, e.g. "melody", "Thullatha Manamum...", "Karuppu")
        Text(
            text = song.title,
            color = Color.White,
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )

        Spacer(modifier = Modifier.height(2.dp))

        // Subtitle / Artist (Lighter text, e.g. "Saifulla Saif", "S. A. Rajkumar")
        Text(
            text = song.artist,
            color = TextSecondary,
            fontSize = 12.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

/**
 * 2x2 Grid Collage of 4 Album Artworks matching reference screenshot
 */
@Composable
private fun CollageCover(urls: List<String>, size: Dp) {
    Column(modifier = Modifier.fillMaxSize()) {
        Row(modifier = Modifier.weight(1f)) {
            AsyncImage(
                model = urls.getOrNull(0) ?: "",
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.weight(1f).fillMaxHeight()
            )
            AsyncImage(
                model = urls.getOrNull(1) ?: "",
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.weight(1f).fillMaxHeight()
            )
        }
        Row(modifier = Modifier.weight(1f)) {
            AsyncImage(
                model = urls.getOrNull(2) ?: "",
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.weight(1f).fillMaxHeight()
            )
            AsyncImage(
                model = urls.getOrNull(3) ?: "",
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.weight(1f).fillMaxHeight()
            )
        }
    }
}
