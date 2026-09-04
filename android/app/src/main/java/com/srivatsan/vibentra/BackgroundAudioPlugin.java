package com.srivatsan.vibentra;

import android.content.Context;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.webkit.WebView;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "BackgroundAudio")
public class BackgroundAudioPlugin extends Plugin {
    private static final String TAG = "BackgroundAudioPlugin";
    private static BackgroundAudioPlugin instance;

    @Override
    public void load() {
        super.load();
        instance = this;
    }

    public static void wakeWebView() {
        try {
            if (instance == null) return;
            new Handler(Looper.getMainLooper()).post(() -> {
                try {
                    if (instance != null && instance.getBridge() != null && instance.getBridge().getWebView() != null) {
                        WebView webView = instance.getBridge().getWebView();
                        webView.onResume();
                        webView.resumeTimers();
                    }
                } catch (Throwable t) {
                    Log.w(TAG, "Error waking WebView", t);
                }
            });
        } catch (Throwable t) {
            Log.w(TAG, "Error in wakeWebView", t);
        }
    }

    public static void handleMediaAction(String action) {
        try {
            if (instance == null) return;

            final String actKey;
            if (BackgroundAudioService.ACTION_PLAY.equals(action)) {
                actKey = "play";
            } else if (BackgroundAudioService.ACTION_PAUSE.equals(action)) {
                actKey = "pause";
            } else if (BackgroundAudioService.ACTION_NEXT.equals(action)) {
                actKey = "next";
            } else if (BackgroundAudioService.ACTION_PREVIOUS.equals(action)) {
                actKey = "previous";
            } else {
                actKey = action;
            }

            // Immediately wake WebView and evaluate direct Javascript on MainLooper
            new Handler(Looper.getMainLooper()).post(() -> {
                try {
                    if (instance != null && instance.getBridge() != null && instance.getBridge().getWebView() != null) {
                        WebView webView = instance.getBridge().getWebView();
                        webView.onResume();
                        webView.resumeTimers();
                        String script = "if (typeof window.handleNativeMediaAction === 'function') { window.handleNativeMediaAction('" + actKey + "'); }";
                        webView.evaluateJavascript(script, null);
                        Log.d(TAG, "Evaluated direct JS media action: " + actKey);
                    }
                } catch (Throwable t) {
                    Log.w(TAG, "Error evaluating direct JS media action", t);
                }
            });

            // Also dispatch standard Capacitor notification for listener compatibility
            JSObject ret = new JSObject();
            ret.put("action", actKey);
            instance.notifyListeners("mediaAction", ret);
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

            long duration = 0L;
            if (call.hasOption("duration")) {
                try {
                    Double d = call.getDouble("duration");
                    if (d != null) duration = d.longValue();
                } catch (Throwable t) {
                    try {
                        Long l = call.getLong("duration");
                        if (l != null) duration = l;
                    } catch (Throwable t2) {}
                }
            }

            long position = 0L;
            if (call.hasOption("position")) {
                try {
                    Double p = call.getDouble("position");
                    if (p != null) position = p.longValue();
                } catch (Throwable t) {
                    try {
                        Long l = call.getLong("position");
                        if (l != null) position = l;
                    } catch (Throwable t2) {}
                }
            }

            Context context = getContext();
            if (context != null) {
                Intent intent = new Intent(context, BackgroundAudioService.class);
                intent.putExtra("title", title);
                intent.putExtra("artist", artist);
                intent.putExtra("cover", cover);
                intent.putExtra("isPlaying", isPlaying);
                intent.putExtra("duration", duration);
                intent.putExtra("position", position);

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

    @PluginMethod
    public void showNotification(PluginCall call) {
        try {
            String title = call.getString("title", "Vibentra Update Available 🚀");
            String body = call.getString("body", "Vibentra update is available. Tap to update!");
            Context context = getContext();
            if (context != null) {
                android.app.NotificationManager nm = (android.app.NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm != null) {
                    String channelId = "vibentra_updates";
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                        android.app.NotificationChannel channel = new android.app.NotificationChannel(
                                channelId,
                                "Vibentra Updates",
                                android.app.NotificationManager.IMPORTANCE_HIGH
                        );
                        channel.setDescription("Notifications about new app updates and releases");
                        nm.createNotificationChannel(channel);
                    }

                    Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
                    android.app.PendingIntent pendingIntent = android.app.PendingIntent.getActivity(
                            context,
                            2001,
                            launchIntent,
                            android.app.PendingIntent.FLAG_UPDATE_CURRENT | (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M ? android.app.PendingIntent.FLAG_IMMUTABLE : 0)
                    );

                    androidx.core.app.NotificationCompat.Builder builder = new androidx.core.app.NotificationCompat.Builder(context, channelId)
                            .setSmallIcon(R.mipmap.ic_launcher)
                            .setContentTitle(title)
                            .setContentText(body)
                            .setAutoCancel(true)
                            .setPriority(androidx.core.app.NotificationCompat.PRIORITY_HIGH)
                            .setContentIntent(pendingIntent);

                    nm.notify(2001, builder.build());
                }
            }
        } catch (Throwable t) {
            t.printStackTrace();
        } finally {
            call.resolve();
        }
    }
}
