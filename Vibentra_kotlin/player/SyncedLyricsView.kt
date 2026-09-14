package com.vibentra.music.player

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.srivatsan.vibentra.data.model.Song
import com.vibentra.music.lyrics.LyricLine
import com.vibentra.music.lyrics.LyricsEngine
import kotlinx.coroutines.launch

/**
 * Apple Music / Echo Music-Style Synchronized Lyrics View.
 * Automatically scrolls to keep the active singing line centered, highlights the active line,
 * dims inactive lines, and enables instant click-to-seek to any lyric line.
 */
@Composable
fun SyncedLyricsView(
    song: Song,
    currentPositionMs: Long,
    onSeek: (Long) -> Unit,
    modifier: Modifier = Modifier
) {
    var lyrics by remember(song.id) { mutableStateOf<List<LyricLine>>(emptyList()) }
    var isLoading by remember(song.id) { mutableStateOf(true) }
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()

    // Fetch lyrics on song change
    LaunchedEffect(song.id) {
        isLoading = true
        lyrics = LyricsEngine.getLyrics(song)
        isLoading = false
    }

    // Determine currently active singing line
    val activeIndex = remember(currentPositionMs, lyrics) {
        if (lyrics.isEmpty()) -1
        else {
            val idx = lyrics.indexOfLast { it.timeMs <= currentPositionMs }
            if (idx >= 0) idx else 0
        }
    }

    // Auto-scroll list so active line remains centered
    LaunchedEffect(activeIndex) {
        if (activeIndex >= 0 && activeIndex < lyrics.size) {
            // Scroll to center
            listState.animateScrollToItem(
                index = activeIndex,
                scrollOffset = -180
            )
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 20.dp),
        contentAlignment = Alignment.Center
    ) {
        when {
            isLoading -> {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    CircularProgressIndicator(
                        color = Color(0xFF06B6D4),
                        strokeWidth = 3.dp,
                        modifier = Modifier.size(36.dp)
                    )
                    Spacer(modifier = Modifier.height(14.dp))
                    Text(
                        text = "Syncing live lyrics...",
                        color = Color(0xFF94A3B8),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }

            lyrics.isEmpty() -> {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                    modifier = Modifier.padding(32.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.MusicNote,
                        contentDescription = null,
                        tint = Color(0xFF64748B),
                        modifier = Modifier.size(48.dp)
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "No Synced Lyrics Found",
                        color = Color.White,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "Enjoy the studio instrumental master",
                        color = Color(0xFF94A3B8),
                        fontSize = 13.sp,
                        textAlign = TextAlign.Center
                    )
                }
            }

            else -> {
                LazyColumn(
                    state = listState,
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(top = 100.dp, bottom = 140.dp)
                ) {
                    itemsIndexed(lyrics) { index, line ->
                        val isActive = index == activeIndex

                        val textColor by animateColorAsState(
                            targetValue = if (isActive) Color.White else Color(0x66FFFFFF),
                            animationSpec = spring(stiffness = Spring.StiffnessLow),
                            label = "textColor"
                        )

                        val textScale by animateFloatAsState(
                            targetValue = if (isActive) 1.04f else 0.96f,
                            animationSpec = spring(stiffness = Spring.StiffnessMediumLow),
                            label = "textScale"
                        )

                        val lineAlpha by animateFloatAsState(
                            targetValue = if (isActive) 1f else 0.45f,
                            animationSpec = spring(stiffness = Spring.StiffnessLow),
                            label = "lineAlpha"
                        )

                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 10.dp)
                                .scale(textScale)
                                .alpha(lineAlpha)
                                .clickable {
                                    // Instant click-to-seek feature from Echo Music
                                    onSeek(line.timeMs)
                                }
                        ) {
                            Text(
                                text = line.text,
                                color = textColor,
                                fontSize = if (isActive) 23.sp else 18.sp,
                                fontWeight = if (isActive) FontWeight.ExtraBold else FontWeight.Medium,
                                lineHeight = if (isActive) 32.sp else 26.sp,
                                textAlign = TextAlign.Start,
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }
                }
            }
        }
    }
}
