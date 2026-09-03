package com.srivatsan.vibentra.data.model

enum class MusicSource {
    JIOSAAVN,
    YOUTUBE_MUSIC
}

/**
 * Universal Song Model for Vibentra
 * Supports single covers, 4-grid collage covers, streaming links, and durations.
 */
data class Song(
    val id: String,
    val title: String,
    val artist: String,
    val album: String = "",
    val coverUrl: String,
    val streamUrl: String? = null,
    val duration: String = "3:30",
    val source: MusicSource = MusicSource.JIOSAAVN,
    val isCollage: Boolean = false,
    val collageUrls: List<String> = emptyList(),
    val hasPlayOverlay: Boolean = false
)
