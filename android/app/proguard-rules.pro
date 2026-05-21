# Keep Capacitor bridge — required for WebView ↔ native plugin communication
-keep class com.getcapacitor.** { *; }
-keep class com.tradex.terminal.** { *; }

# Keep JavaScript interface annotations
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep source line numbers for crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Keep AppWidget receiver
-keep class com.tradex.terminal.TradeXWidget { *; }

# Suppress warnings for unused Cordova/Capacitor internals
-dontwarn org.apache.cordova.**
-dontwarn com.getcapacitor.**
