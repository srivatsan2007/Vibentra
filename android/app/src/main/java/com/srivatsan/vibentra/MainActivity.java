package com.srivatsan.vibentra;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "VibentraMainActivity";

    private final BroadcastReceiver screenStateReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (Intent.ACTION_SCREEN_OFF.equals(intent.getAction())) {
                Log.d(TAG, "SCREEN_OFF: Ensuring WebView timers and background playback state remain active.");
                keepWebViewActive();
            } else if (Intent.ACTION_SCREEN_ON.equals(intent.getAction())) {
                Log.d(TAG, "SCREEN_ON: Restoring foreground WebView state.");
                keepWebViewActive();
            }
        }
    };

    private final android.os.Handler webViewActiveHandler = new android.os.Handler(android.os.Looper.getMainLooper());
    private final Runnable keepActiveRunnable = new Runnable() {
        @Override
        public void run() {
            keepWebViewActive();
            webViewActiveHandler.postDelayed(this, 3000);
        }
    };

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BackgroundAudioPlugin.class);
        super.onCreate(savedInstanceState);
        setupWebViewSettings();
        requestPhoneStatePermission();

        try {
            IntentFilter filter = new IntentFilter();
            filter.addAction(Intent.ACTION_SCREEN_OFF);
            filter.addAction(Intent.ACTION_SCREEN_ON);
            registerReceiver(screenStateReceiver, filter);
        } catch (Exception e) {
            Log.w(TAG, "Screen state receiver registration warning", e);
        }

        webViewActiveHandler.post(keepActiveRunnable);
    }

    private void requestPhoneStatePermission() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (checkSelfPermission(android.Manifest.permission.READ_PHONE_STATE) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(new String[]{android.Manifest.permission.READ_PHONE_STATE}, 1001);
                }
            }
            registerTelephonyCallbackInActivity();
        } catch (Exception e) {
            Log.w(TAG, "Permission request error", e);
        }
    }

    private void registerTelephonyCallbackInActivity() {
        try {
            android.telephony.TelephonyManager tm = (android.telephony.TelephonyManager) getSystemService(Context.TELEPHONY_SERVICE);
            if (tm != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    tm.registerTelephonyCallback(getMainExecutor(), new android.telephony.TelephonyCallback() implements android.telephony.TelephonyCallback.CallStateListener {
                        @Override
                        public void onCallStateChanged(int state) {
                            handleActivityCallState(state);
                        }
                    });
                } else {
                    tm.listen(new android.telephony.PhoneStateListener() {
                        @Override
                        public void onCallStateChanged(int state, String phoneNumber) {
                            handleActivityCallState(state);
                        }
                    }, android.telephony.PhoneStateListener.LISTEN_CALL_STATE);
                }
                Log.d(TAG, "ACTIVITY_TELEPHONY_LISTENER_ACTIVE");
            }
        } catch (Exception e) {
            Log.w(TAG, "Activity telephony listener warning", e);
        }
    }

    private void handleActivityCallState(int state) {
        try {
            if (state == android.telephony.TelephonyManager.CALL_STATE_RINGING || state == android.telephony.TelephonyManager.CALL_STATE_OFFHOOK) {
                Log.d(TAG, "ACTIVITY_CALL_PAUSE: Phone call active. Force pausing WebView audio.");
                runOnUiThread(() -> {
                    try {
                        if (getBridge() != null && getBridge().getWebView() != null) {
                            getBridge().getWebView().evaluateJavascript("if(window.musicService) window.musicService.forceCallPause();", null);
                        }
                    } catch (Throwable t) {
                        t.printStackTrace();
                    }
                });
            } else if (state == android.telephony.TelephonyManager.CALL_STATE_IDLE) {
                Log.d(TAG, "ACTIVITY_CALL_RESUME: Phone call ended. Restoring WebView audio.");
                runOnUiThread(() -> {
                    try {
                        if (getBridge() != null && getBridge().getWebView() != null) {
                            getBridge().getWebView().evaluateJavascript("if(window.musicService) window.musicService.forceCallResume();", null);
                        }
                    } catch (Throwable t) {
                        t.printStackTrace();
                    }
                });
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        keepWebViewActive();
    }

    @Override
    public void onPause() {
        super.onPause();
        keepWebViewActive();
    }

    @Override
    public void onStop() {
        super.onStop();
        keepWebViewActive();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        keepWebViewActive();
    }

    @Override
    public void onWindowVisibilityChanged(int visibility) {
        super.onWindowVisibilityChanged(visibility);
        keepWebViewActive();
    }

    private void keepWebViewActive() {
        try {
            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView != null) {
                webView.onResume();
                webView.resumeTimers();
            }
        } catch (Exception e) {
            Log.w(TAG, "Error in keepWebViewActive", e);
        }
    }

    private void setupWebViewSettings() {
        try {
            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView != null) {
                WebSettings settings = webView.getSettings();
                settings.setMediaPlaybackRequiresUserGesture(false);
                settings.setJavaScriptEnabled(true);
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setCacheMode(WebSettings.LOAD_DEFAULT);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    settings.setOffscreenPreRaster(true);
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Error configuring WebSettings", e);
        }
    }

    @Override
    public void onDestroy() {
        try {
            unregisterReceiver(screenStateReceiver);
        } catch (Exception e) {}
        super.onDestroy();
    }
}
