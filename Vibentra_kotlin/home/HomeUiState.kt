package com.srivatsan.vibentra.home

import com.srivatsan.vibentra.data.model.MusicSection
import com.srivatsan.vibentra.data.model.Song
import com.srivatsan.vibentra.home.components.HomeNavTab

data class HomeUiState(
    val categories: List<String> = listOf("Romance", "Feel good", "Party", "Relax", "Energize", "Tamil Hits", "90s Road Trip", "Indie"),
    val selectedCategory: String = "Romance",
    val sections: List<MusicSection> = emptyList(),
    val isLoading: Boolean = false,
    val currentSong: Song? = null,
    val isPlaying: Boolean = false,
    val currentTab: HomeNavTab = HomeNavTab.HOME,
    val searchQuery: String = ""
)
