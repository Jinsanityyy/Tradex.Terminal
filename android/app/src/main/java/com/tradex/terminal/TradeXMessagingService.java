package com.tradex.terminal;

import android.app.ActivityManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.text.TextUtils;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import com.capacitorjs.plugins.pushnotifications.MessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

public class TradeXMessagingService extends MessagingService {

    private static final String CHANNEL_ID = "default";

    @Override
    public void onMessageReceived(@NonNull RemoteMessage message) {
        if (isAppInForeground()) {
            super.onMessageReceived(message);
            return;
        }

        createChannel();
        showNotification(message);
    }

    private void showNotification(RemoteMessage message) {
        String title = firstNonEmpty(
            message.getData().get("title"),
            message.getNotification() != null ? message.getNotification().getTitle() : null,
            "TradeX Alert"
        );
        String body = firstNonEmpty(
            message.getData().get("body"),
            message.getNotification() != null ? message.getNotification().getBody() : null,
            ""
        );
        String severity = firstNonEmpty(message.getData().get("severity"), "medium");
        String tag = emptyToNull(message.getData().get("tag"));

        Bitmap largeIcon = buildTradeXLargeIcon();

        Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pendingIntent = null;
        if (launch != null) {
            launch.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

            if (!TextUtils.isEmpty(message.getMessageId())) {
                launch.putExtra("google.message_id", message.getMessageId());
            }

            for (Map.Entry<String, String> entry : message.getData().entrySet()) {
                launch.putExtra(entry.getKey(), entry.getValue());
            }

            pendingIntent = PendingIntent.getActivity(
                this,
                buildNotificationId(message),
                launch,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setPriority("high".equalsIgnoreCase(severity)
                ? NotificationCompat.PRIORITY_HIGH
                : NotificationCompat.PRIORITY_DEFAULT)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setColor(ContextCompat.getColor(this, R.color.ic_launcher_background))
            .setDefaults(NotificationCompat.DEFAULT_VIBRATE | NotificationCompat.DEFAULT_SOUND)
            .setAutoCancel(true);

        if (largeIcon != null) {
            builder.setLargeIcon(largeIcon);
        }

        if (pendingIntent != null) {
            builder.setContentIntent(pendingIntent);
        }

        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(this);
        try {
            int notificationId = buildNotificationId(message);
            if (tag != null) {
                notificationManager.notify(tag, notificationId, builder.build());
            } else {
                notificationManager.notify(notificationId, builder.build());
            }
        } catch (SecurityException ignored) {
        }
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager =
                (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager != null) {
                NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "TradeX Notifications",
                    NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("TradeX market alerts and signals");
                notificationManager.createNotificationChannel(channel);
            }
        }
    }

    private boolean isAppInForeground() {
        ActivityManager.RunningAppProcessInfo appProcessInfo =
            new ActivityManager.RunningAppProcessInfo();
        ActivityManager.getMyMemoryState(appProcessInfo);
        return appProcessInfo.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
            || appProcessInfo.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_VISIBLE;
    }

    private int buildNotificationId(RemoteMessage message) {
        String stableKey = firstNonEmpty(
            message.getData().get("tag"),
            message.getMessageId(),
            String.valueOf(System.currentTimeMillis())
        );
        return stableKey.hashCode();
    }

    private String firstNonEmpty(String... values) {
        for (String value : values) {
            if (!TextUtils.isEmpty(value)) {
                return value;
            }
        }
        return "";
    }

    private String emptyToNull(String value) {
        return TextUtils.isEmpty(value) ? null : value;
    }

    private Bitmap buildTradeXLargeIcon() {
        // Decode at native size (no auto-upscaling) to avoid OOM on high-density devices
        BitmapFactory.Options opts = new BitmapFactory.Options();
        opts.inScaled = false;
        Bitmap logo = BitmapFactory.decodeResource(getResources(), R.drawable.ic_tradex_large, opts);
        if (logo == null) return null;
        int targetSize = Math.max(96, Math.round(64 * getResources().getDisplayMetrics().density));
        Bitmap scaled = Bitmap.createScaledBitmap(logo, targetSize, targetSize, true);
        logo.recycle();
        return scaled;
    }
}
