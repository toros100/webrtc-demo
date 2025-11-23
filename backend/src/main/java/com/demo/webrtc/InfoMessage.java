package com.demo.webrtc;

import java.util.Map;

public class InfoMessage extends WebSocketMessage {
    public InfoMessage() {
        this.setKind("info");
    }

    private Map<String, String> connected;

    public void setConnected(Map<String, String> connected) {
        this.connected = connected;
    }

    public Map<String, String> getConnected() {
        return this.connected;
    }

}
