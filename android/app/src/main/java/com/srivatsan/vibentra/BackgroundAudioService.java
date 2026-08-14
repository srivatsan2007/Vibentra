package com.srivatsan.vibentra;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.media.app.NotificationCompat.MediaStyle;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class BackgroundAudioService extends Service {
    public static final String CHANNEL_ID = "vibentra_media_channel";
    public static final int NOTIFICATION_ID = 8881;

    public static final String ACTION_PLAY = "com.srivatsan.vibentra.ACTION_PLAY";
    public static final String ACTION_PAUSE = "com.srivatsan.vibentra.ACTION_PAUSE";
    public static final String ACTION_NEXT = "com.srivatsan.vibentra.ACTION_NEXT";
    public static final String ACTION_PREVIOUS = "com.srivatsan.vibentra.ACTION_PREVIOUS";
    public static final String ACTION_STOP = "com.srivatsan.vibentra.ACTION_STOP";

    private PowerManager.WakeLock wakeLock;
    private MediaSessionCompat mediaSession;

    private String currentTitle = "Vibentra Music";
    private String currentArtist = "Playing...";
    private String currentCoverUrl = "";
    private boolean isPlaying = false;
    private Bitmap coverBitmap = null;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();

        PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "vibentra:BackgroundAudioWakeLock");
            wakeLock.setReferenceCounted(false);
        }

        mediaSession = new MediaSessionCompat(this, "VibentraMediaSession");
        mediaSession.setCallback(new MediaSessionCompat.Callback() {
            @Override
            public void onPlay() {
                BackgroundAudioPlugin.handleMediaAction(ACTION_PLAY);
            }
            @Override
            public void onPause() {
                BackgroundAudioPlugin.handleMediaAction(ACTION_PAUSE);
            }
            @Override
            public void onSkipToNext() {
                BackgroundAudioPlugin.handleMediaAction(ACTION_NEXT);
            }
            @Override
            public void onSkipToPrevious() {
                BackgroundAudioPlugin.handleMediaAction(ACTION_PREVIOUS);
            }
        });
        mediaSession.setActive(true);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && intent.getAction() != null) {
            String action = intent.getAction();
            if (action.equals(ACTION_PLAY) || action.equals(ACTION_PAUSE) || 
                action.equals(ACTION_NEXT) || action.equals(ACTION_PREVIOUS)) {
                
                BackgroundAudioPlugin.handleMediaAction(action);
            } else if (action.equals(ACTION_STOP)) {
                stopSelf();
                return START_NOT_STICKY;
            }
        }

        if (intent != null) {
            String title = intent.getStringExtra("title");
            String artist = intent.getStringExtra("artist");
            String cover = intent.getStringExtra("cover");
            boolean playing = intent.getBooleanExtra("isPlaying", true);

            if (title != null) currentTitle = title;
            if (artist != null) currentArtist = artist;
            if (playing != this.isPlaying) this.isPlaying = playing;

            if (cover != null && !cover.equals(currentCoverUrl)) {
                currentCoverUrl = cover;
                fetchCoverBitmap(cover);
            }
        }

        if (this.isPlaying) {
            if (wakeLock != null && !wakeLock.isHeld()) {
                wakeLock.acquire(10 * 60 * 60 * 1000L /* 10 hours max */);
            }
        } else {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
        }

        updateMediaSessionState();
        Notification notification = buildNotification();
        startForeground(NOTIFICATION_ID, notification);

        return START_STICKY;
    }

    private void updateMediaSessionState() {
        if (mediaSession == null) return;
        int state = isPlaying ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED;
        PlaybackStateCompat.Builder stateBuilder = new PlaybackStateCompat.Builder()
                .setActions(PlaybackStateCompat.ACTION_PLAY | PlaybackStateCompat.ACTION_PAUSE |
                            PlaybackStateCompat.ACTION_SKIP_TO_NEXT | PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS)
                .setState(state, PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN, 1.0f);
        mediaSession.setPlaybackState(stateBuilder.build());
    }

    private Notification buildNotification() {
        Intent activityIntent = new Intent(this, MainActivity.class);
        activityIntent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent contentIntent = PendingIntent.getActivity(
                this, 0, activityIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        PendingIntent prevIntent = PendingIntent.getService(
                this, 1, new Intent(this, BackgroundAudioService.class).setAction(ACTION_PREVIOUS),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        PendingIntent playPauseIntent = PendingIntent.getService(
                this, 2, new Intent(this, BackgroundAudioService.class).setAction(isPlaying ? ACTION_PAUSE : ACTION_PLAY),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        PendingIntent nextIntent = PendingIntent.getService(
                this, 3, new Intent(this, BackgroundAudioService.class).setAction(ACTION_NEXT),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        int playPauseIcon = isPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play;

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_media_play)
                .setContentTitle(currentTitle)
                .setContentText(currentArtist)
                .setSubText("Vibentra Music")
                .setContentIntent(contentIntent)
                .setOngoing(isPlaying)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .addAction(android.R.drawable.ic_media_previous, "Previous", prevIntent)
                .addAction(playPauseIcon, isPlaying ? "Pause" : "Play", playPauseIntent)
                .addAction(android.R.drawable.ic_media_next, "Next", nextIntent)
                .setStyle(new MediaStyle()
                        .setShowActionsInCompactView(0, 1, 2)
                        .setMediaSession(mediaSession.getSessionToken()));

        if (coverBitmap != null) {
            builder.setLargeIcon(coverBitmap);
        }

        return builder.build();
    }

    private void fetchCoverBitmap(String urlStr) {
        new Thread(() -> {
            try {
                URL url = new URL(urlStr);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setDoInput(true);
                conn.connect();
                InputStream input = conn.getInputStream();
                Bitmap bitmap = BitmapFactory.decodeStream(input);
                if (bitmap != null) {
                    coverBitmap = bitmap;
                    Notification notification = buildNotification();
                    NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                    if (nm != null) {
                        nm.notify(NOTIFICATION_ID, notification);
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }).start();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Vibentra Background Music",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Shows active playback controls for Vibentra");
            channel.setShowBadge(false);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    @Override
    public void onDestroy() {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        if (mediaSession != null) {
            mediaSession.release();
        }
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
