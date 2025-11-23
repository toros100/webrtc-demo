package com.demo.webrtc;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class MeetingHandlerRegistry {

    private final Map<String, MeetingWebSocketHandler> handlers = new ConcurrentHashMap<String, MeetingWebSocketHandler>();

    public MeetingHandlerRegistry() {
    }


    // MeetingService manages meeting+handler lifetime, only call register/unregister from there
    public void registerHandler(@NonNull Meeting meeting) {
        handlers.put(meeting.getMeetingId(), new MeetingWebSocketHandler(meeting));
    }


    public void unregisterHandler(@NonNull String meetingId) {
        MeetingWebSocketHandler handler = handlers.remove(meetingId);
        if (handler != null) {
            handler.close();
        }
    }


    public MeetingWebSocketHandler get(String meetingId) {
        return handlers.get(meetingId);
    }



}
