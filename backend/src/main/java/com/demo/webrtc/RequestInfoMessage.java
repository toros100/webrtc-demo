package com.demo.webrtc;

public class RequestInfoMessage extends WebSocketMessage{
    public RequestInfoMessage() {
        this.setKind("requestInfo");
    }
}
