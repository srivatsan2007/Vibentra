package com.vibentra.music.theme

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import androidx.compose.runtime.*
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import coil.ImageLoader
import coil.request.ImageRequest
import coil.request.SuccessResult
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL
import kotlin.math.sqrt

/**
 * Dynamic Palette Extractor for Vibentra (Echo Music Canvas Parity).
 * Samples dominant, vibrant, and atmospheric dark tones from album artwork
 * to create a fluid, morphing ambient mesh background in both Kotlin Compose and Web/APK.
 */
data class DynamicPlayerPalette(
    val dominant: Color = Color(0xFF0E7490),
    val secondary: Color = Color(0xFF1E1B4B),
    val background: Color = Color(0xFF070B14),
    val accent: Color = Color(0xFF06B6D4),
    val ambientTop: Color = Color(0xFF16252E),
    val ambientBottom: Color = Color(0xFF0A1014),
    val dominantHex: String = "#0E7490",
    val secondaryHex: String = "#1E1B4B",
    val accentHex: String = "#06B6D4",
    val backgroundHex: String = "#070B14"
)

object DynamicPaletteExtractor {

    suspend fun extractFromUrl(context: Context, imageUrl: String): DynamicPlayerPalette = withContext(Dispatchers.IO) {
        if (imageUrl.isBlank()) return@withContext DynamicPlayerPalette()

        // 1. Try Coil ImageLoader first
        try {
            val loader = ImageLoader(context)
            val request = ImageRequest.Builder(context)
                .data(imageUrl)
                .allowHardware(false)
                .build()

            val result = loader.execute(request)
            if (result is SuccessResult) {
                val bitmap = drawableToBitmap(result.drawable)
                if (bitmap != null) {
                    return@withContext extractFromBitmap(bitmap)
                }
            }
        } catch (_: Exception) {}

        // 2. Direct network fallback (guaranteed cross-platform decoding)
        try {
            val url = URL(imageUrl)
            val conn = (url.openConnection() as HttpURLConnection).apply {
                connectTimeout = 4000
                readTimeout = 4000
                doInput = true
                instanceFollowRedirects = true
                setRequestProperty("User-Agent", "Vibentra-Android/1.4.4")
                connect()
            }
            if (conn.responseCode in 200..299) {
                val input = conn.inputStream
                val bitmap = android.graphics.BitmapFactory.decodeStream(input)
                input.close()
                conn.disconnect()
                if (bitmap != null) {
                    return@withContext extractFromBitmap(bitmap)
                }
            }
        } catch (_: Exception) {}

        DynamicPlayerPalette()
    }

