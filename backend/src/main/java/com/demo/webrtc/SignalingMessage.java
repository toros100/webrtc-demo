package com.demo.webrtc;

public class SignalingMessage extends WebSocketMessage {
    public SignalingMessage() {
        this.setKind("signal");
    }

    private String to;
    private String from;
    private String payload;
    private Long version;

    public String getTo() {
        return to;
    }

    public void setTo(String to) {
        this.to = to;
    }

    public String getFrom() {
        return from;
    }

    public void setFrom(String from) {
        this.from = from;
    }

    public String getPayload() {
        return payload;
    }

    public void setPayload(String payload) {
        this.payload = payload;
    }

    public Long getVersion() {
        return version;
    }



    public void setVersion(Long version) {
        this.version = version;
    }

}
