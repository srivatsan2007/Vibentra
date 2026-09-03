package com.srivatsan.vibentra.data.repository

import com.srivatsan.vibentra.data.model.MusicSection
import com.srivatsan.vibentra.data.model.MusicSource
import com.srivatsan.vibentra.data.model.Song
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

/**
 * 100% Dynamic MusicRepository for Vibentra
 * ZERO hardcoded song data. All tracks, images, and audio streams are fetched
 * directly in real-time from JioSaavn and YouTube Music APIs.
 */
class MusicRepository {

    // Live JioSaavn API Gateways
    private val jioSaavnEndpoints = listOf(
        "https://vibentra.vercel.app/api/jiosaavn/search?q=",
        "https://saavn.me/search/songs?query=",
        "https://saavn.dev/api/search/songs?query=",
        "https://jiosaavn-api-v3.vercel.app/search?q="
    )

    // Live YouTube Music Piped API Gateways
    private val pipedYouTubeEndpoints = listOf(
        "https://api.piped.private.coffee/search?filter=music_songs&q=",
        "https://pipedapi.kavin.rocks/search?filter=music_songs&q=",
        "https://pipedapi.drgns.space/search?filter=music_songs&q="
    )

    /**
     * 1. Live Search on JioSaavn (returns real streaming URLs and HD album art)
     */
    suspend fun searchJioSaavn(query: String): List<Song> = withContext(Dispatchers.IO) {
        val encodedQuery = URLEncoder.encode(query, "UTF-8")
        for (baseUrl in jioSaavnEndpoints) {
            try {
                val urlString = "$baseUrl$encodedQuery"
                val jsonString = fetchHttpGet(urlString, timeoutMs = 4500) ?: continue
                val songs = parseJioSaavnResponse(jsonString)
                if (songs.isNotEmpty()) {
                    return@withContext songs
                }
            } catch (e: Exception) {
                // Try next gateway fallback
            }
        }
        emptyList()
    }

    /**
     * 2. Live Search on YouTube Music
     */
    suspend fun searchYouTubeMusic(query: String): List<Song> = withContext(Dispatchers.IO) {
        val encodedQuery = URLEncoder.encode(query, "UTF-8")
        for (baseUrl in pipedYouTubeEndpoints) {
            try {
                val urlString = "$baseUrl$encodedQuery"
                val jsonString = fetchHttpGet(urlString, timeoutMs = 4500) ?: continue
                val songs = parseYouTubeMusicResponse(jsonString)
                if (songs.isNotEmpty()) {
                    return@withContext songs
                }
            } catch (e: Exception) {
                // Try next gateway fallback
            }
        }
        emptyList()
    }

    /**
     * 3. Fetch Real Songs for any category / mood pill dynamically
     */
    suspend fun getSongsForCategory(category: String): List<Song> = withContext(Dispatchers.IO) {
        val searchQuery = when (category.lowercase()) {
            "romance" -> "Tamil Romance"
            "feel good" -> "Tamil Feel Good"
            "party" -> "Tamil Party Hits"
            "relax" -> "Tamil Melody"
            "energize" -> "Tamil Workout"
            "tamil hits" -> "Tamil Top Hits"
            "90s road trip" -> "Tamil 90s Hits"
            "indie" -> "Tamil Indie"
            else -> "Tamil $category"
        }

        // Concurrently query both JioSaavn and YouTube Music for rich variety
        val jioDeferred = async { searchJioSaavn(searchQuery) }
        val ytDeferred = async { searchYouTubeMusic(searchQuery) }

        val jioResults = jioDeferred.await()
        val ytResults = ytDeferred.await()

        val combined = mutableListOf<Song>()
        combined.addAll(jioResults)
        combined.addAll(ytResults)

        combined
    }

