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

            webView.addJavascriptInterface(object : Any() {
                @JavascriptInterface
                fun exitApp() {
                    runOnUiThread { finish() }
                }
            }, "NativeBackBridge")

            // Handle Google Auth popups directly inside the app instead of launching external Chrome browser
            webView.webChromeClient = object : WebChromeClient() {
                override fun onCreateWindow(view: WebView?, isDialog: Boolean, isUserGesture: Boolean, resultMsg: android.os.Message?): Boolean {
                    val popupWebView = WebView(this@MainActivity)
                    popupWebView.settings.javaScriptEnabled = true
                    popupWebView.settings.domStorageEnabled = true
                    popupWebView.settings.databaseEnabled = true
                    popupWebView.settings.javaScriptCanOpenWindowsAutomatically = true
                    popupWebView.settings.setSupportMultipleWindows(true)

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        CookieManager.getInstance().setAcceptThirdPartyCookies(popupWebView, true)
                    }

                    popupWebView.layoutParams = FrameLayout.LayoutParams(
                        android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                        android.view.ViewGroup.LayoutParams.MATCH_PARENT
                    )

                    popupWebView.webChromeClient = this
                    popupWebView.webViewClient = object : WebViewClient() {
                        override fun shouldOverrideUrlLoading(v: WebView?, request: WebResourceRequest?): Boolean {
                            return false
                        }
                    }

                    view?.addView(popupWebView)
                    val transport = resultMsg?.obj as? WebView.WebViewTransport
                    transport?.webView = popupWebView
                    resultMsg?.sendToTarget()
                    return true
                }

                override fun onCloseWindow(window: WebView?) {
                    try {
                        (window?.parent as? android.view.ViewGroup)?.removeView(window)
                    } catch (e: Exception) {
                        Log.w(TAG, "Error closing popup window", e)
                    }
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
