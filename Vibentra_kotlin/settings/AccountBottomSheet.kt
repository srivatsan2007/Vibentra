package com.srivatsan.vibentra.settings

import androidx.compose.foundation.background
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage

/**
 * Native Jetpack Compose Account Bottom Sheet
 * Full parity with Screenshot 1:
 * Drag handle, Echo Music brand, Account section, Preferences switches,
 * App section with Settings navigation.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AccountBottomSheet(
    userName: String,
    userAvatarUrl: String,
    onDismissRequest: () -> Unit,
    onAccountClick: () -> Unit,
    onAiHubClick: () -> Unit,
    onSettingsClick: () -> Unit,
    onAboutClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    var accountBrowsing by remember { mutableStateOf(true) }
    var youTubeSync by remember { mutableStateOf(true) }

    ModalBottomSheet(
        onDismissRequest = onDismissRequest,
        containerColor = Color(0xFF16110E),
        dragHandle = {
            Box(
                modifier = Modifier
                    .padding(vertical = 12.dp)
                    .width(42.dp)
                    .height(4.dp)
                    .clip(CircleShape)
                    .background(Color.White.copy(alpha = 0.22f))
            )
        },
        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
        modifier = modifier
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 32.dp)
        ) {
            // Header Brand
            Text(
                text = "Echo Music",
                color = Color(0xFFFFF2EB),
                fontSize = 24.sp,
                fontWeight = FontWeight.ExtraBold,
                modifier = Modifier
                    .fillMaxWidth()
                    .wrapContentWidth(Alignment.CenterHorizontally)
                    .padding(bottom = 20.dp)
            )

            // Section: Account
            SectionHeader(title = "Account")
            CardGroup {
                // User Row
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable(onClick = onAccountClick)
                        .padding(horizontal = 16.dp, vertical = 13.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconCircle(icon = Icons.Default.AccountCircle)
                    Spacer(modifier = Modifier.width(14.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(text = userName, color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                        Text(text = "Logged In", color = Color(0xFF9C8C84), fontSize = 12.sp)
                    }
                    AsyncImage(
                        model = userAvatarUrl,
                        contentDescription = "User Avatar",
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape),
                        contentScale = ContentScale.Crop
                    )
                }

                HorizontalDivider(color = Color.White.copy(alpha = 0.04f))

                // AI Hub Row
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable(onClick = onAiHubClick)
                        .padding(horizontal = 16.dp, vertical = 13.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconCircle(icon = Icons.Default.AutoAwesome)
                    Spacer(modifier = Modifier.width(14.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(text = "AI Hub", color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                        Text(text = "AI-powered lyrics and translations", color = Color(0xFF9C8C84), fontSize = 12.sp)
                    }
                }
            }

            Spacer(modifier = Modifier.height(18.dp))

            // Section: Preferences
            SectionHeader(title = "Preferences")
            CardGroup {
                // Use Account for Browsing
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconCircle(icon = Icons.Default.AddCircleOutline)
                    Spacer(modifier = Modifier.width(14.dp))
                    Text(text = "Use Account for Browsing", color = Color.White, fontWeight = FontWeight.Medium, fontSize = 15.sp, modifier = Modifier.weight(1f))
                    Switch(
                        checked = accountBrowsing,
                        onCheckedChange = { accountBrowsing = it },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = Color(0xFF241A15),
                            checkedTrackColor = Color(0xFFE5A88B)
                        )
                    )
                }

                HorizontalDivider(color = Color.White.copy(alpha = 0.04f))

                // YouTube Music Sync
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconCircle(icon = Icons.Default.Sync)
                    Spacer(modifier = Modifier.width(14.dp))
                    Text(text = "YouTube Music Sync", color = Color.White, fontWeight = FontWeight.Medium, fontSize = 15.sp, modifier = Modifier.weight(1f))
                    Switch(
                        checked = youTubeSync,
                        onCheckedChange = { youTubeSync = it },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = Color(0xFF241A15),
                            checkedTrackColor = Color(0xFFE5A88B)
                        )
                    )
                }
            }

            Spacer(modifier = Modifier.height(18.dp))

            // Section: App
            SectionHeader(title = "App")
            CardGroup {
                // Settings
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable(onClick = onSettingsClick)
                        .padding(horizontal = 16.dp, vertical = 13.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconCircle(icon = Icons.Default.Settings)
                    Spacer(modifier = Modifier.width(14.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(text = "Settings", color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                        Text(text = "App preferences and configurations", color = Color(0xFF9C8C84), fontSize = 12.sp)
                    }
                }

                HorizontalDivider(color = Color.White.copy(alpha = 0.04f))

                // About
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable(onClick = onAboutClick)
                        .padding(horizontal = 16.dp, vertical = 13.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconCircle(icon = Icons.Default.Info)
                    Spacer(modifier = Modifier.width(14.dp))
                    Text(text = "About", color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, modifier = Modifier.weight(1f))
                    Text(text = "1.2.2", color = Color(0xFF9C8C84), fontSize = 14.sp)
                }
            }

            // Footer
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 22.dp),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(text = "Privacy Policy", color = Color(0xFF9C8C84), fontSize = 12.sp)
                Text(text = " • ", color = Color(0xFF6E5F58), fontSize = 12.sp)
                Text(text = "Terms of Service", color = Color(0xFF9C8C84), fontSize = 12.sp)
            }
        }
    }
}

@Composable
private fun SectionHeader(title: String) {
    Text(
        text = title,
        color = Color(0xFFE8B49B),
        fontWeight = FontWeight.Bold,
        fontSize = 13.sp,
        modifier = Modifier.padding(start = 6.dp, bottom = 8.dp)
    )
}

@Composable
private fun CardGroup(content: @Composable ColumnScope.() -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(Color.White.copy(alpha = 0.04f)),
        content = content
    )
}

@Composable
private fun IconCircle(icon: ImageVector) {
    Box(
        modifier = Modifier
            .size(38.dp)
            .clip(CircleShape)
            .background(Color.White.copy(alpha = 0.06f)),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = Color(0xFFF1C5B0),
            modifier = Modifier.size(20.dp)
        )
    }
}