    /**
     * 4. Build Home Feed directly from Live JioSaavn & YouTube Music APIs
     */
    suspend fun getHomeSections(): List<MusicSection> = withContext(Dispatchers.IO) {
        val sections = mutableListOf<MusicSection>()

        // Concurrently fetch all 3 live sections
        val ilaiyaraajaJob = async { searchJioSaavn("Ilaiyaraaja Hits") }
        val saiJob = async { searchJioSaavn("Sai Abhyankkar") }
        val trendingJob = async { searchJioSaavn("Tamil Trending Top Hits") }

        val ilaiyaraajaLive = ilaiyaraajaJob.await()
        val saiLive = saiJob.await()
        val trendingLive = trendingJob.await()

        // Section 1: "SIMILAR TO Ilaiyaraaja"
        if (ilaiyaraajaLive.isNotEmpty()) {
            // Dynamically format first card as collage if multiple album covers exist
            val formattedIlaiyaraaja = formatSongsWithDynamicCollage(ilaiyaraajaLive)
            val artistAvatar = ilaiyaraajaLive.firstOrNull()?.coverUrl 
                ?: "https://c.saavncdn.com/artists/Ilaiyaraaja_003_20191120074218_500x500.jpg"

            sections.add(
                MusicSection(
                    id = "sec_ilaiyaraaja",
                    title = "Ilaiyaraaja",
                    subtitlePrefix = "SIMILAR TO",
                    artistAvatarUrl = artistAvatar,
                    isArtistSimilar = true,
                    songs = formattedIlaiyaraaja
                )
            )
        }

        // Section 2: "SIMILAR TO Sai Abhyankkar"
        if (saiLive.isNotEmpty()) {
            val formattedSai = formatSongsWithDynamicCollage(saiLive)
            val artistAvatar = saiLive.firstOrNull()?.coverUrl
                ?: "https://c.saavncdn.com/artists/Sai_Abhyankkar_000_20240124110356_500x500.jpg"

            sections.add(
                MusicSection(
                    id = "sec_sai_abhyankkar",
                    title = "Sai Abhyankkar",
                    subtitlePrefix = "SIMILAR TO",
                    artistAvatarUrl = artistAvatar,
                    isArtistSimilar = true,
                    songs = formattedSai
                )
            )
        }

        // Section 3: "Trending / New Playlists"
        if (trendingLive.isNotEmpty()) {
            sections.add(
                MusicSection(
                    id = "sec_trending",
                    title = "Trending / New Playlists",
                    subtitlePrefix = "",
                    isArtistSimilar = false,
                    songs = trendingLive.mapIndexed { index, song ->
                        song.copy(hasPlayOverlay = index % 2 == 1)
                    }
                )
            )
        }

        // If JioSaavn has any connectivity delay, fallback to live YouTube Music
        if (sections.isEmpty()) {
            val ytTamilLive = searchYouTubeMusic("Tamil Hits Songs")
            if (ytTamilLive.isNotEmpty()) {
                sections.add(
                    MusicSection(
                        id = "sec_yt_trending",
                        title = "Trending Tamil Hits",
                        subtitlePrefix = "FEATURED ON YOUTUBE MUSIC",
                        isArtistSimilar = false,
                        songs = ytTamilLive
                    )
                )
            }
        }

        sections
    }

    /**
     * Dynamically builds a 4-grid collage for the first card using the real album covers
     * returned from the API, matching the screenshot style with 100% real data!
     */
    private fun formatSongsWithDynamicCollage(songs: List<Song>): List<Song> {
        if (songs.size < 4) return songs

        val collageCovers = songs.take(4).map { it.coverUrl }
        val firstWithCollage = songs[0].copy(
            isCollage = true,
            collageUrls = collageCovers
        )

        val rest = songs.drop(1).mapIndexed { index, song ->
            song.copy(hasPlayOverlay = index % 2 == 0)
        }

        return listOf(firstWithCollage) + rest
    }

    // --- Real HTTP Communication & JSON Parsing ---

