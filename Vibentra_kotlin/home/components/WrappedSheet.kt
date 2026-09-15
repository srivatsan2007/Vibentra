package com.srivatsan.vibentra.home.components

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WrappedSheet(
    onDismissRequest: () -> Unit,
    totalMinutes: Int = 148,
    totalSongs: Int = 42,
    topSongTitle: String = "Vakratunda Mahakaya Mix",
    topSongArtist: String = "Shankar Mahadevan",
    topSongPlays: Int = 19,
    modifier: Modifier = Modifier
) {
    var currentSlide by remember { mutableStateOf(1) }
    val totalSlides = 4

    ModalBottomSheet(
        onDismissRequest = onDismissRequest,
        containerColor = Color(0xFF0F1522),
        dragHandle = {
            Box(
                modifier = Modifier
                    .padding(vertical = 12.dp)
                    .width(44.dp)
                    .height(4.dp)
                    .clip(CircleShape)
                    .background(Color.White.copy(alpha = 0.20f))
            )
        },
        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
        modifier = modifier
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .padding(bottom = 36.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Story Progress Bars
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                for (i in 1..totalSlides) {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(3.dp)
                            .clip(CircleShape)
                            .background(if (i <= currentSlide) Color(0xFFF59E0B) else Color.White.copy(alpha = 0.15f))
                    )
                }
            }

            // Header Tag
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Album, contentDescription = null, tint = Color(0xFFF59E0B), modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "#VibentraWrapped",
                        color = Color(0xFFF59E0B),
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                }
                IconButton(
                    onClick = onDismissRequest,
                    modifier = Modifier
                        .size(32.dp)
                        .clip(CircleShape)
                        .background(Color(0xFF1E2838))
                ) {
                    Icon(Icons.Default.Close, contentDescription = "Close", tint = Color.White, modifier = Modifier.size(16.dp))
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Slides Content
            AnimatedContent(
                targetState = currentSlide,
                label = "wrappedSlide"
            ) { slide ->
                when (slide) {
                    1 -> {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 20.dp)
                        ) {
                            Text(text = "You spent", color = Color(0xFFCBD5E1), fontSize = 16.sp)
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "$totalMinutes",
                                color = Color(0xFFF59E0B),
                                fontSize = 64.sp,
                                fontWeight = FontWeight.Black
                            )
                            Text(text = "MINUTES STREAMING", color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                            Spacer(modifier = Modifier.height(14.dp))
                            Text(
                                text = "That's hours of sonic immersion with Vibentra - Sound of India!",
                                color = Color(0xFF94A3B8),
                                fontSize = 13.sp,
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                    2 -> {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 20.dp)
                        ) {
                            Text(text = "You explored", color = Color(0xFFCBD5E1), fontSize = 16.sp)
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "$totalSongs",
                                color = Color(0xFF06B6D4),
                                fontSize = 64.sp,
                                fontWeight = FontWeight.Black
                            )
                            Text(text = "UNIQUE SONGS", color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                            Spacer(modifier = Modifier.height(14.dp))
                            Text(
                                text = "Your taste traversed albums, languages and cinematic scores.",
                                color = Color(0xFF94A3B8),
                                fontSize = 13.sp,
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                    3 -> {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 16.dp)
                        ) {
                            Text(text = "Your #1 Top Played Song", color = Color(0xFFCBD5E1), fontSize = 14.sp)
                            Spacer(modifier = Modifier.height(16.dp))
                            Box(
                                modifier = Modifier
                                    .size(120.dp)
                                    .clip(RoundedCornerShape(20.dp))
                                    .background(Brush.linearGradient(listOf(Color(0xFFF59E0B), Color(0xFFEF4444)))),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.MusicNote, contentDescription = null, tint = Color.White, modifier = Modifier.size(54.dp))
                            }
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(text = topSongTitle, color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
                            Text(text = topSongArtist, color = Color(0xFF94A3B8), fontSize = 13.sp)
                            Spacer(modifier = Modifier.height(12.dp))
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(Color(0xFFF59E0B).copy(alpha = 0.20f))
                                    .border(1.dp, Color(0xFFF59E0B).copy(alpha = 0.40f), RoundedCornerShape(10.dp))
                                    .padding(horizontal = 14.dp, vertical = 6.dp)
                            ) {
                                Text(text = "Played $topSongPlays times on repeat!", color = Color(0xFFFBBF24), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                    4 -> {
                        Card(
                            shape = RoundedCornerShape(20.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E2638)),
                            modifier = Modifier
                                .fillMaxWidth()
                                .border(1.dp, Color(0xFF334155), RoundedCornerShape(20.dp))
                        ) {
                            Column(
                                modifier = Modifier.padding(20.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(text = "VIBENTRA WRAPPED 2024", color = Color(0xFFF59E0B), fontSize = 14.sp, fontWeight = FontWeight.Black)
                                Spacer(modifier = Modifier.height(12.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceEvenly
                                ) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Text(text = "${totalMinutes}m", color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.Bold)
                                        Text(text = "Listened", color = Color(0xFF94A3B8), fontSize = 11.sp)
                                    }
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Text(text = "$totalSongs", color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.Bold)
                                        Text(text = "Songs", color = Color(0xFF94A3B8), fontSize = 11.sp)
                                    }
                                }
                                Spacer(modifier = Modifier.height(12.dp))
                                Text(text = "Top Song: $topSongTitle", color = Color(0xFFE2E8F0), fontSize = 13.sp, fontWeight = FontWeight.Medium)
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Navigation Buttons (Prev / Next)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                if (currentSlide > 1) {
                    OutlinedButton(
                        onClick = { currentSlide-- },
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White)
                    ) {
                        Text("Back")
                    }
                } else {
                    Spacer(modifier = Modifier.width(1.dp))
                }

                Button(
                    onClick = {
                        if (currentSlide < totalSlides) {
                            currentSlide++
                        } else {
                            onDismissRequest()
                        }
                    },
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B))
                ) {
                    Text(
                        text = if (currentSlide == totalSlides) "Done ✓" else "Next →",
                        color = Color.Black,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}
