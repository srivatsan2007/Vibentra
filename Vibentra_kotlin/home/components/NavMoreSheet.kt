package com.srivatsan.vibentra.home.components

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * Modern Echo Music & Vibentra 3-Dots Quick Actions Bottom Sheet
 * Houses the 4 core hubs:
 * 1. Favorite Songs Page (Liked Songs)
 * 2. AI Hub (Vibe AI Mood Music & Smart Lyrics)
 * 3. Connect Hub (Private Room Voice Call & Sync Music)
 * 4. Wrap Songs (Vibentra Wrapped 2024 Stories)
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NavMoreSheet(
    onDismissRequest: () -> Unit,
    onFavoritesClick: () -> Unit,
    onAiHubClick: () -> Unit,
    onConnectHubClick: () -> Unit,
    onWrappedClick: () -> Unit,
    favoritesCount: Int = 0,
    modifier: Modifier = Modifier
) {
    ModalBottomSheet(
        onDismissRequest = onDismissRequest,
        containerColor = Color(0xFF141922),
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
                .padding(horizontal = 20.dp)
                .padding(bottom = 36.dp)
        ) {
            // Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text(
                        text = "More Quick Actions",
                        color = Color(0xFFFFF2EB),
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "AI Hub, Connect Hub, Wrapped & Favorites",
                        color = Color(0xFF94A3B8),
                        fontSize = 12.sp
                    )
                }

                IconButton(
                    onClick = onDismissRequest,
                    modifier = Modifier
                        .size(32.dp)
                        .clip(CircleShape)
                        .background(Color(0xFF202A36))
                ) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Close",
                        tint = Color.White,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            // 1. Favorite Songs Page
            NavMoreHubItem(
                title = "Favorite Songs",
                subtitle = if (favoritesCount > 0) "$favoritesCount saved favorite songs" else "Your personal favorites collection",
                icon = Icons.Default.Favorite,
                iconGradient = listOf(Color(0xFFEC4899), Color(0xFFBE185D)),
                badgeText = if (favoritesCount > 0) "$favoritesCount SONGS" else null,
                badgeColor = Color(0xFFEC4899),
                onClick = {
                    onDismissRequest()
                    onFavoritesClick()
                }
            )

            Spacer(modifier = Modifier.height(10.dp))

            // 2. AI Hub (Vibe AI Mood Music & Smart Lyrics)
            NavMoreHubItem(
                title = "AI Hub",
                subtitle = "Song selected by AI matching your emotion & mood",
                icon = Icons.Default.AutoAwesome,
                iconGradient = listOf(Color(0xFF8B5CF6), Color(0xFF6D28D9)),
                badgeText = "AI MOOD",
                badgeColor = Color(0xFFA78BFA),
                onClick = {
                    onDismissRequest()
                    onAiHubClick()
                }
            )

            Spacer(modifier = Modifier.height(10.dp))

            // 3. Connect Hub (Private Room Voice Call & Live Sync)
            NavMoreHubItem(
                title = "Connect Hub",
                subtitle = "Call friends in a private room & stream music together",
                icon = Icons.Default.Headset,
                iconGradient = listOf(Color(0xFF06B6D4), Color(0xFF0284C7)),
                badgeText = "NEW",
                badgeColor = Color(0xFF06B6D4),
                onClick = {
                    onDismissRequest()
                    onConnectHubClick()
                }
            )

            Spacer(modifier = Modifier.height(10.dp))

            // 4. Wrap Songs (Vibentra Wrapped)
            NavMoreHubItem(
                title = "Wrap Songs",
                subtitle = "Your listening time, top repeated songs & stats",
                icon = Icons.Default.Album,
                iconGradient = listOf(Color(0xFFF59E0B), Color(0xFFD97706)),
                badgeText = "WRAP 2024",
                badgeColor = Color(0xFFFBBF24),
                onClick = {
                    onDismissRequest()
                    onWrappedClick()
                }
            )
        }
    }
}

@Composable
private fun NavMoreHubItem(
    title: String,
    subtitle: String,
    icon: ImageVector,
    iconGradient: List<Color>,
    badgeText: String? = null,
    badgeColor: Color = Color(0xFF06B6D4),
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(Color(0xFF1B222E))
            .border(1.dp, Color(0xFF263242), RoundedCornerShape(18.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Glowing Icon Box
        Box(
            modifier = Modifier
                .size(44.dp)
                .clip(CircleShape)
                .background(Brush.linearGradient(iconGradient)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = title,
                tint = Color.White,
                modifier = Modifier.size(22.dp)
            )
        }

        Spacer(modifier = Modifier.width(14.dp))

        Column(modifier = Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = title,
                    color = Color.White,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold
                )

                if (badgeText != null) {
                    Spacer(modifier = Modifier.width(8.dp))
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(badgeColor.copy(alpha = 0.18f))
                            .border(1.dp, badgeColor.copy(alpha = 0.40f), RoundedCornerShape(6.dp))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = badgeText,
                            color = badgeColor,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(2.dp))

            Text(
                text = subtitle,
                color = Color(0xFF94A3B8),
                fontSize = 12.sp,
                lineHeight = 16.sp
            )
        }

        Spacer(modifier = Modifier.width(8.dp))

        Icon(
            imageVector = Icons.Default.ChevronRight,
            contentDescription = null,
            tint = Color(0xFF64748B),
            modifier = Modifier.size(18.dp)
        )
    }
}
