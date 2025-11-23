package com.demo.webrtc;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "kind", visible = true)
@JsonSubTypes({
        @JsonSubTypes.Type(value = InfoMessage.class, name = "info"),
        @JsonSubTypes.Type(value = SignalingMessage.class, name = "signal"),
        @JsonSubTypes.Type(value = RequestInfoMessage.class, name = "requestInfo")
})
public abstract class WebSocketMessage {
    private String kind;

    public void setKind(String kind) {
        this.kind = kind;
    }
    public String getKind() {
        return kind;
    }

}
