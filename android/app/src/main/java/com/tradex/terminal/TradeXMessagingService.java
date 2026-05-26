package com.tradex.terminal;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class TradeXMessagingService extends FirebaseMessagingService {

    private static final String CHANNEL_ID = "default";

    @Override
    public void onMessageReceived(RemoteMessage message) {
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

        createChannel();
        showNotification(title, body);
    }

    private void showNotification(String title, String body) {
        Bitmap largeIcon = BitmapFactory.decodeResource(
            getResources(), R.mipmap.ic_launcher_round
        );

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
                .setSmallIcon(R.drawable.ic_notification)
                .setLargeIcon(largeIcon)
                .setContentTitle(title)
                .setContentText(body)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setDefaults(NotificationCompat.DEFAULT_VIBRATE | NotificationCompat.DEFAULT_SOUND)
                .setAutoCancel(true);

        if (pi != null) builder.setContentIntent(pi);

        NotificationManagerCompat mgr = NotificationManagerCompat.from(this);
        try {
            mgr.notify((int) System.currentTimeMillis(), builder.build());
        } catch (SecurityException ignored) {}
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm =
                (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                NotificationChannel ch = new NotificationChannel(
                    CHANNEL_ID,
                    "TradeX Notifications",
                    NotificationManager.IMPORTANCE_HIGH
                );
                ch.setDescription("TradeX market alerts and signals");
                nm.createNotificationChannel(ch);
            }
        }
    }
}
