package com.vibentra.music.search

import com.vibentra.music.data.model.Song

enum class SearchTab {
    EXPLORE, CHARTS, ALBUM
}

enum class SearchFilter {
    ALL, SONGS, VIDEOS, ALBUMS, ARTISTS, PLAYLISTS
}

data class VideoResult(
    val title: String,
    val channel: String,
    val thumbnail: String,
    val date: String,
    val url: String
)

data class AlbumResult(
    val id: String,
    val title: String,
    val artist: String,
    val cover: String,
    val year: String
)

data class ArtistResult(
    val name: String,
    val avatar: String,
    val role: String
)

data class PlaylistResult(
    val id: String,
    val title: String,
    val author: String,
    val cover: String,
    val trackCount: String
)

data class SearchUiState(
    val query: String = "",
    val isLoading: Boolean = false,
    val isVoiceListening: Boolean = false,
    val voiceTranscript: String = "",
    val selectedTab: SearchTab = SearchTab.EXPLORE,
    val selectedFilter: SearchFilter = SearchFilter.ALL,
    val topResult: Song? = null,
    val songs: List<Song> = emptyList(),
    val videos: List<VideoResult> = emptyList(),
    val albums: List<AlbumResult> = emptyList(),
    val artists: List<ArtistResult> = emptyList(),
    val playlists: List<PlaylistResult> = emptyList(),
    val errorMessage: String? = null
)
