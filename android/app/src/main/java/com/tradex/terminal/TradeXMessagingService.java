package com.tradex.terminal;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

/**
 * Custom FCM service that intercepts all push messages and displays them
 * with the full-color TradeX logo as the large icon (notification circle).
 *
 * Priority 1 in AndroidManifest ensures this runs before the Capacitor
 * default service so we control the notification appearance.
 */
public class TradeXMessagingService extends FirebaseMessagingService {

    private static final String CHANNEL_ID = "default";

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();
    }

    @Override
    public void onMessageReceived(RemoteMessage message) {
        // Prefer explicit data fields, fall back to notification payload
        String title = message.getData().get("title");
        String body  = message.getData().get("body");

        if (title == null && message.getNotification() != null) {
            title = message.getNotification().getTitle();
        }
        if (body == null && message.getNotification() != null) {
            body = message.getNotification().getBody();
        }

        if (title == null) title = "TradeX Alert";
        if (body   == null) body  = "";

        showNotification(title, body);
    }

    private void showNotification(String title, String body) {
        // Full-color TradeX logo shown in the notification circle
        Bitmap largeIcon = BitmapFactory.decodeResource(
            getResources(), R.mipmap.ic_launcher_round
        );

        // Tap opens the app
        Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pi = null;
        if (launch != null) {
            pi = PendingIntent.getActivity(
                this, 0, launch,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
        }

        NotificationCompat.Builder builder =
            new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notification)   // white monochrome — status bar
                .setLargeIcon(largeIcon)                    // full-color logo — notification circle
                .setContentTitle(title)
                .setContentText(body)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setDefaults(NotificationCompat.DEFAULT_VIBRATE | NotificationCompat.DEFAULT_SOUND)
                .setAutoCancel(true);

        if (pi != null) builder.setContentIntent(pi);

        NotificationManagerCompat mgr = NotificationManagerCompat.from(this);
        try {
            mgr.notify((int) System.currentTimeMillis(), builder.build());
        } catch (SecurityException ignored) {
            // POST_NOTIFICATIONS permission not granted
        }
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                CHANNEL_ID,
                "TradeX Notifications",
                NotificationManager.IMPORTANCE_HIGH
            );
            ch.setDescription("TradeX market alerts and signals");
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(ch);
        }
    }
}
