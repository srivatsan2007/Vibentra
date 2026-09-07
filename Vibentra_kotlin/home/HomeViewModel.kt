package com.srivatsan.vibentra.home

import android.app.Application
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.os.Build
import androidx.lifecycle.AndroidViewModel
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
 * HomeViewModel managing home data feeds, JioSaavn/YouTube music queries, and audio playback.
 * 
 * Features:
 * - Complete Audio Focus handling (AUDIOFOCUS_GAIN / AUDIOFOCUS_LOSS_TRANSIENT)
 * - Automatic pause when phone call or VoIP call rings/answers (no background singing)
 * - Automatic resume when phone call ends
 * - Audio becoming noisy receiver (headset unplug / Bluetooth disconnect safety)
 */
class HomeViewModel @JvmOverloads constructor(
    application: Application,
    private val repository: MusicRepository = MusicRepository()
) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    private var mediaPlayer: MediaPlayer? = null
    private var audioFocusRequest: AudioFocusRequest? = null
    private var wasPlayingBeforeFocusLoss = false
    private var isNoisyReceiverRegistered = false

    private val audioManager: AudioManager? by lazy {
        getApplication<Application>().getSystemService(Context.AUDIO_SERVICE) as? AudioManager
    }

    private val audioFocusChangeListener = AudioManager.OnAudioFocusChangeListener { focusChange ->
        when (focusChange) {
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT,
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> {
                // Incoming phone call or VoIP call:
                // Immediately pause playback so the song does NOT play during the call
                mediaPlayer?.let { mp ->
                    if (mp.isPlaying) {
                        wasPlayingBeforeFocusLoss = true
                        mp.pause()
                        _uiState.update { it.copy(isPlaying = false) }
                    }
                }
            }
            AudioManager.AUDIOFOCUS_LOSS -> {
                // Permanent audio focus loss (e.g., user opened another music player)
                wasPlayingBeforeFocusLoss = false
                mediaPlayer?.let { mp ->
                    if (mp.isPlaying) {
                        mp.pause()
                        _uiState.update { it.copy(isPlaying = false) }
                    }
                }
                abandonAudioFocus()
            }
            AudioManager.AUDIOFOCUS_GAIN -> {
                // Call ended or interruption cleared:
                // Automatically resume playback if the song was playing before the call
                if (wasPlayingBeforeFocusLoss) {
                    wasPlayingBeforeFocusLoss = false
                    mediaPlayer?.let { mp ->
                        mp.start()
                        _uiState.update { it.copy(isPlaying = true) }
                    }
                }
            }
        }
    }

    private val noisyReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == AudioManager.ACTION_AUDIO_BECOMING_NOISY) {
                // Headset unplugged / Bluetooth disconnected: safely pause
                mediaPlayer?.let { mp ->
                    if (mp.isPlaying) {
                        mp.pause()
                        _uiState.update { it.copy(isPlaying = false) }
                    }
                }
            }
        }
    }

    private fun registerNoisyReceiver() {
        if (!isNoisyReceiverRegistered) {
            try {
                val filter = IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY)
                getApplication<Application>().registerReceiver(noisyReceiver, filter)
                isNoisyReceiverRegistered = true
            } catch (_: Exception) {}
        }
    }

    private fun unregisterNoisyReceiver() {
        if (isNoisyReceiverRegistered) {
            try {
                getApplication<Application>().unregisterReceiver(noisyReceiver)
            } catch (_: Exception) {
            } finally {
                isNoisyReceiverRegistered = false
            }
        }
    }

    private fun requestAudioFocus(): Boolean {
        val am = audioManager ?: return true
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val playbackAttributes = AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build()

                val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                    .setAudioAttributes(playbackAttributes)
                    .setAcceptsDelayedFocusGain(true)
                    .setOnAudioFocusChangeListener(audioFocusChangeListener)
                    .build()

                audioFocusRequest = request
                am.requestAudioFocus(request) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
            } else {
                @Suppress("DEPRECATION")
                am.requestAudioFocus(
                    audioFocusChangeListener,
                    AudioManager.STREAM_MUSIC,
                    AudioManager.AUDIOFOCUS_GAIN
                ) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
            }
        } catch (_: Exception) {
            true
        }
    }

    private fun abandonAudioFocus() {
        val am = audioManager ?: return
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                audioFocusRequest?.let {
                    am.abandonAudioFocusRequest(it)
                    audioFocusRequest = null
                }
            } else {
                @Suppress("DEPRECATION")
                am.abandonAudioFocus(audioFocusChangeListener)
            }
        } catch (_: Exception) {}
    }

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
                    if (requestAudioFocus()) {
                        wasPlayingBeforeFocusLoss = false
                        mp.start()
                        registerNoisyReceiver()
                        _uiState.update { it.copy(isPlaying = true) }
                    }
                }
                setOnCompletionListener {
                    unregisterNoisyReceiver()
                    abandonAudioFocus()
                    nextTrack()
                }
                setOnErrorListener { _, _, _ ->
                    unregisterNoisyReceiver()
                    abandonAudioFocus()
                    _uiState.update { it.copy(isPlaying = false) }
                    true
                }
            }
        } catch (e: Exception) {
            unregisterNoisyReceiver()
            abandonAudioFocus()
            _uiState.update { it.copy(isPlaying = false) }
        }
    }

    fun togglePlayPause() {
        mediaPlayer?.let { mp ->
            if (mp.isPlaying) {
                wasPlayingBeforeFocusLoss = false
                mp.pause()
                unregisterNoisyReceiver()
                abandonAudioFocus()
                _uiState.update { it.copy(isPlaying = false) }
            } else {
                if (requestAudioFocus()) {
                    wasPlayingBeforeFocusLoss = false
                    mp.start()
                    registerNoisyReceiver()
                    _uiState.update { it.copy(isPlaying = true) }
                }
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
        unregisterNoisyReceiver()
        abandonAudioFocus()
        mediaPlayer?.stop()
        mediaPlayer?.release()
        mediaPlayer = null
        wasPlayingBeforeFocusLoss = false
        _uiState.update { it.copy(currentSong = null, isPlaying = false) }
    }

    fun selectTab(tab: HomeNavTab) {
        _uiState.update { it.copy(currentTab = tab) }
    }

    override fun onCleared() {
        super.onCleared()
        unregisterNoisyReceiver()
        abandonAudioFocus()
        mediaPlayer?.release()
        mediaPlayer = null
        wasPlayingBeforeFocusLoss = false
    }
}
