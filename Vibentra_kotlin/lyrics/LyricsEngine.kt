package com.vibentra.music.lyrics

import com.srivatsan.vibentra.data.model.Song
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.util.concurrent.ConcurrentHashMap
import java.util.regex.Pattern

data class LyricLine(
    val timeMs: Long,
    val text: String
)

/**
 * 100% Client-Side Synchronized Lyrics Engine (Ported from Echo Music / LRCLIB).
 * Parses LRC millisecond timestamps and provides real-time time-synced lyrics with zero backend dependency.
 */
object LyricsEngine {

    private val lyricsCache = ConcurrentHashMap<String, List<LyricLine>>()
    private val lrcPattern = Pattern.compile("\\[(\\d{1,2}):(\\d{2})(?:\\.(\\d{2,3}))?\\](.*)")

    /**
     * Fetches and parses synchronized lyrics for any song (JioSaavn or YouTube Music).
     */
    suspend fun getLyrics(song: Song): List<LyricLine> = withContext(Dispatchers.IO) {
        // 1. Check in-memory cache
        lyricsCache[song.id]?.let { return@withContext it }

        val cleanTitle = sanitizeTitle(song.title)
        val cleanArtist = sanitizeArtist(song.artist)

        // 2. Exact match query on LRCLIB
        val exactLyrics = fetchLrclibExact(cleanTitle, cleanArtist)
        if (exactLyrics.isNotEmpty()) {
            lyricsCache[song.id] = exactLyrics
            return@withContext exactLyrics
        }

        // 3. Fuzzy search query on LRCLIB
        val searchLyrics = fetchLrclibSearch(cleanTitle, cleanArtist)
        if (searchLyrics.isNotEmpty()) {
            lyricsCache[song.id] = searchLyrics
            return@withContext searchLyrics
        }

        emptyList()
    }

    private fun fetchLrclibExact(title: String, artist: String): List<LyricLine> {
        return try {
            val encTitle = URLEncoder.encode(title, "UTF-8")
            val encArtist = URLEncoder.encode(artist, "UTF-8")
            val urlString = "https://lrclib.net/api/get?track_name=$encTitle&artist_name=$encArtist"

            val jsonStr = httpGet(urlString, timeoutMs = 4000) ?: return emptyList()
            val obj = JSONObject(jsonStr)
            val synced = obj.optString("syncedLyrics", "")
            if (synced.isNotEmpty()) {
                parseLrc(synced)
            } else {
                val plain = obj.optString("plainLyrics", "")
                if (plain.isNotEmpty()) parsePlain(plain) else emptyList()
            }
        } catch (e: Exception) {
            emptyList()
        }
    }

    private fun fetchLrclibSearch(title: String, artist: String): List<LyricLine> {
        return try {
            val query = URLEncoder.encode("$title $artist", "UTF-8")
            val urlString = "https://lrclib.net/api/search?q=$query"

            val jsonStr = httpGet(urlString, timeoutMs = 4500) ?: return emptyList()
            if (!jsonStr.trim().startsWith("[")) return emptyList()

            val array = JSONArray(jsonStr.trim())
            for (i in 0 until array.length()) {
                val item = array.getJSONObject(i)
                val synced = item.optString("syncedLyrics", "")
                if (synced.isNotEmpty()) {
                    val parsed = parseLrc(synced)
                    if (parsed.isNotEmpty()) return parsed
                }
            }

            // Fallback to first available plain lyrics
            for (i in 0 until array.length()) {
                val item = array.getJSONObject(i)
                val plain = item.optString("plainLyrics", "")
                if (plain.isNotEmpty()) {
                    return parsePlain(plain)
                }
            }

            emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }

    /**
     * Parses standard LRC timestamp strings ([mm:ss.xx] lyric text) into millisecond entries.
     */
    fun parseLrc(lrcText: String): List<LyricLine> {
        val lines = mutableListOf<LyricLine>()
        val rawLines = lrcText.split("\n")

        for (line in rawLines) {
            val trimmed = line.trim()
            if (trimmed.isEmpty()) continue

            val matcher = lrcPattern.matcher(trimmed)
            if (matcher.find()) {
                try {
                    val minutes = matcher.group(1)?.toLongOrNull() ?: 0L
                    val seconds = matcher.group(2)?.toLongOrNull() ?: 0L
                    val msGroup = matcher.group(3) ?: "0"
                    val millis = if (msGroup.length == 2) {
                        msGroup.toLong() * 10
                    } else {
                        msGroup.toLong()
                    }

                    val totalMs = (minutes * 60 * 1000) + (seconds * 1000) + millis
                    val text = matcher.group(4)?.trim() ?: ""

                    if (text.isNotEmpty()) {
                        lines.add(LyricLine(timeMs = totalMs, text = text))
                    }
                } catch (_: Exception) {}
            }
        }

        return lines.sortedBy { it.timeMs }
    }

    private fun parsePlain(plainText: String): List<LyricLine> {
        val list = mutableListOf<LyricLine>()
        val rawLines = plainText.split("\n")
        var currentMs = 0L
        for (line in rawLines) {
            val trimmed = line.trim()
            if (trimmed.isNotEmpty()) {
                list.add(LyricLine(timeMs = currentMs, text = trimmed))
                currentMs += 3500L // 3.5s per line estimated for plain text
            }
        }
        return list
    }

    private fun sanitizeTitle(title: String): String {
        return title
            .replace(Regex("\\|.*$"), " ")
            .replace(Regex("\\[[^\\]]*\\]"), " ")
            .replace(Regex("\\((?!feat\\.|ft\\.)[^)]*\\)", RegexOption.IGNORE_CASE), " ")
            .replace(Regex("(?i)\\b(Official\\s*(Music\\s*)?Video|Video\\s*Song|Lyric(al)?\\s*Video|Full\\s*Video|Full\\s*Song|HD|4K|Remix|Cover|Audio|OST|Shorts|Teaser|Promo)\\b"), " ")
            .replace(Regex("[-–—]"), " ")
            .trim()
            .replace(Regex("\\s+"), " ")
    }

    private fun sanitizeArtist(artist: String): String {
        return artist
            .split(",")
            .firstOrNull()
            ?.split("•")
            ?.firstOrNull()
            ?.replace(Regex("\\b(Topic|Official|VEVO)\\b", RegexOption.IGNORE_CASE), "")
            ?.trim()
            ?: artist.trim()
    }

    private fun httpGet(urlString: String, timeoutMs: Int): String? {
        var conn: HttpURLConnection? = null
        return try {
            val url = URL(urlString)
            conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = timeoutMs
                readTimeout = timeoutMs
                setRequestProperty("User-Agent", "Vibentra-Music-App/1.0 (Android)")
                setRequestProperty("Accept", "application/json")
            }
            if (conn.responseCode in 200..299) {
                val reader = BufferedReader(InputStreamReader(conn.inputStream, "UTF-8"))
                val sb = StringBuilder()
                var line: String?
                while (reader.readLine().also { line = it } != null) {
                    sb.append(line).append("\n")
                }
                reader.close()
                sb.toString()
            } else null
        } catch (_: Exception) {
            null
        } finally {
            conn?.disconnect()
        }
    }
}
