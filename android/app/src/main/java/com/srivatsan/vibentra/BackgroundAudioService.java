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
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import android.os.SystemClock;
import android.telephony.TelephonyCallback;
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
    private long currentDuration = 0L;
    private long currentPosition = 0L;
    private boolean resumeOnFocusGain = false;
    private boolean wasPlayingBeforeCall = false;
    private boolean isCallActive = false;
    private Bitmap coverBitmap = null;

    private int originalMusicVolume = -1;

    private synchronized void applyCallSilence(boolean enable) {
        if (audioManager == null) return;
        try {
            if (enable) {
                if (originalMusicVolume == -1) {
                    int currentVol = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC);
                    if (currentVol > 0) {
                        originalMusicVolume = currentVol;
                    }
                }
                audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, 0, 0);
                Log.d(TAG, "HARD_AUDIO_VOLUME_ZERO: STREAM_MUSIC forced to 0 for active call");
            } else {
                if (originalMusicVolume != -1) {
                    audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, originalMusicVolume, 0);
                    Log.d(TAG, "RESTORED_AUDIO_VOLUME: STREAM_MUSIC restored to " + originalMusicVolume);
                    originalMusicVolume = -1;
                }
            }
        } catch (Throwable t) {
            Log.w(TAG, "Call silence volume warning", t);
        }
    }

    private void processCallState(int state) {
        try {
            Log.d(TAG, "TELEPHONY_CALL_STATE_CHANGED: " + state);
            if (state == TelephonyManager.CALL_STATE_RINGING || state == TelephonyManager.CALL_STATE_OFFHOOK) {
                Log.d(TAG, "PHONE_CALL_ACTIVE: Call incoming/active. Forcing volume 0, abandoning focus, and pausing JS audio...");
                isCallActive = true;
                if (isPlaying || wasPlayingBeforeCall) {
                    wasPlayingBeforeCall = true;
                    isPlaying = false;
                }
                applyCallSilence(true);
                abandonAudioFocus();
                updateMediaSessionState();
                BackgroundAudioPlugin.handleMediaAction(ACTION_PAUSE);
            } else if (state == TelephonyManager.CALL_STATE_IDLE) {
                Log.d(TAG, "PHONE_CALL_ENDED: Call ended. Restoring volume and resuming JS audio...");
                isCallActive = false;
                applyCallSilence(false);
                if (wasPlayingBeforeCall) {
                    wasPlayingBeforeCall = false;
                    isPlaying = true;
                    requestAudioFocus();
                    updateMediaSessionState();
                    BackgroundAudioPlugin.handleMediaAction(ACTION_PLAY);
                }
            }
        } catch (Throwable t) {
            t.printStackTrace();
        }
    }

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
                String stateStr = intent.getStringExtra(TelephonyManager.EXTRA_STATE);
                Log.d(TAG, "PHONE_STATE_CHANGED Broadcast: " + stateStr);
                if (TelephonyManager.EXTRA_STATE_RINGING.equals(stateStr)) {
                    processCallState(TelephonyManager.CALL_STATE_RINGING);
                } else if (TelephonyManager.EXTRA_STATE_OFFHOOK.equals(stateStr)) {
                    processCallState(TelephonyManager.CALL_STATE_OFFHOOK);
                } else if (TelephonyManager.EXTRA_STATE_IDLE.equals(stateStr)) {
                    processCallState(TelephonyManager.CALL_STATE_IDLE);
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

            registerTelephonyListener();
        } catch (Throwable t) {
            t.printStackTrace();
        }
    }

    @androidx.annotation.RequiresApi(api = Build.VERSION_CODES.S)
    private class ServiceCallStateCallback extends TelephonyCallback implements TelephonyCallback.CallStateListener {
        @Override
        public void onCallStateChanged(int state) {
            processCallState(state);
        }
    }

    private void registerTelephonyListener() {
        try {
            TelephonyManager telephonyManager = (TelephonyManager) getSystemService(Context.TELEPHONY_SERVICE);
            if (telephonyManager != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    telephonyManager.registerTelephonyCallback(getMainExecutor(), new ServiceCallStateCallback());
                } else {
                    telephonyManager.listen(new android.telephony.PhoneStateListener() {
                        @Override
                        public void onCallStateChanged(int state, String phoneNumber) {
                            processCallState(state);
                        }
                    }, android.telephony.PhoneStateListener.LISTEN_CALL_STATE);
                }
                Log.d(TAG, "TELEPHONY_LISTENER_REGISTERED");
            }
        } catch (Throwable t) {
            Log.w(TAG, "Telephony listener registration warning", t);
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
                    Log.d(TAG, "AUDIOFOCUS_LOSS_TRANSIENT: Transient audio focus change logged.");
                    break;

                case AudioManager.AUDIOFOCUS_LOSS:
                    Log.d(TAG, "AUDIOFOCUS_LOSS: External audio focus change logged.");
                    break;

                case AudioManager.AUDIOFOCUS_GAIN:
                    Log.d(TAG, "AUDIOFOCUS_GAIN: Audio focus gained.");
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
                long duration = intent.getLongExtra("duration", -1L);
                long position = intent.getLongExtra("position", -1L);

                if (title != null && !title.trim().isEmpty()) currentTitle = title;
                if (artist != null && !artist.trim().isEmpty()) currentArtist = artist;
                this.isPlaying = playing;
                if (duration >= 0) currentDuration = duration;
                if (position >= 0) currentPosition = position;

                if (cover != null && !cover.equals(currentCoverUrl)) {
                    currentCoverUrl = cover;
                    fetchCoverBitmap(cover);
                }
            }

            if (this.isPlaying) {
                requestAudioFocus();
            }

            // Always maintain partial WakeLock and WifiLock while foreground service is active to prevent CPU sleep during track transitions
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
            Notification notification = buildNotification();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
        } catch (Throwable t) {
            t.printStackTrace();
        }
    }

    private void updateMediaSessionState() {
        if (mediaSession == null) return;
        try {
            int state = isPlaying ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED;
            long pos = currentPosition >= 0 ? currentPosition : PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN;
            float playbackSpeed = isPlaying ? 1.0f : 0.0f;

            PlaybackStateCompat.Builder stateBuilder = new PlaybackStateCompat.Builder()
                    .setActions(PlaybackStateCompat.ACTION_PLAY | PlaybackStateCompat.ACTION_PAUSE |
                                PlaybackStateCompat.ACTION_SKIP_TO_NEXT | PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS |
                                PlaybackStateCompat.ACTION_SEEK_TO)
                    .setState(state, pos, playbackSpeed, SystemClock.elapsedRealtime());
            mediaSession.setPlaybackState(stateBuilder.build());

            MediaMetadataCompat.Builder metadataBuilder = new MediaMetadataCompat.Builder()
                    .putString(MediaMetadataCompat.METADATA_KEY_TITLE, currentTitle)
                    .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, currentArtist)
                    .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, "Vibentra")
                    .putString(MediaMetadataCompat.METADATA_KEY_DISPLAY_TITLE, currentTitle)
                    .putString(MediaMetadataCompat.METADATA_KEY_DISPLAY_SUBTITLE, currentArtist);

            if (currentDuration > 0) {
                metadataBuilder.putLong(MediaMetadataCompat.METADATA_KEY_DURATION, currentDuration);
            }
            if (coverBitmap != null) {
                metadataBuilder.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, coverBitmap);
                metadataBuilder.putBitmap(MediaMetadataCompat.METADATA_KEY_ART, coverBitmap);
                metadataBuilder.putBitmap(MediaMetadataCompat.METADATA_KEY_DISPLAY_ICON, coverBitmap);
            }
            mediaSession.setMetadata(metadataBuilder.build());

            // Synchronize Home Screen Widget
            VibentraWidgetProvider.updateWidgetState(this, currentTitle, currentArtist, isPlaying, coverBitmap);
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
                if (urlStr == null || urlStr.trim().isEmpty()) {
                    coverBitmap = null;
                    updateMediaSessionState();
                    Notification notification = buildNotification();
                    NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                    if (nm != null) {
                        nm.notify(NOTIFICATION_ID, notification);
                    }
                    return;
                }
                URL url = new URL(urlStr);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setDoInput(true);
                conn.setConnectTimeout(6000);
                conn.setReadTimeout(6000);
                conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36");
                conn.setInstanceFollowRedirects(true);
                conn.connect();
                InputStream input = conn.getInputStream();

                BitmapFactory.Options options = new BitmapFactory.Options();
                options.inSampleSize = 1;
                Bitmap bitmap = BitmapFactory.decodeStream(input);

                if (bitmap != null) {
                    coverBitmap = bitmap;
                    updateMediaSessionState();
                    Notification notification = buildNotification();
                    NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                    if (nm != null) {
                        nm.notify(NOTIFICATION_ID, notification);
                    }
                }
            } catch (Throwable t) {
                Log.w(TAG, "Error downloading cover bitmap: " + t.getMessage());
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
