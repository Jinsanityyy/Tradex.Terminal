package com.tradex.terminal;

import android.webkit.PermissionRequest;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(android.os.Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Allow the Capacitor WebView to use the microphone so that
        // webkitSpeechRecognition (Vega voice input) works inside the app.
        // Without this override, Android WebView denies all permission requests
        // by default and SpeechRecognition throws "not-allowed" silently.
        getBridge().getWebView().setWebChromeClient(
            new BridgeWebChromeClient(getBridge()) {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    request.grant(request.getResources());
                }
            }
        );
    }
}
