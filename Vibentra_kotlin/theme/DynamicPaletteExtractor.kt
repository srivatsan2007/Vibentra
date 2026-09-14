package com.vibentra.music.theme

import android.content.Context
import android.graphics.Bitmap
import android.graphics.drawable.BitmapDrawable
import androidx.compose.runtime.*
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import coil.ImageLoader
import coil.request.ImageRequest
import coil.request.SuccessResult
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Dynamic Palette Extractor for Vibentra (Echo Music Canvas Parity).
 * Samples dominant, vibrant, and atmospheric dark tones from album artwork
 * to create a fluid, morphing ambient mesh background.
 */
data class DynamicPlayerPalette(
    val dominant: Color = Color(0xFF2E0909),
    val secondary: Color = Color(0xFF140303),
    val background: Color = Color(0xFF080202),
    val accent: Color = Color(0xFF06B6D4)
)

object DynamicPaletteExtractor {

    suspend fun extractFromUrl(context: Context, imageUrl: String): DynamicPlayerPalette = withContext(Dispatchers.IO) {
        if (imageUrl.isBlank()) return@withContext DynamicPlayerPalette()

        try {
            val loader = ImageLoader(context)
            val request = ImageRequest.Builder(context)
                .data(imageUrl)
                .allowHardware(false) // Required for software pixel sampling
                .build()

            val result = loader.execute(request)
            if (result is SuccessResult) {
                val drawable = result.drawable
                val bitmap = (drawable as? BitmapDrawable)?.bitmap ?: return@withContext DynamicPlayerPalette()
                return@withContext extractFromBitmap(bitmap)
            }
        } catch (_: Exception) {}

        DynamicPlayerPalette()
    }

    fun extractFromBitmap(bitmap: Bitmap): DynamicPlayerPalette {
        return try {
            val scaled = Bitmap.createScaledBitmap(bitmap, 24, 24, false)
            val width = scaled.width
            val height = scaled.height

            val colorCounts = HashMap<Int, Int>()
            for (y in 0 until height) {
                for (x in 0 until width) {
                    val pixel = scaled.getPixel(x, y)
                    if ((pixel ushr 24) < 128) continue

                    // Quantize 8-bit to 4-bit intervals for grouping
                    val r = ((pixel shr 16) and 0xFF) / 16 * 16
                    val g = ((pixel shr 8) and 0xFF) / 16 * 16
                    val b = (pixel and 0xFF) / 16 * 16
                    val quantized = (0xFF shl 24) or (r shl 16) or (g shl 8) or b

                    colorCounts[quantized] = (colorCounts[quantized] ?: 0) + 1
                }
            }

            val scored = colorCounts.entries.map { (colorInt, count) ->
                val r = ((colorInt shr 16) and 0xFF) / 255f
                val g = ((colorInt shr 8) and 0xFF) / 255f
                val b = (colorInt and 0xFF) / 255f

                val max = maxOf(r, g, b)
                val min = minOf(r, g, b)
                val delta = max - min
                val saturation = if (max == 0f) 0f else delta / max
                val luminance = (max + min) / 2f

                val lumWeight = if (luminance in 0.15f..0.85f) 1.2f else 0.3f
                val score = count * (saturation * 2.5f + 0.5f) * lumWeight
                Pair(colorInt, score)
            }.sortedByDescending { it.second }

            val dominantInt = scored.firstOrNull()?.first ?: 0xFF2E0909.toInt()
            val secondaryInt = scored.getOrNull(1)?.first ?: 0xFF140303.toInt()

            // Dark atmospheric bottom vignette tone
            val domR = (((dominantInt shr 16) and 0xFF) * 0.2f).toInt().coerceIn(0, 255)
            val domG = (((dominantInt shr 8) and 0xFF) * 0.2f).toInt().coerceIn(0, 255)
            val domB = ((dominantInt and 0xFF) * 0.2f).toInt().coerceIn(0, 255)
            val bgInt = (0xFF shl 24) or (domR shl 16) or (domG shl 8) or domB

            DynamicPlayerPalette(
                dominant = Color(dominantInt),
                secondary = Color(secondaryInt),
                background = Color(bgInt),
                accent = Color(dominantInt).copy(alpha = 1f)
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
