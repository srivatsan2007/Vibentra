
package com.vibentra.music.innertube

import com.srivatsan.vibentra.data.model.MusicSource
import com.srivatsan.vibentra.data.model.Song
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.Locale

/**
 * Direct InnerTube Engine for Vibentra (100% Echo Music Architecture).
 * Communicates directly with YouTube Music InnerTube endpoints.
 * Automatically manages Google Visitor ID (X-Goog-Visitor-Id) to guarantee
 * 100% unblocked streaming playback without bot-detection gates.
 */
object InnerTube {

    private const val BASE_URL = "https://music.youtube.com/youtubei/v1/"

    @Volatile
    var visitorData: String? = "CgtTbDhxV2pETUFSTSj_qJ3VBjIKCgJJThIEGgAgWA%3D%3D"

    /**
     * Executes a POST request to InnerTube with the specified client headers & JSON payload.
     */
    suspend fun postJson(
        endpoint: String,
        client: YouTubeClient,
        bodyJson: JSONObject,
        timeoutMs: Int = 8000
    ): JSONObject? = withContext(Dispatchers.IO) {
        var connection: HttpURLConnection? = null
        try {
            val url = URL(if (endpoint.startsWith("http")) endpoint else "$BASE_URL$endpoint")
            connection = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = timeoutMs
                readTimeout = timeoutMs
                doOutput = true
                doInput = true

                // Headers matching Echo Music
                setRequestProperty("Content-Type", "application/json; charset=UTF-8")
                setRequestProperty("Accept", "application/json")
                setRequestProperty("User-Agent", client.userAgent)
                setRequestProperty("X-Goog-Api-Format-Version", "1")
                setRequestProperty("X-YouTube-Client-Name", client.clientId)
                setRequestProperty("X-YouTube-Client-Version", client.clientVersion)
                setRequestProperty("X-Origin", YouTubeClient.ORIGIN_YOUTUBE_MUSIC)
                setRequestProperty("Referer", YouTubeClient.REFERER_YOUTUBE_MUSIC)

                // Critical: X-Goog-Visitor-Id is required by VisionOS and Android VR
                // to prevent "LOGIN_REQUIRED / Sign in to confirm you're not a bot"
                visitorData?.let { setRequestProperty("X-Goog-Visitor-Id", it) }
            }

            // Write Body
            OutputStreamWriter(connection.outputStream, "UTF-8").use { writer ->
                writer.write(bodyJson.toString())
                writer.flush()
            }

            val responseCode = connection.responseCode
            val inputStream = if (responseCode in 200..299) {
                connection.inputStream
            } else {
                connection.errorStream
            }

            if (inputStream != null) {
                val reader = BufferedReader(InputStreamReader(inputStream, "UTF-8"))
                val sb = StringBuilder()
                var line: String?
                while (reader.readLine().also { line = it } != null) {
                    sb.append(line)
                }
                reader.close()

                val jsonResult = JSONObject(sb.toString())

                // Extract & update visitorData if returned
                val respContext = jsonResult.optJSONObject("responseContext")
                val newVisitor = respContext?.optString("visitorData", null)
                if (!newVisitor.isNullOrEmpty()) {
                    visitorData = newVisitor
                }

                jsonResult
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
     * Searches YouTube Music directly using WEB_REMIX client (rich metadata).
     */
    suspend fun search(query: String): List<Song> = withContext(Dispatchers.IO) {
        val client = YouTubeClient.WEB_REMIX
        val contextObj = buildClientContext(client)
        val body = JSONObject().apply {
            put("context", contextObj)
            put("query", query)
            // Song filter param
            put("params", "Eg-KAQwIARAAGAAgACgAMABqChAEEAMQCRAFEAo%3D")
        }

        val json = postJson("search", client, body) ?: return@withContext emptyList()
        parseSearchResponse(json)
    }

    /**
     * Resolves the player response for a given videoId using the specified spoofed client.
     */
    suspend fun player(videoId: String, client: YouTubeClient): JSONObject? = withContext(Dispatchers.IO) {
        val contextObj = buildClientContext(client)
        val body = JSONObject().apply {
            put("context", contextObj)
            put("videoId", videoId)
            put("playbackContext", JSONObject().apply {
                put("contentPlaybackContext", JSONObject().apply {
                    put("html5Preference", "HTML5_PREF_WANTS")
                })
            })
        }

        postJson("player", client, body)
    }

    private fun buildClientContext(client: YouTubeClient): JSONObject {
        val clientJson = JSONObject().apply {
            put("clientName", client.clientName)
            put("clientVersion", client.clientVersion)
            client.osName?.let { put("osName", it) }
            client.osVersion?.let { put("osVersion", it) }
            client.deviceMake?.let { put("deviceMake", it) }
            client.deviceModel?.let { put("deviceModel", it) }
            client.androidSdkVersion?.let { put("androidSdkVersion", it) }
            put("gl", Locale.getDefault().country.ifEmpty { "IN" })
            put("hl", Locale.getDefault().language.ifEmpty { "en" })
            visitorData?.let { put("visitorData", it) }
        }
        return JSONObject().apply {
            put("client", clientJson)
        }
    }

    /**
     * Recursively traverses and parses YouTube Music search results.
     */
    private fun parseSearchResponse(root: JSONObject): List<Song> {
        val songs = mutableListOf<Song>()
        val renderers = mutableListOf<JSONObject>()

        fun findRenderers(obj: Any) {
            when (obj) {
                is JSONObject -> {
                    if (obj.has("musicResponsiveListItemRenderer")) {
                        renderers.add(obj.getJSONObject("musicResponsiveListItemRenderer"))
                    } else {
                        val keys = obj.keys()
                        while (keys.hasNext()) {
                            val key = keys.next()
                            findRenderers(obj.get(key))
                        }
                    }
                }
                is JSONArray -> {
                    for (i in 0 until obj.length()) {
                        findRenderers(obj.get(i))
                    }
                }
            }
        }

        findRenderers(root)

        for (renderer in renderers) {
            try {
                // Extract videoId
                var videoId: String? = null
                if (renderer.has("navigationEndpoint")) {
                    val nav = renderer.getJSONObject("navigationEndpoint")
                    if (nav.has("watchEndpoint")) {
                        videoId = nav.getJSONObject("watchEndpoint").optString("videoId", null)
                    }
                }
                if (videoId.isNullOrEmpty() && renderer.has("overlay")) {
                    val overlay = renderer.optJSONObject("overlay")
                    val thumbOverlay = overlay?.optJSONObject("musicItemThumbnailOverlayRenderer")
                    val content = thumbOverlay?.optJSONObject("content")
                    val playBtn = content?.optJSONObject("musicPlayButtonRenderer")
                    val playNav = playBtn?.optJSONObject("playNavigationEndpoint")
                    val watch = playNav?.optJSONObject("watchEndpoint")
                    videoId = watch?.optString("videoId", null)
                }

                if (videoId.isNullOrEmpty()) continue

                // Extract Title
                val flexCols = renderer.optJSONArray("flexColumns") ?: continue
                if (flexCols.length() == 0) continue

                val col0 = flexCols.getJSONObject(0)
                val flexCol0 = col0.optJSONObject("musicResponsiveListItemFlexColumnRenderer")
                val text0 = flexCol0?.optJSONObject("text")
                val runs0 = text0?.optJSONArray("runs")
                val title = runs0?.optJSONObject(0)?.optString("text", "") ?: ""
                if (title.isEmpty()) continue

                // Extract Artist & Duration from Column 1
                var artist = "YouTube Music"
                var duration = "3:30"
                if (flexCols.length() > 1) {
                    val col1 = flexCols.getJSONObject(1)
                    val flexCol1 = col1.optJSONObject("musicResponsiveListItemFlexColumnRenderer")
                    val text1 = flexCol1?.optJSONObject("text")
                    val runs1 = text1?.optJSONArray("runs")
                    if (runs1 != null && runs1.length() > 0) {
                        artist = runs1.optJSONObject(0)?.optString("text", artist) ?: artist
                        // Duration is usually the last run containing ':'
                        for (j in runs1.length() - 1 downTo 0) {
                            val runText = runs1.optJSONObject(j)?.optString("text", "") ?: ""
                            if (runText.contains(":") && runText.length in 3..6) {
                                duration = runText.trim()
                                break
                            }
                        }
                    }
                }

                // Extract Album Art Thumbnail
                var coverUrl = "https://i.ytimg.com/vi/$videoId/hqdefault.jpg"
                val thumbRenderer = renderer.optJSONObject("thumbnail")?.optJSONObject("musicThumbnailRenderer")
                val thumbnails = thumbRenderer?.optJSONObject("thumbnail")?.optJSONArray("thumbnails")
                if (thumbnails != null && thumbnails.length() > 0) {
                    val lastThumb = thumbnails.getJSONObject(thumbnails.length() - 1)
                    val rawUrl = lastThumb.optString("url", coverUrl)
                    // Request high resolution
                    coverUrl = rawUrl.replace(Regex("=w\\d+-h\\d+"), "=w544-h544")
                }

                songs.add(
                    Song(
                        id = videoId,
                        title = title,
                        artist = artist,
                        album = "YouTube Music",
                        coverUrl = coverUrl,
                        streamUrl = null, // Dynamically resolved on playback via YTPlayerUtils
                        duration = duration,
                        source = MusicSource.YOUTUBE_MUSIC
                    )
                )
            } catch (e: Exception) {
                // Continue safely
            }
        }

        return songs
    }
}
