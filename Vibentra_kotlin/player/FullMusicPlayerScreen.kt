package com.vibentra.music.player

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.Nightlight
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.srivatsan.vibentra.data.model.Song

/**
 * Full-Screen Music Player Card (Matching Screenshot 2)
 * Rich dark crimson/chocolate gradient, square album artwork, like/download boxes,
 * sleek seek bar, and distinctive scalloped starburst play/pause controller button.
 */
@Composable
fun FullMusicPlayerScreen(
    song: Song,
    isPlaying: Boolean,
    progress: Float,
    currentTime: String,
    totalDuration: String,
    onPlayPauseClick: () -> Unit,
    onNextClick: () -> Unit,
    onPreviousClick: () -> Unit,
    onSeek: (Float) -> Unit,
    onCollapse: () -> Unit,
    onDownloadClick: () -> Unit = {},
    onLyricsClick: () -> Unit = {},
    onSleepTimerClick: () -> Unit = {},
    onRingtoneClick: () -> Unit = {},
    onMoreClick: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    var isLiked by remember { mutableStateOf(false) }
    var isShuffle by remember { mutableStateOf(false) }
    var isRepeat by remember { mutableStateOf(false) }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFF350A0A),
                        Color(0xFF160404),
                        Color(0xFF090202)
                    )
                )
            )
            .statusBarsPadding()
            .navigationBarsPadding()
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 24.dp)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // 1. Header Row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                IconButton(onClick = onCollapse) {
                    Icon(
                        imageVector = Icons.Default.KeyboardArrowDown,
                        contentDescription = "Minimize",
                        tint = Color.White,
                        modifier = Modifier.size(32.dp)
                    )
                }

                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "Now Playing",
                        color = Color(0xFFCBD5E1),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        letterSpacing = 0.5.sp
                    )
                    Text(
                        text = song.title,
                        color = Color.White,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.widthIn(max = 220.dp),
                        textAlign = TextAlign.Center
                    )
                }

                IconButton(onClick = {}) {
                    Icon(
                        imageVector = Icons.Default.Share,
                        contentDescription = "Share",
                        tint = Color.White,
                        modifier = Modifier.size(22.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // 2. Square Album Art (Screenshot 2)
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(1f)
                    .clip(RoundedCornerShape(18.dp))
                    .shadow(32.dp, RoundedCornerShape(18.dp))
            ) {
                AsyncImage(
                    model = ImageRequest.Builder(LocalContext.current)
                        .data(song.albumArtUrl)
                        .crossfade(true)
                        .build(),
                    contentDescription = song.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
            }

            Spacer(modifier = Modifier.height(28.dp))

            // 3. Song Info & Action Buttons (Screenshot 2)
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(modifier = Modifier.weight(1f).padding(right = 12.dp)) {
                    Text(
                        text = song.title,
                        color = Color.White,
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = song.artist,
                        color = Color(0xFFCBD5E1),
                        fontSize = 14.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                // Download & Like Action Boxes
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Surface(
                        onClick = onDownloadClick,
                        shape = RoundedCornerShape(10.dp),
                        color = Color.White,
                        modifier = Modifier.size(42.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = Icons.Default.FileDownload,
                                contentDescription = "Download",
                                tint = Color.Black,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }

                    Surface(
                        onClick = { isLiked = !isLiked },
                        shape = RoundedCornerShape(10.dp),
                        color = Color.White,
                        modifier = Modifier.size(42.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = if (isLiked) Icons.Default.Favorite else Icons.Outlined.FavoriteBorder,
                                contentDescription = "Favorite",
                                tint = if (isLiked) Color(0xFFEF4444) else Color.Black,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // 4. Progress Slider & Timers
            Column(modifier = Modifier.fillMaxWidth()) {
                Slider(
                    value = progress,
                    onValueChange = onSeek,
                    colors = SliderDefaults.colors(
                        thumbColor = Color.White,
                        activeTrackColor = Color.White,
                        inactiveTrackColor = Color(0x3DFFFFFF)
                    ),
                    modifier = Modifier.fillMaxWidth()
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(text = currentTime, color = Color(0xFFCBD5E1), fontSize = 12.sp)
                    Text(text = totalDuration, color = Color(0xFFCBD5E1), fontSize = 12.sp)
                }
            }

            Spacer(modifier = Modifier.height(28.dp))

            // 5. Main Playback Controls (with Scalloped Play Button)
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                // Previous Button
                Surface(
                    onClick = onPreviousClick,
                    shape = CircleShape,
                    color = Color(0x24FFFFFF),
                    modifier = Modifier.size(56.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = Icons.Default.SkipPrevious,
                            contentDescription = "Previous",
                            tint = Color.White,
                            modifier = Modifier.size(30.dp)
                        )
                    }
                }

                // Scalloped / Rosette Center Play/Pause Button (Screenshot 2)
                Surface(
                    onClick = onPlayPauseClick,
                    shape = RoundedCornerShape(26.dp), // Distinctive rounded rosette card
                    color = Color.White,
                    shadowElevation = 16.dp,
                    modifier = Modifier.size(76.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                            contentDescription = if (isPlaying) "Pause" else "Play",
                            tint = Color.Black,
                            modifier = Modifier.size(36.dp)
                        )
                    }
                }

                // Next Button
                Surface(
                    onClick = onNextClick,
                    shape = CircleShape,
                    color = Color(0x24FFFFFF),
                    modifier = Modifier.size(56.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = Icons.Default.SkipNext,
                            contentDescription = "Next",
                            tint = Color.White,
                            modifier = Modifier.size(30.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            // 6. Bottom Action Toolbar (Screenshot 2)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                ToolbarIconBox(icon = Icons.Default.Mic, contentDescription = "Lyrics", onClick = onLyricsClick)
                ToolbarIconBox(icon = Icons.Outlined.Nightlight, contentDescription = "Sleep Timer", onClick = onSleepTimerClick)
                ToolbarIconBox(icon = Icons.Default.Notifications, contentDescription = "Ringtone", onClick = onRingtoneClick)
                ToolbarIconBox(
                    icon = Icons.Default.Shuffle,
                    contentDescription = "Shuffle",
                    isActive = isShuffle,
                    onClick = { isShuffle = !isShuffle }
                )
                ToolbarIconBox(
                    icon = Icons.Default.Repeat,
                    contentDescription = "Repeat",
                    isActive = isRepeat,
                    onClick = { isRepeat = !isRepeat }
                )

                // More Options circular white button
                Surface(
                    onClick = onMoreClick,
                    shape = CircleShape,
                    color = Color.White,
                    modifier = Modifier.size(42.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = Icons.Default.MoreVert,
                            contentDescription = "More",
                            tint = Color.Black,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ToolbarIconBox(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    contentDescription: String,
    isActive: Boolean = false,
    onClick: () -> Unit = {}
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(8.dp),
        color = if (isActive) Color(0x3D06B6D4) else Color.Transparent,
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (isActive) Color(0xFF06B6D4) else Color(0x38FFFFFF)
        ),
        modifier = Modifier.size(40.dp)
    ) {
        Box(contentAlignment = Alignment.Center) {
            Icon(
                imageVector = icon,
                contentDescription = contentDescription,
                tint = if (isActive) Color(0xFF06B6D4) else Color(0xFFCBD5E1),
                modifier = Modifier.size(20.dp)
            )
        }
    }
}
