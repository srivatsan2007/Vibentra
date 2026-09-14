package com.vibentra.music.innertube

/**
 * YouTubeClient definitions ported directly from Echo Music (GPL-3.0 / Metrolist).
 * Defines exact client payloads and headers to bypass YouTube's 403 Forbidden 1 MiB byte cap
 * and n-throttling challenges.
 */
data class YouTubeClient(
    val clientName: String,
    val clientVersion: String,
    val clientId: String,
    val userAgent: String,
    val osName: String? = null,
    val osVersion: String? = null,
    val deviceMake: String? = null,
    val deviceModel: String? = null,
    val androidSdkVersion: String? = null,
    val friendlyName: String? = null,
    val loginSupported: Boolean = false,
    val isEmbedded: Boolean = false
) {
    companion object {
        const val ORIGIN_YOUTUBE_MUSIC = "https://music.youtube.com"
        const val REFERER_YOUTUBE_MUSIC = "https://music.youtube.com/"
        const val API_URL_YOUTUBE = "https://music.youtube.com/youtubei/v1/"

        /**
         * WEB_REMIX: The official YouTube Music client.
         * Used for search, browse, artist discographies, album tracks, and recommendations.
         */
        val WEB_REMIX = YouTubeClient(
            clientName = "WEB_REMIX",
            clientVersion = "1.20260213.01.00",
            clientId = "67",
            userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0",
            loginSupported = true
        )

        /**
         * VISIONOS (Apple VisionOS Client):
         * Measured by Echo Music to serve complete unthrottled audio files from Google Video CDN
         * with zero 1 MiB / 60-second 403 byte-range restrictions.
         */
        val VISIONOS = YouTubeClient(
            clientName = "VISIONOS",
            clientVersion = "0.1",
            clientId = "101",
            userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
            osName = "visionOS",
            osVersion = "1.3.21O771",
            deviceMake = "Apple",
            deviceModel = "RealityDevice14,1",
            friendlyName = "visionOS",
            loginSupported = false
        )

        /**
         * ANDROID_VR_1_65_10:
         * Pinned by yt-dlp master and YouTube.js. Serves 100% full-length direct audio formats
         * without cipher challenges. Used as secondary fallback.
         */
        val ANDROID_VR_1_65_10 = YouTubeClient(
            clientName = "ANDROID_VR",
            clientVersion = "1.65.10",
            clientId = "28",
            userAgent = "com.google.android.apps.youtube.vr.oculus/1.65.10 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip",
            osName = "Android",
            osVersion = "12L",
            deviceMake = "Oculus",
            deviceModel = "Quest 3",
            androidSdkVersion = "32",
            friendlyName = "Android VR 1.65",
            loginSupported = false
        )

        /**
         * TVHTML5:
         * Used for privately owned or uploaded tracks.
         */
        val TVHTML5 = YouTubeClient(
            clientName = "TVHTML5",
            clientVersion = "7.20260212.11.00",
            clientId = "7",
            userAgent = "Mozilla/5.0 (ChromiumStylePlatform; Linux x86_64; GoogleTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            friendlyName = "TV HTML5",
            loginSupported = true
        )

        /**
         * WEB_CREATOR:
         * Used for age-restricted or explicit tracks.
         */
        val WEB_CREATOR = YouTubeClient(
            clientName = "WEB_CREATOR",
            clientVersion = "1.20260213.01.00",
            clientId = "62",
            userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0",
            loginSupported = true
        )
    }
}