    private fun drawableToBitmap(drawable: Drawable): Bitmap? {
        return try {
            if (drawable is BitmapDrawable && drawable.bitmap != null) {
                return drawable.bitmap
            }
            val width = if (drawable.intrinsicWidth > 0) drawable.intrinsicWidth else 64
            val height = if (drawable.intrinsicHeight > 0) drawable.intrinsicHeight else 64
            val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bitmap)
            drawable.setBounds(0, 0, canvas.width, canvas.height)
            drawable.draw(canvas)
            bitmap
        } catch (_: Exception) {
            null
        }
    }

    fun extractFromBitmap(bitmap: Bitmap): DynamicPlayerPalette {
        return try {
            val scaled = Bitmap.createScaledBitmap(bitmap, 32, 32, false)
            val width = scaled.width
            val height = scaled.height

            val colorCounts = HashMap<Int, Int>()
            for (y in 0 until height) {
                for (x in 0 until width) {
                    val pixel = scaled.getPixel(x, y)
                    if ((pixel ushr 24) < 128) continue

                    // Quantize 8-bit to 5-bit intervals for grouping distinct hues
                    val r = ((pixel shr 16) and 0xFF) / 8 * 8
                    val g = ((pixel shr 8) and 0xFF) / 8 * 8
                    val b = (pixel and 0xFF) / 8 * 8
                    val quantized = (0xFF shl 24) or (r shl 16) or (g shl 8) or b

                    colorCounts[quantized] = (colorCounts[quantized] ?: 0) + 1
                }
            }

            if (colorCounts.isEmpty()) return DynamicPlayerPalette()

            val scored = colorCounts.entries.map { (colorInt, count) ->
                val r = ((colorInt shr 16) and 0xFF) / 255f
                val g = ((colorInt shr 8) and 0xFF) / 255f
                val b = (colorInt and 0xFF) / 255f

                val max = maxOf(r, g, b)
                val min = minOf(r, g, b)
                val delta = max - min
                val saturation = if (max == 0f) 0f else delta / max
                val luminance = (max + min) / 2f

                // Echo Music aesthetic: favor vibrant, rich mid-luminance colors
                val lumWeight = when {
                    luminance in 0.25f..0.75f -> 1.5f
                    luminance in 0.15f..0.85f -> 1.0f
                    else -> 0.3f
                }
                val score = count * (saturation * 3.5f + 0.4f) * lumWeight
                Triple(colorInt, score, saturation)
            }.sortedByDescending { it.second }

            val dominantInt = scored.firstOrNull()?.first ?: 0xFF0E7490.toInt()

            // Find a distinct secondary tone (RGB distance > 45)
            val domR = (dominantInt shr 16) and 0xFF
            val domG = (dominantInt shr 8) and 0xFF
            val domB = dominantInt and 0xFF

            var secondaryInt = scored.drop(1).firstOrNull { (col, _, _) ->
                val cr = (col shr 16) and 0xFF
                val cg = (col shr 8) and 0xFF
                val cb = col and 0xFF
                val dist = sqrt(((domR - cr) * (domR - cr) + (domG - cg) * (domG - cg) + (domB - cb) * (domB - cb)).toDouble())
                dist > 45.0
            }?.first

            if (secondaryInt == null) {
                // Synthesize harmonious darker deep tone
                val secR = (domR * 0.45f).toInt().coerceIn(10, 255)
                val secG = (domG * 0.45f).toInt().coerceIn(15, 255)
                val secB = (domB * 0.65f).toInt().coerceIn(30, 255)
                secondaryInt = (0xFF shl 24) or (secR shl 16) or (secG shl 8) or secB
            }

            // Find accent: highest saturation in the list
            val accentInt = scored.maxByOrNull { it.third }?.first ?: dominantInt

            // Echo Music dark ambient tones:
            // Top: Rich, deep dominant tint (approx 20-25% brightness)
            val ambTopR = (domR * 0.28f).toInt().coerceIn(16, 68)
            val ambTopG = (domG * 0.28f).toInt().coerceIn(12, 68)
            val ambTopB = (domB * 0.28f).toInt().coerceIn(14, 68)
            val ambTopInt = (0xFF shl 24) or (ambTopR shl 16) or (ambTopG shl 8) or ambTopB

            // Bottom: Near-black cohesive tone with subtle tint
            val ambBotR = (domR * 0.10f).toInt().coerceIn(6, 26)
            val ambBotG = (domG * 0.10f).toInt().coerceIn(5, 26)
            val ambBotB = (domB * 0.12f).toInt().coerceIn(7, 28)
            val ambBotInt = (0xFF shl 24) or (ambBotR shl 16) or (ambBotG shl 8) or ambBotB

            // Deep ambient bottom tone (retains hint of dominant hue for dark mode cohesion)
            val bgR = (domR * 0.15f).toInt().coerceIn(5, 40)
            val bgG = (domG * 0.15f).toInt().coerceIn(8, 45)
            val bgB = (domB * 0.20f).toInt().coerceIn(12, 55)
            val bgInt = (0xFF shl 24) or (bgR shl 16) or (bgG shl 8) or bgB

            val domHex = String.format("#%06X", 0xFFFFFF and dominantInt)
            val secHex = String.format("#%06X", 0xFFFFFF and secondaryInt)
            val accHex = String.format("#%06X", 0xFFFFFF and accentInt)
            val bgHex = String.format("#%06X", 0xFFFFFF and bgInt)

            DynamicPlayerPalette(
                dominant = Color(dominantInt),
                secondary = Color(secondaryInt),
                background = Color(bgInt),
                accent = Color(accentInt),
                ambientTop = Color(ambTopInt),
                ambientBottom = Color(ambBotInt),
                dominantHex = domHex,
                secondaryHex = secHex,
                accentHex = accHex,
                backgroundHex = bgHex
            )
        } catch (_: Exception) {
            DynamicPlayerPalette()
        }
    }
}

@Composable
fun rememberDynamicPlayerPalette(coverUrl: String): State<DynamicPlayerPalette> {
    val context = LocalContext.current
    val paletteState = remember(coverUrl) { mutableStateOf(DynamicPlayerPalette()) }

    LaunchedEffect(coverUrl) {
        paletteState.value = DynamicPaletteExtractor.extractFromUrl(context, coverUrl)
    }

    return paletteState
}
