package com.vibentra.music.search

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.srivatsan.vibentra.data.model.Song
import com.srivatsan.vibentra.data.repository.MusicRepository
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
                playlists = emptyList(),
                errorMessage = null
            ) 
        }
    }

    fun loadPlaylistTracks(playlist: PlaylistResult, onTracksLoaded: (List<Song>) -> Unit) {
        viewModelScope.launch {
            val tracks = repository.getPlaylistTracksLive(playlist.id, exactTrack = playlist.exactTrack)
            onTracksLoaded(tracks)
        }
    }

    fun getVideoTrackAsSong(video: VideoResult): Song {
        // 1. Guaranteed exact track for top result video (Video #0)
        if (video.exactTrack != null) {
            return video.exactTrack.copy(
                duration = video.duration.ifEmpty { video.exactTrack.duration },
                coverUrl = video.thumbnail.ifEmpty { video.exactTrack.coverUrl }
            )
        }

        // 2. Clean title of YouTube metadata tags
        val cleanTitle = video.title
            .replace(Regex("\\|.*$"), " ")
            .replace(Regex("\\[[^\\]]*\\]"), " ")
            .replace(Regex("\\((?!feat\\.|ft\\.)[^)]*\\)", RegexOption.IGNORE_CASE), " ")
            .replace(Regex("\\b(Official\\s*(Music\\s*)?Video|Video\\s*Song|Lyric(al)?\\s*Video|Full\\s*Video|Full\\s*Song|HD|4K|Remix|Cover|Audio|OST|Shorts|Teaser|Promo)\\b", RegexOption.IGNORE_CASE), " ")
            .replace(Regex("[-–—]"), " ")
            .trim()
            .replace(Regex("\\s+"), " ")

        // 3. Search uiState.songs for an authentic matching song by clean title
        val songs = _uiState.value.songs
        val matched = songs.find { s ->
            s.title.equals(cleanTitle, ignoreCase = true)
        } ?: songs.find { s ->
            val sClean = s.title.split(Regex("[-–—(]")).firstOrNull()?.trim() ?: ""
            (sClean.length >= 3 && cleanTitle.contains(sClean, ignoreCase = true)) ||
            (cleanTitle.length >= 3 && s.title.contains(cleanTitle, ignoreCase = true))
        }

        if (matched != null) {
            return matched.copy(
                duration = matched.duration.ifEmpty { video.duration },
                coverUrl = video.thumbnail.ifEmpty { matched.coverUrl }
            )
        }

        // 4. Return distinct Song with this video's specific title & artist (do NOT force top's stream)
        return Song(
            id = if (video.url.contains("v=")) video.url.substringAfter("v=").substringBefore("&") else "vid_${video.title.hashCode()}",
            title = cleanTitle.ifEmpty { video.title },
            artist = video.channel.substringBefore("•").trim(),
            album = video.date,
            duration = video.duration,
            coverUrl = video.thumbnail,
            streamUrl = ""
        )
    }

    fun loadVideoPlaylistTracks(): List<Song> {
        val ui = _uiState.value
        val top = ui.topResult
        val list = ui.videos.map { vid -> getVideoTrackAsSong(vid) }.toMutableList()
        if (top != null && (list.isEmpty() || list[0].id != top.id)) {
            val existingIdx = list.indexOfFirst { it.id == top.id }
            if (existingIdx > 0) list.removeAt(existingIdx)
            list.add(0, top)
        }
        return list
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
                        cover = s.coverUrl,
                        year = "2024"
                    )
                } else null
            }.distinctBy { it.title }

            val artists = songs.map { s ->
                val primaryArtist = s.artist.split(",").first().trim()
                ArtistResult(
                    name = primaryArtist,
                    avatar = s.coverUrl,
                    role = "Artist"
                )
            }.distinctBy { it.name }

            // 100% Real Live Videos & Playlists from JioSaavn & YouTube Music with exactTrack guarantee
            val videos = repository.searchVideosLive(query, exactSong = topResult)
            val playlists = repository.searchPlaylistsLive(query, exactSong = topResult)

            _uiState.update { 
                it.copy(
                    isLoading = false,
                    topResult = topResult,
                    songs = songs,
                    videos = videos,
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
