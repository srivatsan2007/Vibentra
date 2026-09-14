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
import com.vibentra.music.player.AudioPlayerManager
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

    private val prefs by lazy {
        getApplication<Application>().getSharedPreferences("vibentra_native_prefs", Context.MODE_PRIVATE)
    }

    private fun saveLastPlayedSong(song: Song) {
        try {
            prefs.edit().apply {
                putString("last_song_id", song.id)
                putString("last_song_title", song.title)
                putString("last_song_artist", song.artist)
                putString("last_song_album", song.album)
                putString("last_song_cover", song.coverUrl)
                putString("last_song_stream", song.streamUrl)
                putString("last_song_duration", song.duration)
                apply()
            }
        } catch (_: Exception) {}
    }

    private fun loadLastPlayedSong(): Song? {
        return try {
            val id = prefs.getString("last_song_id", null) ?: return null
            val title = prefs.getString("last_song_title", "") ?: ""
            val artist = prefs.getString("last_song_artist", "") ?: ""
            val album = prefs.getString("last_song_album", "") ?: ""
            val cover = prefs.getString("last_song_cover", "") ?: ""
            val stream = prefs.getString("last_song_stream", null)
            val duration = prefs.getString("last_song_duration", "3:30") ?: "3:30"
            Song(
                id = id,
                title = title,
                artist = artist,
                album = album,
                coverUrl = cover,
                streamUrl = stream,
                duration = duration
            )
        } catch (_: Exception) {
            null
        }
    }

    private fun calculateGreeting(): String {
        val hour = java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY)
        return when (hour) {
            in 5..11 -> "Good morning"
            in 12..16 -> "Good afternoon"
            in 17..21 -> "Good evening"
            else -> "Late night vibes"
        }
    }

    init {
        val greetingStr = calculateGreeting()
        _uiState.update { it.copy(greeting = greetingStr) }

        val lastSong = loadLastPlayedSong()
        if (lastSong != null) {
            _uiState.update { it.copy(currentSong = lastSong, isPlaying = false) }
        }

        // Keep UI state synchronized with AudioPlayerManager in real time
        viewModelScope.launch {
            AudioPlayerManager.currentSong.collect { song ->
                _uiState.update { it.copy(currentSong = song) }
            }
        }
        viewModelScope.launch {
            AudioPlayerManager.isPlaying.collect { playing ->
                _uiState.update { it.copy(isPlaying = playing) }
            }
        }

        loadHomeData()
    }

    /**
     * Load Initial Home sections matching user reference screenshot
     */
    fun loadHomeData() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, greeting = calculateGreeting()) }
            try {
                val sections = repository.getHomeSections()
                // Derive Echo Music Quick Picks from top loaded tracks
                val picks = sections.flatMap { it.songs }.distinctBy { it.id }.take(6)

                _uiState.update {
                    it.copy(
                        isLoading = false,
                        sections = sections,
                        quickPicks = picks
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
                    val updatedPicks = (categorySongs.take(4) + state.quickPicks).distinctBy { it.id }.take(6)
                    state.copy(isLoading = false, sections = updatedSections, quickPicks = updatedPicks)
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false) }
            }
        }
    }

    /**
     * Play a song with instant audio streaming.
     * Delegates to AudioPlayerManager (seamlessly supports both untouched JioSaavn & Echo Music YouTube).
     */
    fun playSong(song: Song) {
        saveLastPlayedSong(song)
        val allSongs = (_uiState.value.quickPicks + _uiState.value.sections.flatMap { it.songs }).distinctBy { it.id }
        AudioPlayerManager.playSong(song, allSongs)
    }

    fun playSection(section: MusicSection) {
        val firstSong = section.songs.firstOrNull() ?: return
        saveLastPlayedSong(firstSong)
        AudioPlayerManager.playSong(firstSong, section.songs)
    }

    fun startRadio() {
        val seed = _uiState.value.currentSong ?: _uiState.value.quickPicks.firstOrNull() ?: _uiState.value.sections.flatMap { it.songs }.firstOrNull()
        if (seed != null) {
            playSong(seed)
        }
    }

    fun togglePlayPause() {
        AudioPlayerManager.togglePlayPause()
    }

    fun nextTrack() {
        AudioPlayerManager.playNext()
    }

    fun dismissPlayer() {
        AudioPlayerManager.pause()
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
