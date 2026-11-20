package uz.saidkarim.focus;
import android.app.*;import android.content.*;
public class TimerReceiver extends BroadcastReceiver {
 public void onReceive(Context c,Intent i){notifyDone(c);}
 static void notifyDone(Context c){NotificationManager n=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);n.createNotificationChannel(new NotificationChannel("timer","Timer alerts",NotificationManager.IMPORTANCE_HIGH));PendingIntent p=PendingIntent.getActivity(c,1,new Intent(c,MainActivity.class),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);n.notify(1,new Notification.Builder(c,"timer").setSmallIcon(android.R.drawable.ic_lock_idle_alarm).setContentTitle("Timer finished").setContentText("Your session has finished.").setContentIntent(p).setOnlyAlertOnce(true).setAutoCancel(true).build());}
}
