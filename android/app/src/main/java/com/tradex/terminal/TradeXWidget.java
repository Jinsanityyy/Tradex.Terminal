package com.tradex.terminal;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class TradeXWidget extends AppWidgetProvider {

    private static final String API_URL = "https://tradex-ten.vercel.app/api/widget";
    private static final String ACTION_REFRESH = "com.tradex.terminal.WIDGET_REFRESH";

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) fetchAndUpdate(ctx, mgr, id);
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        super.onReceive(ctx, intent);
        if (ACTION_REFRESH.equals(intent.getAction())) {
            AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
            int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, TradeXWidget.class));
            for (int id : ids) fetchAndUpdate(ctx, mgr, id);
        }
    }

    private void fetchAndUpdate(Context ctx, AppWidgetManager mgr, int widgetId) {
        RemoteViews views = buildBaseViews(ctx);
        views.setTextViewText(R.id.widget_updated, "Loading…");
        mgr.updateAppWidget(widgetId, views);

        new Thread(() -> {
            RemoteViews updated = buildBaseViews(ctx);
            try {
                HttpURLConnection conn = (HttpURLConnection) new URL(API_URL).openConnection();
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);
                conn.setRequestProperty("Accept", "application/json");

                if (conn.getResponseCode() == 200) {
                    BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = br.readLine()) != null) sb.append(line);
                    br.close();

                    JSONObject root = new JSONObject(sb.toString());
                    JSONArray prices = root.getJSONArray("prices");

                    for (int i = 0; i < prices.length(); i++) {
                        JSONObject p = prices.getJSONObject(i);
                        String label    = p.getString("label");
                        String price    = p.getString("price");
                        String change   = p.getString("change");
                        boolean positive = p.getBoolean("positive");
                        int changeColor  = Color.parseColor(positive ? "#5fc77a" : "#ef4444");

                        switch (label) {
                            case "GOLD":
                                updated.setTextViewText(R.id.xau_price, price);
                                updated.setTextViewText(R.id.xau_change, change);
                                updated.setTextColor(R.id.xau_change, changeColor);
                                break;
                            case "DXY":
                                updated.setTextViewText(R.id.dxy_price, price);
                                updated.setTextViewText(R.id.dxy_change, change);
                                updated.setTextColor(R.id.dxy_change, changeColor);
                                break;
                            case "BTC":
                                updated.setTextViewText(R.id.btc_price, price);
                                updated.setTextViewText(R.id.btc_change, change);
                                updated.setTextColor(R.id.btc_change, changeColor);
                                break;
                            case "EUR":
                                updated.setTextViewText(R.id.eur_price, price);
                                updated.setTextViewText(R.id.eur_change, change);
                                updated.setTextColor(R.id.eur_change, changeColor);
                                break;
                        }
                    }
                }
                conn.disconnect();

                String time = new SimpleDateFormat("h:mm a", Locale.getDefault()).format(new Date());
                updated.setTextViewText(R.id.widget_updated, time);

            } catch (Exception e) {
                updated.setTextViewText(R.id.widget_updated, "Tap ↻ to retry");
            }

            mgr.updateAppWidget(widgetId, updated);
        }).start();
    }

    private RemoteViews buildBaseViews(Context ctx) {
        RemoteViews views = new RemoteViews(ctx.getPackageName(), R.layout.tradex_widget);

        // Tap widget body → open app
        Intent launch = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        if (launch != null) {
            PendingIntent pi = PendingIntent.getActivity(
                ctx, 0, launch,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_root, pi);
        }

        // Tap ↻ → manual refresh
        Intent refresh = new Intent(ctx, TradeXWidget.class);
        refresh.setAction(ACTION_REFRESH);
        PendingIntent rpi = PendingIntent.getBroadcast(
            ctx, 1, refresh,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_refresh, rpi);

        return views;
    }
}
