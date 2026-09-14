package com.vibentra.music.player

import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.net.wifi.WifiManager
import android.os.Build
import android.os.PowerManager
import com.srivatsan.vibentra.data.model.MusicSource
import com.srivatsan.vibentra.data.model.Song
import com.vibentra.music.innertube.YTPlayerUtils
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

enum class RepeatMode {
    OFF,
    ALL,
    ONE
}

/**
 * Universal Audio Engine for Vibentra.
 * Seamlessly plays both JioSaavn (untouched direct CDN) and YouTube Music (Echo Music engine).
 * Provides full controller logic for play/pause, seek, repeat, shuffle, sleep timer, and liked tracks.
 * Backed by PARTIAL_WAKE_LOCK & WifiLock for 100% uninterrupted screen-off background streaming.
 */
object AudioPlayerManager {

    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private var mediaPlayer: MediaPlayer? = null
    private var progressJob: Job? = null
    private var sleepTimerJob: Job? = null

    private var appContext: Context? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private var wifiLock: WifiManager.WifiLock? = null

    fun init(context: Context) {
        if (appContext != null) return
        val ctx = context.applicationContext
        appContext = ctx
        try {
            val pm = ctx.getSystemService(Context.POWER_SERVICE) as? PowerManager
            wakeLock = pm?.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "vibentra:AudioPlayerWakeLock")?.apply {
                setReferenceCounted(false)
            }
            val wm = ctx.getSystemService(Context.WIFI_SERVICE) as? WifiManager
            wifiLock = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                wm?.createWifiLock(WifiManager.WIFI_MODE_FULL_LOW_LATENCY, "vibentra:AudioPlayerWifiLock")
            } else {
                wm?.createWifiLock(WifiManager.WIFI_MODE_FULL_HIGH_PERF, "vibentra:AudioPlayerWifiLock")
            }?.apply {
                setReferenceCounted(false)
            }
        } catch (_: Exception) {}
    }

    private fun acquireWakeLocks() {
        try {
            wakeLock?.let { if (!it.isHeld) it.acquire(6 * 60 * 60 * 1000L) }
            wifiLock?.let { if (!it.isHeld) it.acquire() }
        } catch (_: Exception) {}
    }

    private fun releaseWakeLocks() {
        try {
            wakeLock?.let { if (it.isHeld) it.release() }
            wifiLock?.let { if (it.isHeld) it.release() }
        } catch (_: Exception) {}
    }

    // State Flows for Jetpack Compose UI
    private val _currentSong = MutableStateFlow<Song?>(null)
    val currentSong: StateFlow<Song?> = _currentSong.asStateFlow()

    private val _isPlaying = MutableStateFlow(false)
    val isPlaying: StateFlow<Boolean> = _isPlaying.asStateFlow()

    private val _isBuffering = MutableStateFlow(false)
    val isBuffering: StateFlow<Boolean> = _isBuffering.asStateFlow()

    private val _currentPositionMs = MutableStateFlow(0L)
    val currentPositionMs: StateFlow<Long> = _currentPositionMs.asStateFlow()

    private val _durationMs = MutableStateFlow(0L)
    val durationMs: StateFlow<Long> = _durationMs.asStateFlow()

    private val _queue = MutableStateFlow<List<Song>>(emptyList())
    val queue: StateFlow<List<Song>> = _queue.asStateFlow()

    private val _currentIndex = MutableStateFlow(-1)
    val currentIndex: StateFlow<Int> = _currentIndex.asStateFlow()

    // Interactive Controller States
    private val _repeatMode = MutableStateFlow(RepeatMode.OFF)
    val repeatMode: StateFlow<RepeatMode> = _repeatMode.asStateFlow()

    private val _isShuffle = MutableStateFlow(false)
    val isShuffle: StateFlow<Boolean> = _isShuffle.asStateFlow()

    private val _likedSongIds = MutableStateFlow<Set<String>>(emptySet())
    val likedSongIds: StateFlow<Set<String>> = _likedSongIds.asStateFlow()

    private val _sleepTimerMinutes = MutableStateFlow<Int?>(null)
    val sleepTimerMinutes: StateFlow<Int?> = _sleepTimerMinutes.asStateFlow()

    /**
     * Plays the selected song.
     * - If JioSaavn: Plays the existing direct CDN streamUrl immediately (100% UNTOUCHED).
     * - If YouTube Music: Resolves the unthrottled stream via YTPlayerUtils (Echo Music parity) and plays it.
     */
    fun playSong(song: Song, newQueue: List<Song> = emptyList()) {
        if (newQueue.isNotEmpty()) {
            _queue.value = newQueue
            _currentIndex.value = newQueue.indexOfFirst { it.id == song.id }.takeIf { it >= 0 } ?: 0
        } else if (_queue.value.none { it.id == song.id }) {
            _queue.value = _queue.value + song
            _currentIndex.value = _queue.value.size - 1
        } else {
            _currentIndex.value = _queue.value.indexOfFirst { it.id == song.id }
        }

        _currentSong.value = song
        _isBuffering.value = true
        _isPlaying.value = false
        _currentPositionMs.value = 0L

        scope.launch {
            try {
                val finalStreamUrl: String? = when (song.source) {
                    // 1. JioSaavn Source (STRICTLY PRESERVED AS IS)
                    MusicSource.JIOSAAVN -> {
                        song.streamUrl
                    }

                    // 2. YouTube Music Source (100% Echo Music Stream Resolution)
                    MusicSource.YOUTUBE_MUSIC -> {
                        if (!song.streamUrl.isNullOrEmpty() && song.streamUrl.startsWith("http")) {
                            song.streamUrl
                        } else {
                            // Resolve through VisionOS / Android VR cascade
                            YTPlayerUtils.resolveStreamUrl(song.id)
                        }
                    }
                }

                if (finalStreamUrl.isNullOrEmpty()) {
                    _isBuffering.value = false
                    return@launch
                }

                // Initialize or reset MediaPlayer on Main thread
                withContext(Dispatchers.Main) {
                    initAndPlayStream(finalStreamUrl, song)
                }
            } catch (e: Exception) {
                _isBuffering.value = false
                _isPlaying.value = false
            }
        }
    }

    private fun initAndPlayStream(streamUrl: String, song: Song) {
        stopProgressTracker()

        mediaPlayer?.release()
        mediaPlayer = MediaPlayer().apply {
            setAudioAttributes(
                AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .build()
            )

            // Critical: Enable CPU wake lock on the MediaPlayer directly
            appContext?.let { ctx ->
                setWakeMode(ctx, PowerManager.PARTIAL_WAKE_LOCK)
            }

            setDataSource(streamUrl)

            setOnPreparedListener { mp ->
                _isBuffering.value = false
                _isPlaying.value = true
                _durationMs.value = mp.duration.toLong().coerceAtLeast(0L)
                mp.start()
                acquireWakeLocks()
                startProgressTracker()
            }

            setOnCompletionListener {
                handleSongCompletion()
            }

            setOnErrorListener { _, _, _ ->
                _isBuffering.value = false
                _isPlaying.value = false
                releaseWakeLocks()
                false
            }

            prepareAsync()
        }
    }

    private fun handleSongCompletion() {
        _currentPositionMs.value = 0L

        when (_repeatMode.value) {
            RepeatMode.ONE -> {
                mediaPlayer?.seekTo(0)
                mediaPlayer?.start()
                acquireWakeLocks()
                _isPlaying.value = true
                startProgressTracker()
            }
            RepeatMode.ALL -> {
                val q = _queue.value
                val idx = _currentIndex.value
                if (q.isNotEmpty()) {
                    val nextIdx = (idx + 1) % q.size
                    _currentIndex.value = nextIdx
                    playSong(q[nextIdx])
                } else {
                    _isPlaying.value = false
                    releaseWakeLocks()
                }
            }
            RepeatMode.OFF -> {
                val q = _queue.value
                val idx = _currentIndex.value
                if (q.isNotEmpty() && idx in 0 until q.size - 1) {
                    playNext()
                } else {
                    _isPlaying.value = false
                    releaseWakeLocks()
                }
            }
        }
    }

    fun togglePlayPause() {
        val player = mediaPlayer ?: run {
            _currentSong.value?.let { playSong(it) }
            return
        }
        if (player.isPlaying) {
            player.pause()
            releaseWakeLocks()
            _isPlaying.value = false
        } else {
            player.start()
            acquireWakeLocks()
            _isPlaying.value = true
            startProgressTracker()
        }
    }

    fun pause() {
        mediaPlayer?.let {
            if (it.isPlaying) {
                it.pause()
                releaseWakeLocks()
                _isPlaying.value = false
            }
        }
    }

    fun resume() {
        mediaPlayer?.let {
            if (!it.isPlaying) {
                it.start()
                acquireWakeLocks()
                _isPlaying.value = true
                startProgressTracker()
            }
        }
    }

    fun seekTo(positionMs: Long) {
        mediaPlayer?.let {
            it.seekTo(positionMs.toInt())
            _currentPositionMs.value = positionMs
        }
    }

    fun playNext() {
        val q = _queue.value
        if (q.isEmpty()) return

        if (_isShuffle.value && q.size > 1) {
            val randomIdx = q.indices.filter { it != _currentIndex.value }.random()
            _currentIndex.value = randomIdx
            playSong(q[randomIdx])
            return
        }

        val idx = _currentIndex.value
        if (idx in 0 until q.size - 1) {
            val nextIdx = idx + 1
            _currentIndex.value = nextIdx
            playSong(q[nextIdx])
        } else if (_repeatMode.value == RepeatMode.ALL) {
            _currentIndex.value = 0
            playSong(q[0])
        }
    }

    fun playPrevious() {
        val q = _queue.value
        if (q.isEmpty()) return

        // If playing past 3 seconds, previous restarts the current track (standard media player behavior)
        if (_currentPositionMs.value > 3000L) {
            seekTo(0L)
            return
        }

        val idx = _currentIndex.value
        if (idx > 0) {
            val prevIdx = idx - 1
            _currentIndex.value = prevIdx
            playSong(q[prevIdx])
        } else if (_repeatMode.value == RepeatMode.ALL) {
            _currentIndex.value = q.size - 1
            playSong(q[q.size - 1])
        }
    }

    fun toggleShuffle() {
        _isShuffle.update { !it }
    }

    fun cycleRepeatMode() {
        _repeatMode.update { current ->
            when (current) {
                RepeatMode.OFF -> RepeatMode.ALL
                RepeatMode.ALL -> RepeatMode.ONE
                RepeatMode.ONE -> RepeatMode.OFF
            }
        }
    }

    fun toggleLike(songId: String) {
        _likedSongIds.update { set ->
            if (set.contains(songId)) set - songId else set + songId
        }
    }

    // Dynamic Radio / Autoplay state (Echo Brain parity)
    private val _isDynamicRadioEnabled = MutableStateFlow(true)
    val isDynamicRadioEnabled: StateFlow<Boolean> = _isDynamicRadioEnabled.asStateFlow()

    fun setDynamicRadioEnabled(enabled: Boolean) {
        _isDynamicRadioEnabled.value = enabled
    }

    fun toggleDynamicRadio() {
        _isDynamicRadioEnabled.update { !it }
    }

    /**
     * Jumps directly to any song at [index] in the queue and plays it immediately.
     */
    fun playSongAtIndex(index: Int) {
        val q = _queue.value
        if (index in q.indices) {
            _currentIndex.value = index
            playSong(q[index])
        }
    }

    /**
     * Removes a track at [index] from the queue.
     * If the current track is removed, advances to the next track.
     */
    fun removeFromQueue(index: Int) {
        val currentQ = _queue.value.toMutableList()
        if (index !in currentQ.indices) return

        val currentIdx = _currentIndex.value
        currentQ.removeAt(index)
        _queue.value = currentQ

        when {
            currentQ.isEmpty() -> {
                pause()
                _currentSong.value = null
                _currentIndex.value = -1
            }
            index == currentIdx -> {
                val newIdx = index.coerceAtMost(currentQ.size - 1)
                _currentIndex.value = newIdx
                playSong(currentQ[newIdx])
            }
            index < currentIdx -> {
                _currentIndex.value = currentIdx - 1
            }
        }
    }

    /**
     * Reorders an item in the queue from [fromIndex] to [toIndex].
     */
    fun moveQueueItem(fromIndex: Int, toIndex: Int) {
        val currentQ = _queue.value.toMutableList()
        if (fromIndex !in currentQ.indices || toIndex !in currentQ.indices || fromIndex == toIndex) return

        val item = currentQ.removeAt(fromIndex)
        currentQ.add(toIndex, item)

        val currentIdx = _currentIndex.value
        val newCurrentIdx = when (currentIdx) {
            fromIndex -> toIndex
            in (fromIndex + 1)..toIndex -> currentIdx - 1
            in toIndex until fromIndex -> currentIdx + 1
            else -> currentIdx
        }

        _queue.value = currentQ
        _currentIndex.value = newCurrentIdx
    }

    /**
     * Clears all subsequent tracks in the queue while keeping the currently playing track.
     */
    fun clearQueueKeepCurrent() {
        val current = _currentSong.value ?: return
        _queue.value = listOf(current)
        _currentIndex.value = 0
    }

    /**
     * Inserts [song] as the next track in the queue ("Play Next").
     */
    fun addToNextInQueue(song: Song) {
        val currentQ = _queue.value.toMutableList()
        val currentIdx = _currentIndex.value
        if (currentIdx >= 0 && currentIdx < currentQ.size) {
            currentQ.add(currentIdx + 1, song)
        } else {
            currentQ.add(song)
        }
        _queue.value = currentQ
    }

    /**
     * Appends [song] to the end of the queue ("Add to Queue").
     */
    fun addToQueueEnd(song: Song) {
        _queue.update { it + song }
    }

    fun setSleepTimer(minutes: Int?) {
        sleepTimerJob?.cancel()
        _sleepTimerMinutes.value = minutes

        if (minutes != null && minutes > 0) {
            sleepTimerJob = scope.launch {
                delay(minutes * 60 * 1000L)
                pause()
                _sleepTimerMinutes.value = null
            }
        }
    }

    private fun startProgressTracker() {
        stopProgressTracker()
        progressJob = scope.launch {
            var hasPreFetchedNext = false
            while (isActive) {
                mediaPlayer?.let { mp ->
                    if (mp.isPlaying) {
                        val pos = mp.currentPosition.toLong()
                        _currentPositionMs.value = pos
                        val dur = _durationMs.value

                        // Pre-resolve the next YouTube stream 20 seconds before song ends
                        // to guarantee zero-latency, uninterrupted background track transitions
                        if (!hasPreFetchedNext && dur > 30000L && (dur - pos) < 20000L) {
                            hasPreFetchedNext = true
                            val q = _queue.value
                            val nextIdx = _currentIndex.value + 1
                            if (nextIdx in q.indices) {
                                val nextSong = q[nextIdx]
                                if (nextSong.source == MusicSource.YOUTUBE_MUSIC && nextSong.streamUrl.isNullOrEmpty()) {
                                    scope.launch(Dispatchers.IO) {
                                        try {
                                            YTPlayerUtils.resolveStreamUrl(nextSong.id)
                                        } catch (_: Exception) {}
                                    }
                                }
                            }
                        }
                    }
                }
                delay(250)
            }
        }
    }

    private fun stopProgressTracker() {
        progressJob?.cancel()
        progressJob = null
    }

    fun release() {
        stopProgressTracker()
        sleepTimerJob?.cancel()
        releaseWakeLocks()
        mediaPlayer?.release()
        mediaPlayer = null
        _isPlaying.value = false
        _currentSong.value = null
    }
}
