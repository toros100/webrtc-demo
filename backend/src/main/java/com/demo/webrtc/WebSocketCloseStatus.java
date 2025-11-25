package com.demo.webrtc;

import org.springframework.web.socket.CloseStatus;

public enum WebSocketCloseStatus {
    UNAUTHORIZED(4001, "Unauthorized"),
    MEETING_NOT_FOUND(4002, "Meeting not found"),
    MEETING_ENDED(4004, "Meeting ended"),
    SERVER_ERROR(5001, "Server Error"),
    DUPLICATE_SESSION(4005, "Duplicate session for meeting (use a second anonymous window or two different browsers for local testing)");

    private final int code;
    private final String reason;

    WebSocketCloseStatus(int code, String reason) {
        this.code = code;
        this.reason = reason;
    }

    public CloseStatus get() {
        return new CloseStatus(code, reason);
    }

}
