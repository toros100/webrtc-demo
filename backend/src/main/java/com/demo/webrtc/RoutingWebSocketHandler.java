package com.demo.webrtc;

import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;

@Component
public class RoutingWebSocketHandler extends TextWebSocketHandler {

    private final MeetingHandlerRegistry meetingHandlerRegistry;

    public RoutingWebSocketHandler(MeetingHandlerRegistry meetingHandlerRegistry) {
        this.meetingHandlerRegistry = meetingHandlerRegistry;
    }


    public MeetingWebSocketHandler getHandlerForSession(WebSocketSession session) {
        if (session.getAttributes().get("meetingId") instanceof String meetingId) {
            MeetingWebSocketHandler handler = meetingHandlerRegistry.get(meetingId);
            if (handler != null) {
                return handler;
            } else {
                try {
                    session.close(WebSocketCloseStatus.MEETING_NOT_FOUND.get());
                } catch (IOException e) {
                    //
                }
                return null;
            }
        } else {
            try {
                session.close(WebSocketCloseStatus.SERVER_ERROR.get());
            } catch (IOException e) {
                //
            }
            return null;
        }
    }


    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        MeetingWebSocketHandler handler = getHandlerForSession(session);
        if (handler != null) {
            handler.afterConnectionEstablished(session);
        }
    }

    @Override
    public void handleTextMessage(WebSocketSession session, TextMessage message) {
        MeetingWebSocketHandler handler = getHandlerForSession(session);
        if (handler != null) {
            handler.handleTextMessage(session, message);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        MeetingWebSocketHandler handler = getHandlerForSession(session);
        if (handler != null) {
            handler.afterConnectionClosed(session, status);
        }

    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        // maybe log, but session is assumed to be dead (closing or closed)
    }
}
