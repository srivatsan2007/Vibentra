package com.srivatsan.vibentra;

import android.content.Context;
import android.content.Intent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "BackgroundAudio")
public class BackgroundAudioPlugin extends Plugin {

    private static BackgroundAudioPlugin instance;

    @Override
    public void load() {
        super.load();
        instance = this;
    }

    public static void handleMediaAction(String action) {
        try {
            if (instance == null) return;

            JSObject ret = new JSObject();
            if (BackgroundAudioService.ACTION_PLAY.equals(action)) {
                ret.put("action", "play");
            } else if (BackgroundAudioService.ACTION_PAUSE.equals(action)) {
                ret.put("action", "pause");
            } else if (BackgroundAudioService.ACTION_NEXT.equals(action)) {
                ret.put("action", "next");
            } else if (BackgroundAudioService.ACTION_PREVIOUS.equals(action)) {
                ret.put("action", "previous");
            }

            instance.notifyListeners("mediaAction", ret);

            // Direct WebView JavaScript evaluation backup for instant call auto-pause/resume
            if (instance.getBridge() != null && instance.getBridge().getWebView() != null) {
                instance.getBridge().getWebView().post(() -> {
                    try {
                        if (BackgroundAudioService.ACTION_PAUSE.equals(action)) {
                            instance.getBridge().getWebView().evaluateJavascript(
                                "if (window.musicService) { " +
                                "  window.musicService._isCallPaused = true; " +
                                "  if (window.musicService.audioPlayer && !window.musicService.audioPlayer.paused) { " +
                                "    window.musicService.audioPlayer.pause(); " +
                                "  } " +
                                "  window.musicService.isPlaying = false; " +
                                "  window.musicService.updatePlayPauseUI(false); " +
                                "}", null);
                        } else if (BackgroundAudioService.ACTION_PLAY.equals(action)) {
                            instance.getBridge().getWebView().evaluateJavascript(
                                "if (window.musicService) { " +
                                "  window.musicService._isCallPaused = false; " +
                                "  window.musicService.isPlaying = true; " +
                                "  window.musicService.updatePlayPauseUI(true); " +
                                "  window.musicService.safePlay('native_call_resume').catch(function(){}); " +
                                "}", null);
                        }
                    } catch (Throwable t) {
                        t.printStackTrace();
                    }
                });
            }
        } catch (Throwable t) {
            t.printStackTrace();
        }
    }

    @PluginMethod
    public void startService(PluginCall call) {
        try {
            String title = call.getString("title", "Vibentra Music");
            String artist = call.getString("artist", "Playing...");
            String cover = call.getString("cover", "");
            Boolean isPlaying = call.getBoolean("isPlaying", true);

            Context context = getContext();
            if (context != null) {
                Intent intent = new Intent(context, BackgroundAudioService.class);
                intent.putExtra("title", title);
                intent.putExtra("artist", artist);
                intent.putExtra("cover", cover);
                intent.putExtra("isPlaying", isPlaying);

                try {
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                        context.startForegroundService(intent);
                    } else {
                        context.startService(intent);
                    }
                } catch (Throwable t) {
                    // Fallback if startForegroundService throws ForegroundServiceStartNotAllowedException in background
                    try {
                        context.startService(intent);
                    } catch (Throwable t2) {
                        t2.printStackTrace();
                    }
                }
            }
        } catch (Throwable t) {
            t.printStackTrace();
        } finally {
            call.resolve();
        }
    }

    @PluginMethod
    public void stopService(PluginCall call) {
        try {
            Context context = getContext();
            if (context != null) {
                Intent intent = new Intent(context, BackgroundAudioService.class);
                intent.setAction(BackgroundAudioService.ACTION_STOP);
                context.startService(intent);
            }
        } catch (Throwable t) {
            t.printStackTrace();
        } finally {
            call.resolve();
        }
    }
}
