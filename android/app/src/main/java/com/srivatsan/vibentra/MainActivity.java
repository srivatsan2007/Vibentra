package com.srivatsan.vibentra;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BackgroundAudioPlugin.class);
        super.onCreate(savedInstanceState);
        
        setupWebViewSettings();
    }

    @Override
    public void onResume() {
        super.onResume();
        setupWebViewSettings();
    }

    @Override
    public void onPause() {
        super.onPause();
        // Prevent Chromium WebView from freezing JS timers during background audio playback
        try {
            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView != null) {
                webView.onResume();
            }
        } catch (Exception e) {
            e.printStackTrace();
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
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
