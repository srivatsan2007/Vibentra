package com.vibentra.music.search

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.vibentra.music.data.model.Song
import com.vibentra.music.data.repository.MusicRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class SearchViewModel(
    private val repository: MusicRepository = MusicRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(SearchUiState())
    val uiState: StateFlow<SearchUiState> = _uiState.asStateFlow()

    private var searchJob: Job? = null

    fun onQueryChanged(newQuery: String) {
        _uiState.update { it.copy(query = newQuery) }
        if (newQuery.isBlank()) {
            clearSearch()
            return
        }

        // Debounce search by 350ms
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            delay(350)
            executeSearch(newQuery.trim())
        }
    }

    fun onTabSelected(tab: SearchTab) {
        _uiState.update { it.copy(selectedTab = tab) }
        when (tab) {
            SearchTab.CHARTS -> onQueryChanged("Top Charts Tamil 2024")
            SearchTab.ALBUM -> onQueryChanged("Latest Tamil Albums")
            SearchTab.EXPLORE -> clearSearch()
        }
    }

    fun onFilterSelected(filter: SearchFilter) {
        _uiState.update { it.copy(selectedFilter = filter) }
    }

    fun onVoiceSearchRecognized(transcript: String) {
        if (transcript.isNotBlank()) {
            _uiState.update { 
                it.copy(
                    query = transcript,
                    isVoiceListening = false,
                    voiceTranscript = transcript
                ) 
            }
            searchJob?.cancel()
            searchJob = viewModelScope.launch {
                executeSearch(transcript.trim())
            }
        }
    }

    fun setVoiceListening(listening: Boolean) {
        _uiState.update { it.copy(isVoiceListening = listening) }
    }

    fun clearSearch() {
        searchJob?.cancel()
        _uiState.update { 
            it.copy(
                query = "",
                isLoading = false,
                topResult = null,
                songs = emptyList(),
                videos = emptyList(),
                albums = emptyList(),
                artists = emptyList(),
                errorMessage = null
            ) 
        }
    }

    private suspend fun executeSearch(query: String) {
        _uiState.update { it.copy(isLoading = true, errorMessage = null) }
        try {
            val songs = repository.searchSongsLive(query)
            val topResult = songs.firstOrNull()

            // Derive album & artist results from live query
            val albums = songs.mapNotNull { s ->
                if (s.album.isNotBlank()) {
                    AlbumResult(
                        id = s.id,
                        title = s.album,
                        artist = s.artist,
                        cover = s.albumArtUrl,
                        year = "2024"
                    )
                } else null
            }.distinctBy { it.title }

            val artists = songs.map { s ->
                val primaryArtist = s.artist.split(",").first().trim()
                ArtistResult(
                    name = primaryArtist,
                    avatar = s.albumArtUrl,
                    role = "Artist"
                )
            }.distinctBy { it.name }

            val playlists = mutableListOf<PlaylistResult>()
            if (songs.isNotEmpty()) {
                val primaryArtist = songs.first().artist.split(",").first().trim()
                playlists.add(
                    PlaylistResult(
                        id = "pl_1",
                        title = "${query.replaceFirstChar { it.uppercase() }} OST & Mix",
                        author = "$primaryArtist • Official Playlist",
                        cover = songs.first().albumArtUrl,
                        trackCount = "${songs.size} tracks"
                    )
                )
                playlists.add(
                    PlaylistResult(
                        id = "pl_2",
                        title = "Best of $primaryArtist Radio",
                        author = "Vibentra Curated • 100K+ listeners",
                        cover = songs.getOrNull(1)?.albumArtUrl ?: songs.first().albumArtUrl,
                        trackCount = "25 tracks"
                    )
                )
            }

            _uiState.update { 
                it.copy(
                    isLoading = false,
                    topResult = topResult,
                    songs = songs,
                    albums = albums,
                    artists = artists,
                    playlists = playlists
                ) 
            }
        } catch (e: Exception) {
            _uiState.update { 
                it.copy(
                    isLoading = false,
                    errorMessage = e.localizedMessage ?: "Failed to load live search results"
                ) 
            }
        }
    }
}
