package com.srivatsan.vibentra.home.components

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp

enum class HomeNavTab {
    HOME,
    SEARCH,
    VOICE,
    LIBRARY,
    MORE
}

/**
 * Modern Echo Music Floating Pill Navigation Capsule
 * - High-grade glassmorphic gradient surface
 * - Glowing animated pill indicators with spring bounce micro-animations
 * - Integrated voice search and profile more sheet trigger
 */
@Composable
fun FloatingBottomNav(
    currentTab: HomeNavTab,
    onTabSelected: (HomeNavTab) -> Unit,
    onVoiceClick: () -> Unit = {},
    onMoreClick: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 10.dp),
        contentAlignment = Alignment.Center
    ) {
        Row(
            modifier = Modifier
                .shadow(elevation = 20.dp, shape = RoundedCornerShape(36.dp), spotColor = Color(0x99000000))
                .clip(RoundedCornerShape(36.dp))
                .background(
                    brush = Brush.verticalGradient(
                        colors = listOf(Color(0xF018222C), Color(0xF8101820))
                    )
                )
                .border(
                    width = 1.dp,
                    color = Color(0xFF263545),
                    shape = RoundedCornerShape(36.dp)
                )
                .padding(horizontal = 10.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // 1. Home
            NavIconButton(
                icon = Icons.Default.Home,
                contentDescription = "Home",
                isSelected = currentTab == HomeNavTab.HOME,
                onClick = { onTabSelected(HomeNavTab.HOME) }
            )

            // 2. Search
            NavIconButton(
                icon = Icons.Default.Search,
                contentDescription = "Search",
                isSelected = currentTab == HomeNavTab.SEARCH,
                onClick = { onTabSelected(HomeNavTab.SEARCH) }
            )

            // 3. Voice / Mic (Direct Speech Trigger)
            NavIconButton(
                icon = Icons.Default.Mic,
                contentDescription = "Voice Search",
                isSelected = currentTab == HomeNavTab.VOICE,
                accentColor = Color(0xFF06B6D4),
                onClick = {
                    onTabSelected(HomeNavTab.VOICE)
                    onVoiceClick()
                }
            )

            // 4. Library / Playlist
            NavIconButton(
                icon = Icons.Default.LibraryMusic,
                contentDescription = "Library",
                isSelected = currentTab == HomeNavTab.LIBRARY,
                onClick = { onTabSelected(HomeNavTab.LIBRARY) }
            )

            // 5. More Options / Profile
            Box(
                modifier = Modifier
                    .size(42.dp)
                    .clip(CircleShape)
                    .background(Color(0xFF202B38))
                    .border(1.dp, Color(0xFF2E3D4E), CircleShape)
                    .clickable {
                        onTabSelected(HomeNavTab.MORE)
                        onMoreClick()
                    },
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.MoreHoriz,
                    contentDescription = "More Options",
                    tint = Color.White,
                    modifier = Modifier.size(22.dp)
                )
            }
        }
    }
}

@Composable
private fun NavIconButton(
    icon: ImageVector,
    contentDescription: String,
    isSelected: Boolean,
    onClick: () -> Unit,
    accentColor: Color? = null
) {
    val scale by animateFloatAsState(
        targetValue = if (isSelected) 1.12f else 1.0f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy),
        label = "nav_icon_scale"
    )

    Column(
        horizontalAlignment = Alignment.CenterVertically,
        verticalArrangement = Arrangement.Center,
        modifier = Modifier
            .scale(scale)
            .height(44.dp)
            .clip(RoundedCornerShape(22.dp))
            .background(if (isSelected) Color(0x2B06B6D4) else Color.Transparent)
            .then(
                if (isSelected) {
                    Modifier.border(1.dp, Color(0x6606B6D4), RoundedCornerShape(22.dp))
                } else Modifier
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 6.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = contentDescription,
            tint = when {
                accentColor != null -> accentColor
                isSelected -> Color(0xFF06B6D4)
                else -> Color(0xFF94A3B8)
            },
            modifier = Modifier.size(22.dp)
        )
        if (isSelected) {
            Spacer(modifier = Modifier.height(2.dp))
            Box(
                modifier = Modifier
                    .size(4.dp)
                    .clip(CircleShape)
                    .background(Color(0xFF06B6D4))
            )
        }
    }
}
