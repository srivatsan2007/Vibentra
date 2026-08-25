package com.srivatsan.vibentra;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.os.Build;
import android.util.Log;
import android.widget.RemoteViews;

public class VibentraWidgetProvider extends AppWidgetProvider {
    private static final String TAG = "VibentraWidgetProvider";

    public static final String ACTION_WIDGET_PLAY_PAUSE = "com.srivatsan.vibentra.WIDGET_PLAY_PAUSE";
    public static final String ACTION_WIDGET_NEXT = "com.srivatsan.vibentra.WIDGET_NEXT";
    public static final String ACTION_WIDGET_PREV = "com.srivatsan.vibentra.WIDGET_PREV";

    private static String cachedTitle = "Vibentra Music";
    private static String cachedArtist = "Select a song to play";
    private static boolean cachedIsPlaying = false;
    private static Bitmap cachedCover = null;

    public static void updateWidgetState(Context context, String title, String artist, boolean isPlaying, Bitmap cover) {
        if (title != null) cachedTitle = title;
        if (artist != null) cachedArtist = artist;
        cachedIsPlaying = isPlaying;
        if (cover != null) cachedCover = cover;

        try {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            ComponentName widget = new ComponentName(context, VibentraWidgetProvider.class);
            int[] appWidgetIds = manager.getAppWidgetIds(widget);
            if (appWidgetIds != null && appWidgetIds.length > 0) {
                updateAllWidgets(context, manager, appWidgetIds);
            }
        } catch (Throwable t) {
            Log.w(TAG, "Error updating widgets", t);
        }
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        super.onUpdate(context, appWidgetManager, appWidgetIds);
        updateAllWidgets(context, appWidgetManager, appWidgetIds);
    }

    private static void updateAllWidgets(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            try {
                RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.vibentra_widget_layout);

                views.setTextViewText(R.id.widget_title, cachedTitle);
                views.setTextViewText(R.id.widget_artist, cachedArtist);

                if (cachedIsPlaying) {
                    views.setImageViewResource(R.id.widget_btn_play_pause, R.drawable.ic_widget_pause);
                } else {
                    views.setImageViewResource(R.id.widget_btn_play_pause, R.drawable.ic_widget_play);
                }

                if (cachedCover != null && !cachedCover.isRecycled()) {
                    views.setImageViewBitmap(R.id.widget_cover, cachedCover);
                } else {
                    views.setImageViewResource(R.id.widget_cover, R.drawable.ic_widget_app_icon);
                }

                // Intent to open app when tapping widget body or album cover
                Intent appIntent = new Intent(context, MainActivity.class);
                appIntent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                PendingIntent appPendingIntent = PendingIntent.getActivity(
                        context, 0, appIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );
                views.setOnClickPendingIntent(R.id.widget_root, appPendingIntent);
                views.setOnClickPendingIntent(R.id.widget_cover, appPendingIntent);
                views.setOnClickPendingIntent(R.id.widget_info_container, appPendingIntent);

                // Intents for playback control buttons
                PendingIntent prevPendingIntent = getBroadcastPendingIntent(context, ACTION_WIDGET_PREV, 101);
                PendingIntent playPausePendingIntent = getBroadcastPendingIntent(context, ACTION_WIDGET_PLAY_PAUSE, 102);
                PendingIntent nextPendingIntent = getBroadcastPendingIntent(context, ACTION_WIDGET_NEXT, 103);

                views.setOnClickPendingIntent(R.id.widget_btn_prev, prevPendingIntent);
                views.setOnClickPendingIntent(R.id.widget_btn_play_pause, playPausePendingIntent);
                views.setOnClickPendingIntent(R.id.widget_btn_next, nextPendingIntent);

                appWidgetManager.updateAppWidget(appWidgetId, views);
            } catch (Throwable t) {
                Log.w(TAG, "Failed updating single widget ID: " + appWidgetId, t);
            }
        }
    }

    private static PendingIntent getBroadcastPendingIntent(Context context, String action, int requestCode) {
        Intent intent = new Intent(context, VibentraWidgetProvider.class);
        intent.setAction(action);
        return PendingIntent.getBroadcast(
                context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        try {
            String action = intent != null ? intent.getAction() : null;
            if (action == null) return;

            Log.d(TAG, "Widget broadcast received action: " + action);

            if (ACTION_WIDGET_PLAY_PAUSE.equals(action)) {
                sendServiceAction(context, cachedIsPlaying ? BackgroundAudioService.ACTION_PAUSE : BackgroundAudioService.ACTION_PLAY);
            } else if (ACTION_WIDGET_NEXT.equals(action)) {
                sendServiceAction(context, BackgroundAudioService.ACTION_NEXT);
            } else if (ACTION_WIDGET_PREV.equals(action)) {
                sendServiceAction(context, BackgroundAudioService.ACTION_PREVIOUS);
            }
        } catch (Throwable t) {
            Log.w(TAG, "Error in widget onReceive", t);
        }
    }

    private void sendServiceAction(Context context, String serviceAction) {
        try {
            Intent serviceIntent = new Intent(context, BackgroundAudioService.class);
            serviceIntent.setAction(serviceAction);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        } catch (Throwable t) {
            try {
                Intent serviceIntent = new Intent(context, BackgroundAudioService.class);
                serviceIntent.setAction(serviceAction);
                context.startService(serviceIntent);
            } catch (Throwable t2) {
                Log.w(TAG, "Failed sending action to BackgroundAudioService", t2);
            }
        }
    }
}
