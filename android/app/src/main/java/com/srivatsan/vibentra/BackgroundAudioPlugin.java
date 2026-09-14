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

import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

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
            String title = call.getString("title", "Update available");
            String version = call.getString("version", "");
            String body = call.getString("body", version != null && !version.isEmpty() ? (version.startsWith("v") ? version : "v" + version) : "v1.4.4");
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
                        channel.enableLights(true);
                        channel.enableVibration(true);
                        channel.setShowBadge(true);
                        nm.createNotificationChannel(channel);
                    }

                    Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
                    android.app.PendingIntent pendingIntent = null;
                    if (launchIntent != null) {
                        launchIntent.setAction(Intent.ACTION_MAIN);
                        launchIntent.addCategory(Intent.CATEGORY_LAUNCHER);
                        launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                        launchIntent.putExtra("open_update", true);
                        launchIntent.putExtra("version", version);

                        pendingIntent = android.app.PendingIntent.getActivity(
                                context,
                                2001,
                                launchIntent,
                                android.app.PendingIntent.FLAG_UPDATE_CURRENT | (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M ? android.app.PendingIntent.FLAG_IMMUTABLE : 0)
                        );
                    }

                    android.graphics.Bitmap largeIcon = null;
                    try {
                        largeIcon = android.graphics.BitmapFactory.decodeResource(context.getResources(), R.mipmap.ic_launcher);
                    } catch (Throwable t) {}

                    androidx.core.app.NotificationCompat.Builder builder = new androidx.core.app.NotificationCompat.Builder(context, channelId)
                            .setSmallIcon(R.mipmap.ic_launcher)
                            .setContentTitle(title)
                            .setContentText(body)
                            .setAutoCancel(true)
                            .setPriority(androidx.core.app.NotificationCompat.PRIORITY_HIGH)
                            .setDefaults(androidx.core.app.NotificationCompat.DEFAULT_ALL);

                    if (largeIcon != null) {
                        builder.setLargeIcon(largeIcon);
                    }
                    if (pendingIntent != null) {
                        builder.setContentIntent(pendingIntent);
                    }

                    nm.notify(2001, builder.build());
                }
            }
        } catch (Throwable t) {
            t.printStackTrace();
        } finally {
            call.resolve();
        }
    }

    @PluginMethod
    public void exitApp(PluginCall call) {
        try {
            if (getActivity() != null) {
                getActivity().finish();
            }
        } catch (Throwable t) {
            t.printStackTrace();
        } finally {
            call.resolve();
        }
    }

    private static final Map<String, String> ytStreamCache = new ConcurrentHashMap<>();
    private static volatile String cachedVisitorData = "CgtTbDhxV2pETUFSTSj_qJ3VBjIKCgJJThIEGgAgWA%3D%3D";

    @PluginMethod
    public void resolveYouTubeStream(PluginCall call) {
        String videoId = call.getString("videoId");
        if (videoId == null || videoId.isEmpty()) {
            call.reject("Missing videoId");
            return;
        }

        new Thread(() -> {
            try {
                String cleanId = videoId.replace("yt_", "").split("_")[0].split("&")[0];
                String directUrl = resolveStreamNative(cleanId);

                if (directUrl != null && !directUrl.isEmpty()) {
                    JSObject ret = new JSObject();
                    ret.put("streamUrl", directUrl);
                    call.resolve(ret);
                } else {
                    call.reject("Failed to resolve stream");
                }
            } catch (Throwable t) {
                Log.w(TAG, "Error in resolveYouTubeStream", t);
                call.reject("Stream error: " + t.getMessage());
            }
        }).start();
    }

    private static String resolveStreamNative(String videoId) {
        if (videoId == null || videoId.isEmpty()) return null;

        if (ytStreamCache.containsKey(videoId)) {
            return ytStreamCache.get(videoId);
        }

        String[][] clients = new String[][] {
            {"VISIONOS", "114", "1.2.0", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15"},
            {"ANDROID_VR", "28", "1.65.10", "Mozilla/5.0 (Android; Mobile VR) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"},
            {"TVHTML5", "7", "7.20230405.08.01", "Mozilla/5.0 (SMART-TV; Linux; Tizen 5.0) AppleWebKit/538.1 (KHTML, like Gecko) Version/5.0 TV Safari/538.1"}
        };

        for (String[] client : clients) {
            HttpURLConnection conn = null;
            try {
                URL url = new URL("https://music.youtube.com/youtubei/v1/player");
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setConnectTimeout(6000);
                conn.setReadTimeout(6000);
                conn.setDoOutput(true);
                conn.setDoInput(true);

                conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
                conn.setRequestProperty("Accept", "application/json");
                conn.setRequestProperty("User-Agent", client[3]);
                conn.setRequestProperty("X-YouTube-Client-Name", client[1]);
                conn.setRequestProperty("X-YouTube-Client-Version", client[2]);
                conn.setRequestProperty("X-Origin", "https://music.youtube.com");
                conn.setRequestProperty("Referer", "https://music.youtube.com/");
                if (cachedVisitorData != null) {
                    conn.setRequestProperty("X-Goog-Visitor-Id", cachedVisitorData);
                }

                JSONObject clientObj = new JSONObject();
                clientObj.put("clientName", client[0]);
                clientObj.put("clientVersion", client[2]);
                clientObj.put("gl", "IN");
                clientObj.put("hl", "en");

                JSONObject contextObj = new JSONObject();
                contextObj.put("client", clientObj);

                JSONObject bodyObj = new JSONObject();
                bodyObj.put("context", contextObj);
                bodyObj.put("videoId", videoId);
                bodyObj.put("contentCheckOk", true);
                bodyObj.put("racyCheckOk", true);

                OutputStreamWriter writer = new OutputStreamWriter(conn.getOutputStream(), "UTF-8");
                writer.write(bodyObj.toString());
                writer.flush();
                writer.close();

                int responseCode = conn.getResponseCode();
                InputStream is = (responseCode >= 200 && responseCode <= 299) ? conn.getInputStream() : conn.getErrorStream();
                if (is != null) {
                    BufferedReader reader = new BufferedReader(new InputStreamReader(is, "UTF-8"));
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) {
                        sb.append(line);
                    }
                    reader.close();

                    JSONObject resJson = new JSONObject(sb.toString());

                    JSONObject respCtx = resJson.optJSONObject("responseContext");
                    if (respCtx != null) {
                        String vData = respCtx.optString("visitorData", null);
                        if (vData != null && !vData.isEmpty()) {
                            cachedVisitorData = vData;
                        }
                    }

                    JSONObject playability = resJson.optJSONObject("playabilityStatus");
                    String status = playability != null ? playability.optString("status", "") : "";
                    if (!"OK".equalsIgnoreCase(status)) continue;

                    JSONObject streamingData = resJson.optJSONObject("streamingData");
                    if (streamingData == null) continue;

                    JSONArray adaptiveFormats = streamingData.optJSONArray("adaptiveFormats");
                    if (adaptiveFormats == null || adaptiveFormats.length() == 0) continue;

                    String chosenUrl = null;
                    int maxBitrate = 0;

                    for (int i = 0; i < adaptiveFormats.length(); i++) {
                        JSONObject format = adaptiveFormats.getJSONObject(i);
                        String mimeType = format.optString("mimeType", "");
                        if (mimeType.contains("audio") && format.has("url")) {
                            int itag = format.optInt("itag", 0);
                            int bitrate = format.optInt("bitrate", 0);
                            String u = format.optString("url", null);

                            if (itag == 251 && u != null && u.startsWith("http")) {
                                chosenUrl = u;
                                break;
                            }
                            if (itag == 140 && u != null && u.startsWith("http") && chosenUrl == null) {
                                chosenUrl = u;
                            } else if (bitrate > maxBitrate && u != null && u.startsWith("http") && chosenUrl == null) {
                                maxBitrate = bitrate;
                                chosenUrl = u;
                            }
                        }
                    }

                    if (chosenUrl != null && !chosenUrl.isEmpty()) {
                        ytStreamCache.put(videoId, chosenUrl);
                        return chosenUrl;
                    }
                }
            } catch (Throwable t) {
                // Continue cascade
            } finally {
                if (conn != null) conn.disconnect();
            }
        }

        return null;
    }
}
