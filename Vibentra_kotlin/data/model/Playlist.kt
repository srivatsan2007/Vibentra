package com.srivatsan.vibentra.data.model

/**
 * Universal Playlist Model for Vibentra
 * Supports custom user playlists, Liked Songs auto-collection, and featured streaming mixes.
 */
data class Playlist(
    val id: String,
    val title: String,
    val description: String = "",
    val coverUrl: String,
    val songs: List<Song> = emptyList(),
    val isFavorites: Boolean = false,
    val isFeatured: Boolean = false
)
