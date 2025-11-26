package com.demo.webrtc;

import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.Function;
import java.util.stream.Collectors;

public class MeetingWebSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(MeetingWebSocketHandler.class);

    private final String meetingId;
    private final Meeting meeting;

    private boolean isClosed = false;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<String, WebSocketSession>();

    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    private final ScheduledExecutorService scheduledExecutorService = Executors.newSingleThreadScheduledExecutor();
    private final Map<String, ScheduledFuture<?>> pendingTimeouts = new ConcurrentHashMap<>();



    public MeetingWebSocketHandler(Meeting meeting) {
        this.meeting = meeting;
        this.meetingId = meeting.getMeetingId();
        log.info("[Meeting {}] created WS handler", meetingId);
        meeting.setOnParticipantAdded(this::handleParticipantAdded);
        meeting.setOnParticipantRemoved(this::handleParticipantRemoved);
    }

    public void handleParticipantAdded(String userId){
        sessions.compute(userId, (u, s) -> {
            if (s == null) {
                scheduleTimeout(userId);
                return null;
            } else {
                return s;
            }
        });
        executor.submit(this::broadcastCurrentUsers);
    }

    public void handleParticipantRemoved(String userId){
        WebSocketSession session = sessions.remove(userId);
        if (session != null) {
            try {
                session.close(WebSocketCloseStatus.UNAUTHORIZED.get());
            } catch (IOException e) {
                //
            }
        }
        ScheduledFuture<?> scheduledFuture = pendingTimeouts.remove(userId);
        if (scheduledFuture != null) {
            scheduledFuture.cancel(false);
        }
        executor.submit(this::broadcastCurrentUsers);
    }

    public void queueSendMessage(WebSocketSession session, TextMessage message) {
        executor.submit(() -> {
            if(sessions.containsValue(session) && session.isOpen()) {
                try {
                    session.sendMessage(message);
                } catch (Exception e) {
                    // probably not meaningful to log? i dont this is preventable or recoverable?
                }
            }
        });
    }

    private boolean validateSession(WebSocketSession session) {
        try {
            if (session.getAttributes().get("userId") instanceof String s) {
                if (!meeting.getParticipants().contains(s)) {
                    log.info("[Meeting {}] WSS {} failed validation: {} not in meeting", meetingId, session.getId(), s);
                    session.close(WebSocketCloseStatus.UNAUTHORIZED.get());
                    return false;
                }
            } else {
                log.error("[Meeting {}] WSS {} failed validation: userId not in session attributes", meetingId, session.getId());
                session.close(WebSocketCloseStatus.SERVER_ERROR.get());
                return false;
            }
            if (this.isClosed) {
                log.info("[Meeting {}] WSS {} failed validation: meeting/handler closed", meetingId, session.getId());
                session.close(WebSocketCloseStatus.MEETING_ENDED.get());
                return false;
            }
        } catch (IOException e) {
            return false;
        }
        return true;
    }


    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        if (!validateSession(session)) {
            return;
        }

        session.getAttributes().put("version", System.currentTimeMillis());
        String userId = (String) session.getAttributes().get("userId");
        log.info("[Meeting {}] Established new WSS {} for userId {}", meetingId, session.getId(), userId);

        WebSocketSession oldSession = sessions.put(userId, session);

        var timeout = pendingTimeouts.remove(userId);
        if (timeout != null) {
            timeout.cancel(false);
            log.info("[Meeting {}] Cancelled timeout on userId {}", meetingId, userId);
        }

        if (oldSession != null) {
            try {
                oldSession.close(WebSocketCloseStatus.DUPLICATE_SESSION.get());
            } catch (IOException e) {
                //
            }
        }

        executor.submit(this::broadcastCurrentUsers);
    }

    public void broadcastCurrentUsers() {
        TextMessage msg = getUserInfoMessage(meeting.getParticipants());
        if (msg != null) {
            sessions.values().forEach(session -> {
                if (session.isOpen()) {
                    try {
                        session.sendMessage(msg);
                    } catch (Exception e) {
                        //
                        String userId = (String) session.getAttributes().get("userId");
                        log.error("failed to send to send to session by {}. reason: {}", userId, e.getMessage());
                    }
                }
            });
        }
    }

    public Long getSessionVersion(WebSocketSession session) {
        Object o = session.getAttributes().get("version");
        if (o instanceof Long version) {
            return version;
        } else if (o != null) {
            log.error("[Meeting {}] Unexpected session version type: {} ", meetingId, o.getClass());
        } else {
            log.error("[Meeting {}] Session version null", meetingId);
        }
        return null;
    }

    public Boolean hasActiveSession(String userId){
        WebSocketSession session = sessions.get(userId);
        return session != null && session.isOpen();
    }



    public TextMessage getUserInfoMessage(Set<String> userIds) {
        Map<String, Boolean> connectionInfo = userIds.stream()
                .collect(Collectors.toMap(Function.identity(), this::hasActiveSession));

        try {
            return new TextMessage(objectMapper.writeValueAsString(Map.of("kind", "info", "connected", connectionInfo)));
        } catch (JacksonException e) {
            // i dont think this can really throw
            log.error("[Meeting {}] failed to write userInfoMessage to json", meetingId);
        }
        return null;
    }

    public void scheduleTimeout(String userId){
        log.info("[Meeting {}] Scheduled timeout on userId {}", meetingId, userId);
        ScheduledFuture<?> timeout = scheduledExecutorService.schedule(() -> {
            WebSocketSession userSession = sessions.get(userId);
            if (userSession == null || !userSession.isOpen()) {
                log.info("[Meeting {}] Timeout fired on userId {}", meetingId, userId);
                meeting.removeParticipant(userId);

            }
        }, 30, TimeUnit.SECONDS);
        pendingTimeouts.put(userId, timeout);
    }


    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {

        String userId = session.getAttributes().get("userId").toString();
        log.info("[Meeting {}] Closed WSS {} for userId {}", meetingId, session.getId(), userId);


        boolean removed = sessions.remove(userId, session);

        if (removed) {
            scheduleTimeout(userId);
            executor.submit(this::broadcastCurrentUsers);
        }

    }

    public void handleSignalingMessage(WebSocketSession session, SignalingMessage message) {
        String from = message.getFrom();
        String to = message.getTo();


        String fromVerified = (String) session.getAttributes().get("userId");


        WebSocketSession targetSession = sessions.get(to);
        if (targetSession == null) {
            return;
            // todo: handle more gracefully, send "could not reach" message?
        }

        Long version = getSessionVersion(session);

        String toVerified = (String) targetSession.getAttributes().get("userId");

        if (!to.equals(toVerified) || !from.equals(fromVerified)) {
            log.info("[Meeting {}] Discarded message (sender/recipient userId mismatch)", meetingId);
            try {
                session.close(WebSocketCloseStatus.UNAUTHORIZED.get());
            } catch (IOException e) {
                //
            }
            return;
        }

        message.setVersion(version);

        try {
            queueSendMessage(targetSession, new TextMessage(objectMapper.writeValueAsString(message)));
        } catch (JacksonException e) {
            log.error("[Meeting {}] Failed to serialize message {}", meetingId, message);
        }


    }

    public void handleRequestInfoMessage(WebSocketSession session, RequestInfoMessage message) {
        TextMessage info = getUserInfoMessage(meeting.getParticipants());
        if (info != null) {
            queueSendMessage(session, info);
        }

    }

    @Override
    public void handleTextMessage(WebSocketSession session, TextMessage message) {
        if (!validateSession(session)) {
            return;
        }

        try {
            WebSocketMessage msg = objectMapper.readValue(message.getPayload(), WebSocketMessage.class);
            switch (msg) {
                case SignalingMessage sig -> handleSignalingMessage(session, sig);
                case RequestInfoMessage req -> handleRequestInfoMessage(session, req);
                default -> log.error("[Meeting {}] Unhandled message {}", meetingId, message.getPayload());
            }
        } catch (JacksonException e) {
            log.error("[Meeting {}] failed to parse incoming message {}", meetingId,  message.getPayload());
        }

    }

    @PreDestroy
    public void close() {
        if (this.isClosed) {
            return;
        }
        log.info("[Meeting {}] closing WS handler", meetingId);
        this.isClosed = true;
        sessions.values().forEach(session -> {
            try {
                session.close(WebSocketCloseStatus.MEETING_ENDED.get());
            } catch (IOException e) {
                //
            }
        });
        sessions.clear();
        pendingTimeouts.clear();
        executor.shutdownNow();
        scheduledExecutorService.shutdownNow();

    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
    }

}
