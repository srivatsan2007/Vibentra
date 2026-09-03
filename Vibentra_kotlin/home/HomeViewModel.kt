package com.srivatsan.vibentra.home

import android.media.AudioAttributes
import android.media.MediaPlayer
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.srivatsan.vibentra.data.model.MusicSection
import com.srivatsan.vibentra.data.model.Song
import com.srivatsan.vibentra.data.repository.MusicRepository
import com.srivatsan.vibentra.home.components.HomeNavTab
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * HomeViewModel managing home data feeds, JioSaavn/YouTube music queries, and audio playback
 */
class HomeViewModel(
    private val repository: MusicRepository = MusicRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    private var mediaPlayer: MediaPlayer? = null

    init {
        loadHomeData()
    }

    /**
     * Load Initial Home sections matching user reference screenshot
     */
    fun loadHomeData() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                val sections = repository.getHomeSections()
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        sections = sections
                    )
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false) }
            }
        }
    }

    /**
     * Select a mood/category pill (e.g. Romance, Feel good, Party, Relax)
     */
    fun onSelectCategory(category: String) {
        if (_uiState.value.selectedCategory.equals(category, ignoreCase = true)) return

        _uiState.update { it.copy(selectedCategory = category, isLoading = true) }

        viewModelScope.launch {
            try {
                val categorySongs = repository.getSongsForCategory(category)
                val newSection = MusicSection(
                    id = "category_${category.lowercase()}",
                    title = "$category Hits",
                    subtitlePrefix = "FEATURED IN",
                    isArtistSimilar = false,
                    songs = categorySongs
                )

                _uiState.update { state ->
                    // Place the selected category section right at the top
                    val updatedSections = listOf(newSection) + state.sections.filterNot { it.id.startsWith("category_") }
                    state.copy(isLoading = false, sections = updatedSections)
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false) }
            }
        }
    }

    /**
     * Play a song with instant audio streaming
     */
    fun playSong(song: Song) {
        _uiState.update {
            it.copy(currentSong = song, isPlaying = true)
        }

        // Initialize and stream audio
        song.streamUrl?.let { url ->
            playAudioUrl(url)
        } ?: run {
            // Resolve stream on the fly if needed
            viewModelScope.launch {
                val resolved = repository.searchJioSaavn("${song.title} ${song.artist}").firstOrNull()
                resolved?.streamUrl?.let { stream ->
                    playAudioUrl(stream)
                }
            }
        }
    }

    private fun playAudioUrl(url: String) {
        try {
            mediaPlayer?.release()
            mediaPlayer = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .build()
                )
                setDataSource(url)
                prepareAsync()
                setOnPreparedListener { mp ->
                    mp.start()
                    _uiState.update { it.copy(isPlaying = true) }
                }
                setOnCompletionListener {
                    nextTrack()
                }
                setOnErrorListener { _, _, _ ->
                    _uiState.update { it.copy(isPlaying = false) }
                    true
                }
            }
        } catch (e: Exception) {
            _uiState.update { it.copy(isPlaying = false) }
        }
    }

    fun togglePlayPause() {
        mediaPlayer?.let { mp ->
            if (mp.isPlaying) {
                mp.pause()
                _uiState.update { it.copy(isPlaying = false) }
            } else {
                mp.start()
                _uiState.update { it.copy(isPlaying = true) }
            }
        } ?: run {
            _uiState.value.currentSong?.let { playSong(it) }
        }
    }

    fun nextTrack() {
        val current = _uiState.value.currentSong ?: return
        val allSongs = _uiState.value.sections.flatMap { it.songs }
        val currentIndex = allSongs.indexOfFirst { it.id == current.id }
        if (currentIndex != -1 && currentIndex + 1 < allSongs.size) {
            playSong(allSongs[currentIndex + 1])
        }
    }

    fun dismissPlayer() {
        mediaPlayer?.stop()
        mediaPlayer?.release()
        mediaPlayer = null
        _uiState.update { it.copy(currentSong = null, isPlaying = false) }
    }

    fun selectTab(tab: HomeNavTab) {
        _uiState.update { it.copy(currentTab = tab) }
    }

    override fun onCleared() {
        super.onCleared()
        mediaPlayer?.release()
        mediaPlayer = null
    }
}
