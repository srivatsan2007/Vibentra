package com.srivatsan.vibentra;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import android.telephony.TelephonyManager;
import android.util.Log;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.media.app.NotificationCompat.MediaStyle;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class BackgroundAudioService extends Service implements AudioManager.OnAudioFocusChangeListener {
    private static final String TAG = "VibentraBackgroundService";

    public static final String CHANNEL_ID = "vibentra_media_channel";
    public static final int NOTIFICATION_ID = 8881;

    public static final String ACTION_PLAY = "com.srivatsan.vibentra.ACTION_PLAY";
    public static final String ACTION_PAUSE = "com.srivatsan.vibentra.ACTION_PAUSE";
    public static final String ACTION_NEXT = "com.srivatsan.vibentra.ACTION_NEXT";
    public static final String ACTION_PREVIOUS = "com.srivatsan.vibentra.ACTION_PREVIOUS";
    public static final String ACTION_STOP = "com.srivatsan.vibentra.ACTION_STOP";

    private PowerManager.WakeLock wakeLock;
    private WifiManager.WifiLock wifiLock;
    private MediaSessionCompat mediaSession;
    private AudioManager audioManager;
    private AudioFocusRequest audioFocusRequest;

    private String currentTitle = "Vibentra Music";
    private String currentArtist = "Playing...";
    private String currentCoverUrl = "";
    private boolean isPlaying = false;
    private boolean resumeOnFocusGain = false;
    private boolean wasPlayingBeforeCall = false;
    private boolean isCallActive = false;
    private Bitmap coverBitmap = null;

    private final BroadcastReceiver noisyReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            try {
                if (AudioManager.ACTION_AUDIO_BECOMING_NOISY.equals(intent.getAction())) {
                    Log.d(TAG, "AUDIO_BECOMING_NOISY: Headset unplugged, pausing audio.");
                    if (isPlaying) {
                        BackgroundAudioPlugin.handleMediaAction(ACTION_PAUSE);
                    }
                }
            } catch (Throwable t) {
                t.printStackTrace();
            }
        }
    };

    private final BroadcastReceiver callReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            try {
                String state = intent.getStringExtra(TelephonyManager.EXTRA_STATE);
                Log.d(TAG, "PHONE_STATE_CHANGED: " + state);
                if (TelephonyManager.EXTRA_STATE_RINGING.equals(state) || TelephonyManager.EXTRA_STATE_OFFHOOK.equals(state)) {
                    Log.d(TAG, "PHONE_CALL_ACTIVE: Incoming/Active call detected. Pausing audio and locking playback...");
                    isCallActive = true;
                    if (isPlaying || wasPlayingBeforeCall) {
                        wasPlayingBeforeCall = true;
                        isPlaying = false;
                    }
                    BackgroundAudioPlugin.handleMediaAction(ACTION_PAUSE);
                } else if (TelephonyManager.EXTRA_STATE_IDLE.equals(state)) {
                    Log.d(TAG, "PHONE_CALL_ENDED: Call ended. Unlocking playback and resuming audio...");
                    isCallActive = false;
                    if (wasPlayingBeforeCall) {
                        wasPlayingBeforeCall = false;
                        isPlaying = true;
                        BackgroundAudioPlugin.handleMediaAction(ACTION_PLAY);
                    }
                }
            } catch (Throwable t) {
                t.printStackTrace();
            }
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "SERVICE_CREATED");
        try {
            createNotificationChannel();

            PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (powerManager != null) {
                wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "vibentra:BackgroundAudioWakeLock");
                wakeLock.setReferenceCounted(false);
            }

            try {
                WifiManager wifiManager = (WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE);
                if (wifiManager != null) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        wifiLock = wifiManager.createWifiLock(WifiManager.WIFI_MODE_FULL_LOW_LATENCY, "vibentra:BackgroundWifiLock");
                    } else {
                        wifiLock = wifiManager.createWifiLock(WifiManager.WIFI_MODE_FULL_HIGH_PERF, "vibentra:BackgroundWifiLock");
                    }
                    wifiLock.setReferenceCounted(false);
                }
            } catch (Throwable t) {
                Log.w(TAG, "WifiLock creation warning", t);
            }

            audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            requestAudioFocus();

            mediaSession = new MediaSessionCompat(this, "VibentraMediaSession");
            mediaSession.setCallback(new MediaSessionCompat.Callback() {
                @Override
                public void onPlay() {
                    Log.d(TAG, "MEDIA_SESSION_ACTION: onPlay");
                    BackgroundAudioPlugin.handleMediaAction(ACTION_PLAY);
                }
                @Override
                public void onPause() {
                    Log.d(TAG, "MEDIA_SESSION_ACTION: onPause");
                    BackgroundAudioPlugin.handleMediaAction(ACTION_PAUSE);
                }
                @Override
                public void onSkipToNext() {
                    Log.d(TAG, "MEDIA_SESSION_ACTION: onSkipToNext");
                    BackgroundAudioPlugin.handleMediaAction(ACTION_NEXT);
                }
                @Override
                public void onSkipToPrevious() {
                    Log.d(TAG, "MEDIA_SESSION_ACTION: onSkipToPrevious");
                    BackgroundAudioPlugin.handleMediaAction(ACTION_PREVIOUS);
                }
                @Override
                public void onStop() {
                    Log.d(TAG, "MEDIA_SESSION_ACTION: onStop");
                    BackgroundAudioPlugin.handleMediaAction(ACTION_PAUSE);
                }
            });
            mediaSession.setActive(true);
            Log.d(TAG, "MEDIA_SESSION_ACTIVE: VibentraMediaSession active.");

            try {
                registerReceiver(noisyReceiver, new IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY));
                registerReceiver(callReceiver, new IntentFilter(TelephonyManager.ACTION_PHONE_STATE_CHANGED));
            } catch (Throwable e) {
                e.printStackTrace();
            }
        } catch (Throwable t) {
            t.printStackTrace();
        }
    }

    private void requestAudioFocus() {
        if (audioManager == null) return;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                AudioAttributes playbackAttributes = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build();
                audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                        .setAudioAttributes(playbackAttributes)
                        .setAcceptsDelayedFocusGain(true)
                        .setOnAudioFocusChangeListener(this)
                        .build();
                audioManager.requestAudioFocus(audioFocusRequest);
            } else {
                audioManager.requestAudioFocus(this, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN);
            }
            Log.d(TAG, "AUDIO_FOCUS_REQUESTED");
        } catch (Throwable e) {
            e.printStackTrace();
        }
    }

    private void abandonAudioFocus() {
        if (audioManager == null) return;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
                audioManager.abandonAudioFocusRequest(audioFocusRequest);
            } else {
                audioManager.abandonAudioFocus(this);
            }
            Log.d(TAG, "AUDIO_FOCUS_ABANDONED");
        } catch (Throwable e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onAudioFocusChange(int focusChange) {
        try {
            Log.d(TAG, "AUDIO_FOCUS_CHANGE: " + focusChange);
            switch (focusChange) {
                case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT:
                case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK:
                    if (isPlaying) {
                        resumeOnFocusGain = true;
                        BackgroundAudioPlugin.handleMediaAction(ACTION_PAUSE);
                    }
                    break;

                case AudioManager.AUDIOFOCUS_LOSS:
                    resumeOnFocusGain = false;
                    if (isPlaying) {
                        BackgroundAudioPlugin.handleMediaAction(ACTION_PAUSE);
                    }
                    break;

                case AudioManager.AUDIOFOCUS_GAIN:
                    if (isCallActive) {
                        Log.d(TAG, "AUDIOFOCUS_GAIN ignored because phone call is still active.");
                        break;
                    }
                    if (resumeOnFocusGain) {
                        resumeOnFocusGain = false;
                        BackgroundAudioPlugin.handleMediaAction(ACTION_PLAY);
                    }
                    break;
            }
        } catch (Throwable t) {
            t.printStackTrace();
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "SERVICE_STARTED with intent action: " + (intent != null ? intent.getAction() : "null"));
        try {
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
                requestAudioFocus();
                if (wakeLock != null && !wakeLock.isHeld()) {
                    try {
                        wakeLock.acquire(10 * 60 * 60 * 1000L /* 10 hours max */);
                        Log.d(TAG, "WAKE_LOCK_ACQUIRED");
                    } catch (Throwable t) {}
                }
                if (wifiLock != null && !wifiLock.isHeld()) {
                    try {
                        wifiLock.acquire();
                        Log.d(TAG, "WIFI_LOCK_ACQUIRED");
                    } catch (Throwable t) {}
                }
            } else {
                if (wakeLock != null && wakeLock.isHeld()) {
                    try {
                        wakeLock.release();
                        Log.d(TAG, "WAKE_LOCK_RELEASED");
                    } catch (Throwable t) {}
                }
                if (wifiLock != null && wifiLock.isHeld()) {
                    try {
                        wifiLock.release();
                        Log.d(TAG, "WIFI_LOCK_RELEASED");
                    } catch (Throwable t) {}
                }
            }

            updateMediaSessionState();
            Notification notification = buildNotification();

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
        } catch (Throwable t) {
            t.printStackTrace();
        }

        return START_STICKY;
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        super.onTaskRemoved(rootIntent);
        Log.d(TAG, "TASK_REMOVED: Ensuring foreground media playback service remains active.");
        try {
            if (isPlaying) {
                Notification notification = buildNotification();
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
                } else {
                    startForeground(NOTIFICATION_ID, notification);
                }
            }
        } catch (Throwable t) {
            t.printStackTrace();
        }
    }

    private void updateMediaSessionState() {
        if (mediaSession == null) return;
        try {
            int state = isPlaying ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED;
            PlaybackStateCompat.Builder stateBuilder = new PlaybackStateCompat.Builder()
                    .setActions(PlaybackStateCompat.ACTION_PLAY | PlaybackStateCompat.ACTION_PAUSE |
                                PlaybackStateCompat.ACTION_SKIP_TO_NEXT | PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS)
                    .setState(state, PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN, 1.0f);
            mediaSession.setPlaybackState(stateBuilder.build());
        } catch (Throwable t) {
            t.printStackTrace();
        }
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
                conn.setConnectTimeout(5000);
                conn.setReadTimeout(5000);
                conn.connect();
                InputStream input = conn.getInputStream();

                BitmapFactory.Options options = new BitmapFactory.Options();
                options.inSampleSize = 2; // Downsample bitmap to avoid OutOfMemoryError
                Bitmap bitmap = BitmapFactory.decodeStream(input, null, options);

                if (bitmap != null) {
                    coverBitmap = bitmap;
                    Notification notification = buildNotification();
                    NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                    if (nm != null) {
                        nm.notify(NOTIFICATION_ID, notification);
                    }
                }
            } catch (Throwable t) {
                t.printStackTrace();
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
        Log.d(TAG, "SERVICE_DESTROYED");
        try {
            unregisterReceiver(noisyReceiver);
            unregisterReceiver(callReceiver);
        } catch (Throwable e) {}
        abandonAudioFocus();
        if (wakeLock != null && wakeLock.isHeld()) {
            try {
                wakeLock.release();
                Log.d(TAG, "WAKE_LOCK_RELEASED");
            } catch (Throwable t) {}
        }
        if (wifiLock != null && wifiLock.isHeld()) {
            try {
                wifiLock.release();
                Log.d(TAG, "WIFI_LOCK_RELEASED");
            } catch (Throwable t) {}
        }
        if (mediaSession != null) {
            try {
                mediaSession.release();
            } catch (Throwable t) {}
        }
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
