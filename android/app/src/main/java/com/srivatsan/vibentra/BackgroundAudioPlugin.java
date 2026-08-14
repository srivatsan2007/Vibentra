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
    }

    @PluginMethod
    public void startService(PluginCall call) {
        String title = call.getString("title", "Vibentra Music");
        String artist = call.getString("artist", "Playing...");
        String cover = call.getString("cover", "");
        Boolean isPlaying = call.getBoolean("isPlaying", true);

        Context context = getContext();
        Intent intent = new Intent(context, BackgroundAudioService.class);
        intent.putExtra("title", title);
        intent.putExtra("artist", artist);
        intent.putExtra("cover", cover);
        intent.putExtra("isPlaying", isPlaying);

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            context.startForegroundService(intent);
        } else {
            context.startService(intent);
        }

        call.resolve();
    }

    @PluginMethod
    public void stopService(PluginCall call) {
        Context context = getContext();
        Intent intent = new Intent(context, BackgroundAudioService.class);
        intent.setAction(BackgroundAudioService.ACTION_STOP);
        context.startService(intent);
        call.resolve();
    }
}
