package com.srivatsan.vibentra

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.telephony.PhoneStateListener
import android.telephony.TelephonyCallback
import android.telephony.TelephonyManager
import android.util.Log
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.activity.OnBackPressedCallback
import androidx.annotation.RequiresApi
import com.getcapacitor.BridgeActivity
import com.vibentra.music.player.AudioPlayerManager

/**
 * MainActivity for Vibentra (Kotlin)
 * Edge-to-edge hardware accelerated presentation with 100% frontend feature parity,
 * background audio engine, and mobile home screen widget synchronization.
 */
class MainActivity : BridgeActivity() {

    companion object {
        private const val TAG = "VibentraMainActivity"
    }

    private val screenStateReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (Intent.ACTION_SCREEN_OFF == intent?.action) {
                Log.d(TAG, "SCREEN_OFF: Ensuring WebView timers and background playback state remain active.")
                keepWebViewActive()
            } else if (Intent.ACTION_SCREEN_ON == intent?.action) {
                Log.d(TAG, "SCREEN_ON: Restoring foreground WebView state.")
                keepWebViewActive()
            }
        }
    }

    private val webViewActiveHandler = Handler(Looper.getMainLooper())
    private val keepActiveRunnable = object : Runnable {
        override fun run() {
            keepWebViewActive()
            webViewActiveHandler.postDelayed(this, 3000)
        }
    }

    private var isCallPausedForActivity = false
    private var currentPopupWebView: WebView? = null
    private val paletteExecutor = java.util.concurrent.Executors.newSingleThreadExecutor()

    private fun extractImagePaletteNative(imageUrl: String) {
        if (imageUrl.isBlank()) return
        paletteExecutor.execute {
            try {
                val palette = kotlinx.coroutines.runBlocking {
                    com.vibentra.music.theme.DynamicPaletteExtractor.extractFromUrl(this@MainActivity, imageUrl)
                }
                val domHex = palette.dominantHex
                val secHex = palette.secondaryHex
                val accHex = palette.accentHex
                val bgHex = palette.backgroundHex

                runOnUiThread {
                    try {
                        val safeUrl = imageUrl.replace("'", "\\'")
                        bridge?.webView?.evaluateJavascript(
                            "if (typeof window.onNativePaletteExtracted === 'function') { window.onNativePaletteExtracted('$safeUrl', '$domHex', '$secHex', '$accHex', '$bgHex'); }",
                            null
                        )
                    } catch (t: Throwable) {
                        Log.w(TAG, "Error posting extracted palette to WebView", t)
                    }
                }
            } catch (t: Throwable) {
                Log.w(TAG, "Native palette extraction error for $imageUrl", t)
            }
        }
    }

    private fun dismissPopup() {
        runOnUiThread {
            try {
                if (currentPopupWebView != null) {
                    val popup = currentPopupWebView
                    (popup?.parent as? android.view.ViewGroup)?.removeView(popup)
                    popup?.destroy()
                    currentPopupWebView = null
                }
            } catch (e: Exception) {
                Log.w(TAG, "Error dismissing popup", e)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        setTheme(R.style.AppTheme_NoActionBar)
        registerPlugin(BackgroundAudioPlugin::class.java)
        super.onCreate(savedInstanceState)

        // Clear window background so no splash drawable ever stretches or bleeds through
        window.setBackgroundDrawable(ColorDrawable(Color.parseColor("#061A1C")))

        // Initialize native audio player manager
        try {
            AudioPlayerManager.init(this)
        } catch (t: Throwable) {
            Log.w(TAG, "AudioPlayerManager init notice", t)
        }

        setupWebViewSettings()
        setupBackNavigation()
        requestPhoneStatePermission()

        try {
            val filter = IntentFilter().apply {
                addAction(Intent.ACTION_SCREEN_OFF)
                addAction(Intent.ACTION_SCREEN_ON)
            }
            registerReceiver(screenStateReceiver, filter)
        } catch (e: Exception) {
            Log.w(TAG, "Screen state receiver registration warning", e)
        }

        webViewActiveHandler.post(keepActiveRunnable)
        handleIncomingUpdateIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIncomingUpdateIntent(intent)
    }

    private fun handleIncomingUpdateIntent(intent: Intent?) {
        if (intent != null && intent.getBooleanExtra("open_update", false)) {
            Handler(Looper.getMainLooper()).postDelayed({
                try {
                    val webView = bridge?.webView
                    webView?.evaluateJavascript(
                        "if (typeof window.openUpdateDetailsModal === 'function') { window.openUpdateDetailsModal(); }",
                        null
                    )
                } catch (t: Throwable) {
                    Log.w(TAG, "Error triggering update modal from intent", t)
                }
            }, 900)
        }
    }

    private fun setupBackNavigation() {
        try {
            onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    triggerAppBackNavigation()
                }
            })
            Log.d(TAG, "ON_BACK_PRESSED_DISPATCHER_REGISTERED")
        } catch (e: Exception) {
            Log.w(TAG, "Error configuring OnBackPressedDispatcher callback", e)
        }
    }

    private fun triggerAppBackNavigation() {
        if (currentPopupWebView != null) {
            dismissPopup()
            return
        }
        try {
            val webView = bridge?.webView
            if (webView != null) {
                runOnUiThread {
                    try {
                        webView.evaluateJavascript(
                            "if (typeof window.handleAppBackNavigation === 'function') { window.handleAppBackNavigation(); } else { window.history.back(); }",
                            null
                        )
                    } catch (t: Throwable) {
                        Log.w(TAG, "Error evaluating back navigation JS", t)
                        finish()
                    }
                }
                return
            }
        } catch (t: Throwable) {
            Log.w(TAG, "Error in triggerAppBackNavigation", t)
        }
        finish()
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        triggerAppBackNavigation()
    }

    private fun requestPhoneStatePermission() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val perms = mutableListOf<String>()
                if (checkSelfPermission(android.Manifest.permission.READ_PHONE_STATE) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                    perms.add(android.Manifest.permission.READ_PHONE_STATE)
                }
                if (Build.VERSION.SDK_INT >= 33) {
                    if (checkSelfPermission("android.permission.POST_NOTIFICATIONS") != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                        perms.add("android.permission.POST_NOTIFICATIONS")
                    }
                }
                if (perms.isNotEmpty()) {
                    requestPermissions(perms.toTypedArray(), 1001)
                }
            }
            registerTelephonyCallbackInActivity()
        } catch (e: Exception) {
            Log.w(TAG, "Permission request error", e)
        }
    }

    @RequiresApi(Build.VERSION_CODES.S)
    private inner class ActivityCallStateCallback : TelephonyCallback(), TelephonyCallback.CallStateListener {
        override fun onCallStateChanged(state: Int) {
            handleActivityCallState(state)
        }
    }

    private fun registerTelephonyCallbackInActivity() {
        try {
            val tm = getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
            if (tm != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    tm.registerTelephonyCallback(mainExecutor, ActivityCallStateCallback())
                } else {
                    @Suppress("DEPRECATION")
                    tm.listen(object : PhoneStateListener() {
                        @Deprecated("Deprecated in Java")
                        override fun onCallStateChanged(state: Int, phoneNumber: String?) {
                            handleActivityCallState(state)
                        }
                    }, PhoneStateListener.LISTEN_CALL_STATE)
                }
                Log.d(TAG, "ACTIVITY_TELEPHONY_LISTENER_ACTIVE")
            }
        } catch (e: Exception) {
            Log.w(TAG, "Activity telephony listener warning", e)
        }
    }

    private fun handleActivityCallState(state: Int) {
        try {
            if (state == TelephonyManager.CALL_STATE_RINGING || state == TelephonyManager.CALL_STATE_OFFHOOK) {
                Log.d(TAG, "ACTIVITY_CALL_PAUSE: Phone call active. Force pausing WebView audio.")
                isCallPausedForActivity = true
                runOnUiThread {
                    try {
                        bridge?.webView?.evaluateJavascript("if(window.musicService) window.musicService.forceCallPause();", null)
                    } catch (t: Throwable) {
                        t.printStackTrace()
                    }
                }
            } else if (state == TelephonyManager.CALL_STATE_IDLE) {
                if (isCallPausedForActivity) {
                    isCallPausedForActivity = false
                    Log.d(TAG, "ACTIVITY_CALL_RESUME: Phone call ended. Restoring WebView audio.")
                    runOnUiThread {
                        try {
                            bridge?.webView?.evaluateJavascript("if(window.musicService) window.musicService.forceCallResume();", null)
                        } catch (t: Throwable) {
                            t.printStackTrace()
                        }
                    }
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    override fun onResume() {
        super.onResume()
        keepWebViewActive()
    }

    override fun onPause() {
        super.onPause()
        keepWebViewActive()
    }

    override fun onStop() {
        super.onStop()
        keepWebViewActive()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        keepWebViewActive()
    }

    private fun keepWebViewActive() {
        try {
            val webView = bridge?.webView
            if (webView != null) {
                webView.onResume()
                webView.resumeTimers()
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error in keepWebViewActive", e)
        }
    }

    private fun setupWebViewSettings() {
        try {
            val webView = bridge?.webView ?: return
            val settings = webView.settings
            settings.mediaPlaybackRequiresUserGesture = false
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            settings.javaScriptCanOpenWindowsAutomatically = true
            settings.setSupportMultipleWindows(true)
            settings.cacheMode = WebSettings.LOAD_DEFAULT

            val cookieManager = CookieManager.getInstance()
            cookieManager.setAcceptCookie(true)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                settings.offscreenPreRaster = true
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                cookieManager.setAcceptThirdPartyCookies(webView, true)
            }

            val paletteBridgeObj = object : Any() {
                @JavascriptInterface
                fun exitApp() {
                    runOnUiThread { finish() }
                }

                @JavascriptInterface
                fun extractPalette(imageUrl: String) {
                    extractImagePaletteNative(imageUrl)
                }
            }
            webView.addJavascriptInterface(paletteBridgeObj, "NativeBackBridge")
            webView.addJavascriptInterface(paletteBridgeObj, "NativePaletteBridge")

            // Track active popup webview
            webView.webChromeClient = object : WebChromeClient() {
                override fun onCreateWindow(view: WebView?, isDialog: Boolean, isUserGesture: Boolean, resultMsg: android.os.Message?): Boolean {
                    val popupWebView = WebView(this@MainActivity)
                    currentPopupWebView = popupWebView

                    popupWebView.settings.javaScriptEnabled = true
                    popupWebView.settings.domStorageEnabled = true
                    popupWebView.settings.databaseEnabled = true
                    popupWebView.settings.javaScriptCanOpenWindowsAutomatically = true
                    popupWebView.settings.setSupportMultipleWindows(true)
                    popupWebView.settings.cacheMode = WebSettings.LOAD_DEFAULT

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        CookieManager.getInstance().setAcceptThirdPartyCookies(popupWebView, true)
                    }

                    popupWebView.layoutParams = FrameLayout.LayoutParams(
                        android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                        android.view.ViewGroup.LayoutParams.MATCH_PARENT
                    )

                    // Cross-window communication bridge between OAuth popup and main app WebView
                    popupWebView.addJavascriptInterface(object : Any() {
                        @JavascriptInterface
                        fun onAuthSuccess(data: String) {
                            runOnUiThread {
                                try {
                                    webView.evaluateJavascript("window.postMessage($data, '*');", null)
                                    webView.evaluateJavascript("if (typeof window.onGoogleAuthVerified === 'function') { window.onGoogleAuthVerified(); }", null)
                                } catch (t: Throwable) {
                                    Log.w(TAG, "Error posting auth message to main webview", t)
                                }
                                dismissPopup()
                            }
                        }

                        @JavascriptInterface
                        fun onAuthClose() {
                            runOnUiThread {
                                dismissPopup()
                            }
                        }
                    }, "AuthPopupBridge")

                    popupWebView.webChromeClient = this
                    popupWebView.webViewClient = object : WebViewClient() {
                        private fun checkAuthRedirect(url: String?) {
                            if (url == null) return
                            if (url.contains("/__/auth/handler") || url.contains("vibentra.firebaseapp.com")) {
                                Log.d(TAG, "Google OAuth handler reached: $url")
                                runOnUiThread {
                                    webView.evaluateJavascript("""
                                        if (typeof window.onGoogleAuthVerified === 'function') {
                                            window.onGoogleAuthVerified();
                                        }
                                    """.trimIndent(), null)
                                    // Auto-dismiss safety: close popup after auth handler is reached
                                    Handler(Looper.getMainLooper()).postDelayed({
                                        dismissPopup()
                                    }, 1000)
                                }
                            }
                        }

                        override fun shouldOverrideUrlLoading(v: WebView?, request: WebResourceRequest?): Boolean {
                            val url = request?.url?.toString() ?: ""
                            checkAuthRedirect(url)
                            return false
                        }

                        override fun onPageStarted(v: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                            super.onPageStarted(v, url, favicon)
                            checkAuthRedirect(url)
                        }

                        override fun onPageFinished(v: WebView?, url: String?) {
                            super.onPageFinished(v, url)
                            checkAuthRedirect(url)
                            if (url != null && (url.contains("/__/auth/handler") || url.contains("vibentra.firebaseapp.com"))) {
                                v?.evaluateJavascript("""
                                    (function() {
                                        var origPost = window.opener ? window.opener.postMessage : null;
                                        window.opener = window.opener || {};
                                        window.opener.postMessage = function(msg, targetOrigin) {
                                            try {
                                                if (window.AuthPopupBridge) {
                                                    var str = typeof msg === 'string' ? msg : JSON.stringify(msg);
                                                    window.AuthPopupBridge.onAuthSuccess(str);
                                                }
                                            } catch(e) {}
                                            if (origPost) {
                                                try { origPost.call(window.opener, msg, targetOrigin); } catch(e) {}
                                            }
                                        };
                                        var origClose = window.close;
                                        window.close = function() {
                                            try {
                                                if (window.AuthPopupBridge) {
                                                    window.AuthPopupBridge.onAuthClose();
                                                }
                                            } catch(e) {}
                                            if (origClose) {
                                                try { origClose.call(window); } catch(e) {}
                                            }
                                        };
                                    })();
                                """.trimIndent(), null)
                            }
                        }
                    }

                    view?.addView(popupWebView)
                    val transport = resultMsg?.obj as? WebView.WebViewTransport
                    transport?.webView = popupWebView
                    resultMsg?.sendToTarget()
                    return true
                }

                override fun onCloseWindow(window: WebView?) {
                    dismissPopup()
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error configuring WebSettings", e)
        }
    }

    override fun onDestroy() {
        try {
            unregisterReceiver(screenStateReceiver)
        } catch (_: Exception) {}
        super.onDestroy()
    }
}