    private fun fetchHttpGet(urlString: String, timeoutMs: Int = 4500): String? {
        var connection: HttpURLConnection? = null
        return try {
            val url = URL(urlString)
            connection = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = timeoutMs
                readTimeout = timeoutMs
                setRequestProperty("User-Agent", "Mozilla/5.0 (Android; Mobile; rv:128.0) Gecko/128.0 Firefox/128.0")
                setRequestProperty("Accept", "application/json, text/plain, */*")
            }

            if (connection.responseCode in 200..299) {
                val reader = BufferedReader(InputStreamReader(connection.inputStream))
                val sb = StringBuilder()
                var line: String?
                while (reader.readLine().also { line = it } != null) {
                    sb.append(line)
                }
                reader.close()
                sb.toString()
            } else {
                null
            }
        } catch (e: Exception) {
            null
        } finally {
            connection?.disconnect()
        }
    }

    /**
     * Parses real live responses from JioSaavn endpoints
     */
    private fun parseJioSaavnResponse(jsonStr: String): List<Song> {
        val list = mutableListOf<Song>()
        try {
            val trimmed = jsonStr.trim()
            if (trimmed.startsWith("[")) {
                // Direct JSON array from vibentra.vercel.app/api/jiosaavn
                val array = JSONArray(trimmed)
                for (i in 0 until array.length()) {
                    val item = array.getJSONObject(i)
                    parseSongObject(item)?.let { list.add(it) }
                }
            } else if (trimmed.startsWith("{")) {
                val root = JSONObject(trimmed)
                val dataArray: JSONArray = when {
                    root.has("data") && root.get("data") is JSONObject -> {
                        val dataObj = root.getJSONObject("data")
                        dataObj.optJSONArray("results") ?: JSONArray()
                    }
                    root.has("data") && root.get("data") is JSONArray -> root.getJSONArray("data")
                    root.has("results") -> root.getJSONArray("results")
                    else -> JSONArray()
                }

                for (i in 0 until dataArray.length()) {
                    val item = dataArray.getJSONObject(i)
                    parseSongObject(item)?.let { list.add(it) }
                }
            }
        } catch (e: Exception) {
            // JSON parsing safety
        }
        return list
    }

    private fun parseSongObject(item: JSONObject): Song? {
        try {
            val id = item.optString("id", "")
            val title = item.optString("title", item.optString("name", "")).trim()
            if (title.isEmpty()) return null

            val artist = item.optString("artist", item.optString("primaryArtists", "Various Artists")).trim()
            val album = item.optString("album", "")

            // Extract real cover URL
            var cover = item.optString("cover", "")
            if (cover.isEmpty() && item.has("image")) {
                val imgObj = item.get("image")
                if (imgObj is JSONArray && imgObj.length() > 0) {
                    cover = imgObj.getJSONObject(imgObj.length() - 1).optString("url", "")
                } else if (imgObj is String) {
                    cover = imgObj
                }
            }

            // Extract real stream URL (320kbps MP4 / downloadUrl)
            var streamUrl = item.optString("streamUrl", null)
            if (streamUrl.isNullOrEmpty() && item.has("downloadUrl")) {
                val dUrl = item.get("downloadUrl")
                if (dUrl is JSONArray && dUrl.length() > 0) {
                    streamUrl = dUrl.getJSONObject(dUrl.length() - 1).optString("url", null)
                } else if (dUrl is String) {
                    streamUrl = dUrl
                }
            }

            // Duration format
            val durationRaw = item.opt("duration")
            val durationFormatted = when (durationRaw) {
                is Number -> {
                    val sec = durationRaw.toInt()
                    "${sec / 60}:${String.format("%02d", sec % 60)}"
                }
                is String -> durationRaw
                else -> "3:30"
            }

            return Song(
                id = id.ifEmpty { "saavn_${title.hashCode()}" },
                title = cleanHtmlEntities(title),
                artist = cleanHtmlEntities(artist),
                album = cleanHtmlEntities(album),
                coverUrl = cover,
                streamUrl = streamUrl,
                duration = durationFormatted,
                source = MusicSource.JIOSAAVN
            )
        } catch (e: Exception) {
            return null
        }
    }

    /**
     * Parses real live responses from YouTube Music Piped API
     */
    private fun parseYouTubeMusicResponse(jsonStr: String): List<Song> {
        val list = mutableListOf<Song>()
        try {
            val root = JSONObject(jsonStr)
            val itemsArray = root.optJSONArray("items") ?: JSONArray()
            for (i in 0 until itemsArray.length()) {
                val item = itemsArray.getJSONObject(i)
                val url = item.optString("url", "")
                val videoId = if (url.contains("v=")) url.substringAfter("v=").substringBefore("&") else url.substringAfterLast("/")
                val title = item.optString("title", "")
                if (title.isEmpty()) continue

                val artist = item.optString("uploaderName", "YouTube Music")
                val thumbnail = item.optString("thumbnail", "https://i.ytimg.com/vi/$videoId/hqdefault.jpg")

                val durationSec = item.optInt("duration", 210)
                val durationFormatted = "${durationSec / 60}:${String.format("%02d", durationSec % 60)}"

                list.add(
                    Song(
                        id = "yt_$videoId",
                        title = cleanHtmlEntities(title),
                        artist = cleanHtmlEntities(artist),
                        album = "YouTube Music",
                        coverUrl = thumbnail,
                        streamUrl = null, // Dynamically resolved on play
                        duration = durationFormatted,
                        source = MusicSource.YOUTUBE_MUSIC,
                        hasPlayOverlay = true
                    )
                )
            }
        } catch (e: Exception) {
            // Parsing safety
        }
        return list
    }

    private fun cleanHtmlEntities(str: String): String {
        return str
            .replace("&quot;", "\"")
            .replace("&amp;", "&")
            .replace("&#039;", "'")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
    }
}
