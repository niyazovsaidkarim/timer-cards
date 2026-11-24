package uz.saidkarim.focus;

import android.app.*;
import android.content.*;
import android.os.*;
import android.provider.Settings;
import android.media.AudioManager;
import android.media.ToneGenerator;
import org.json.*;

public class TimerReceiver extends BroadcastReceiver {
    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences("MainActivity", Context.MODE_PRIVATE);
    }
    static NotificationManager notifications(Context c) {
        return c.getSystemService(NotificationManager.class);
    }
    static void quiet(Context c, boolean enabled) {
        NotificationManager manager = notifications(c);
        SharedPreferences settings = prefs(c);
        try {
            if (!manager.isNotificationPolicyAccessGranted()) return;
            boolean owns = settings.getBoolean("quietOwned", false);
            int filter = manager.getCurrentInterruptionFilter();
            if (enabled && !owns && filter == NotificationManager.INTERRUPTION_FILTER_ALL) {
                manager.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_PRIORITY);
                settings.edit().putBoolean("quietOwned", true).commit();
            } else if (!enabled && owns) {
                if (Build.VERSION.SDK_INT >= 35 || filter == NotificationManager.INTERRUPTION_FILTER_PRIORITY)
                    manager.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALL);
                settings.edit().remove("quietOwned").commit();
            }
        } catch (SecurityException ignored) { }
    }
    static PendingIntent action(Context c, String name, long deadline) {
        Intent intent = new Intent(c, TimerReceiver.class).setAction(name).putExtra("deadline", deadline);
        return PendingIntent.getBroadcast(c, 0, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }
    static void sync(Context c, JSONObject state) {
        JSONObject session = state.optJSONObject("active");
        boolean running = session != null && session.optBoolean("running");
        long end = running ? session.optLong("deadline") : 0;
        boolean live = end > System.currentTimeMillis();
        quiet(c, live && state.optBoolean("quiet") && "focus".equals(session.optString("mode")));
        NotificationManager manager = notifications(c);
        AlarmManager alarms = c.getSystemService(AlarmManager.class);
        PendingIntent alarm = action(c, "end", end);
        alarms.cancel(alarm);
        if (!live) { manager.cancel(11); return; }
        alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,end,alarm);
        manager.createNotificationChannel(new NotificationChannel("countdown","Countdown",NotificationManager.IMPORTANCE_LOW));
        PendingIntent open = PendingIntent.getActivity(c,1,new Intent(c,MainActivity.class),PendingIntent.FLAG_IMMUTABLE);
        Notification current = new Notification.Builder(c,"countdown")
            .setContentTitle("break".equals(session.optString("mode")) ? "Break" : session.optString("task","Study"))
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm).setWhen(end).setUsesChronometer(true)
            .setChronometerCountDown(true).setOngoing(true).setOnlyAlertOnce(true)
            .setVisibility(Notification.VISIBILITY_PUBLIC).setContentIntent(open)
            .addAction(android.R.drawable.ic_media_pause,"Pause",action(c,"pause",end)).build();
        manager.notify(11,current);
    }
    static void signal(Context c,long end,String cue) {
        SharedPreferences settings=prefs(c);
        if (end<=0 || settings.getLong("lastSignal",0)==end) return;
        settings.edit().putLong("lastSignal",end).commit();
        quiet(c,false);
        notifications(c).cancel(11);
        if ("vibrate".equals(cue)) {
            c.getSystemService(Vibrator.class).vibrate(VibrationEffect.createOneShot(240,VibrationEffect.DEFAULT_AMPLITUDE));
        } else if ("sound".equals(cue)) {
            try {
                ToneGenerator tone=new ToneGenerator(AudioManager.STREAM_NOTIFICATION,65);
                tone.startTone(ToneGenerator.TONE_PROP_ACK,230);
                new Handler(Looper.getMainLooper()).postDelayed(tone::release,400);
            } catch (RuntimeException ignored) { }
        }
        NotificationManager manager=notifications(c);
        manager.createNotificationChannel(new NotificationChannel("finished","Session finished",NotificationManager.IMPORTANCE_LOW));
        manager.notify(12,new Notification.Builder(c,"finished").setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("Session finished").setAutoCancel(true).setContentIntent(PendingIntent.getActivity(c,1,new Intent(c,MainActivity.class),PendingIntent.FLAG_IMMUTABLE)).build());
    }
    public void onReceive(Context c,Intent intent) {
        try {
            JSONObject state=new JSONObject(prefs(c).getString("state","{}"));
            JSONObject s=state.optJSONObject("active");
            long deadline=intent.getLongExtra("deadline",0);
            if(s==null || !s.optBoolean("running") || s.optLong("deadline")!=deadline)return;
            long now=System.currentTimeMillis();
            if(now>=deadline) {signal(c,deadline,state.optString("cue","vibrate"));return;}
            if("pause".equals(intent.getAction())) {
                s.getJSONArray("spans").put(new JSONArray().put(s.getLong("since")).put(now));
                s.put("running",false);
                prefs(c).edit().putString("state",state.toString()).putBoolean("externalPause",true).commit();
                sync(c,state);
            }
        } catch (JSONException ignored) { }
    }
}
