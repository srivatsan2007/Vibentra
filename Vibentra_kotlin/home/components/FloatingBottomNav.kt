package com.srivatsan.vibentra.home.components

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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.srivatsan.vibentra.theme.PrimaryCyan

enum class HomeNavTab {
    HOME,
    SEARCH,
    VOICE,
    LIBRARY,
    MORE
}

/**
 * Modern Floating Pill Bottom Navigation Bar replicating user reference screenshot
 */
@Composable
fun FloatingBottomNav(
    currentTab: HomeNavTab,
    onTabSelected: (HomeNavTab) -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp, vertical = 12.dp),
        contentAlignment = Alignment.Center
    ) {
        Row(
            modifier = Modifier
                .shadow(elevation = 20.dp, shape = RoundedCornerShape(36.dp), spotColor = Color(0x99000000))
                .clip(RoundedCornerShape(36.dp))
                .background(
                    brush = Brush.verticalGradient(
                        colors = listOf(Color(0xE61E293B), Color(0xF20F172A))
                    )
                )
                .border(
                    width = 1.dp,
                    color = Color(0x33138086),
                    shape = RoundedCornerShape(36.dp)
                )
                .padding(horizontal = 14.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
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

            // 3. Voice / Mic
            NavIconButton(
                icon = Icons.Default.Mic,
                contentDescription = "Voice Search",
                isSelected = currentTab == HomeNavTab.VOICE,
                onClick = { onTabSelected(HomeNavTab.VOICE) }
            )

            // 4. Library / Playlist
            NavIconButton(
                icon = Icons.Default.LibraryMusic,
                contentDescription = "Library",
                isSelected = currentTab == HomeNavTab.LIBRARY,
                onClick = { onTabSelected(HomeNavTab.LIBRARY) }
            )

            // 5. More Options (Three dots in circular button matching screenshot)
            Box(
                modifier = Modifier
                    .size(42.dp)
                    .clip(CircleShape)
                    .background(Color(0xFF334155))
                    .clickable { onTabSelected(HomeNavTab.MORE) },
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.MoreHoriz,
                    contentDescription = "More Options",
                    tint = Color.White,
                    modifier = Modifier.size(24.dp)
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
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .size(42.dp)
            .clip(CircleShape)
            .background(if (isSelected) Color(0x33138086) else Color.Transparent)
            .clickable { onClick() },
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = icon,
            contentDescription = contentDescription,
            tint = if (isSelected) Color.White else Color(0xFF94A3B8),
            modifier = Modifier.size(22.dp)
        )
    }
}
