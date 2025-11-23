package com.demo.webrtc;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import javax.naming.LimitExceededException;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class MeetingService {

    private static final Logger log = LoggerFactory.getLogger(MeetingService.class);

    private final Map<String, Meeting> meetings = new ConcurrentHashMap<>();
    private final MeetingHandlerRegistry meetingHandlerRegistry;
    private final AtomicInteger meetingsCreatedInLastMinute = new AtomicInteger(0);

    public MeetingService(MeetingHandlerRegistry meetingHandlerRegistry) {
        this.meetingHandlerRegistry = meetingHandlerRegistry;
    }

    @Scheduled(fixedRate = 60000)
    public void resetLimit() {
        meetingsCreatedInLastMinute.set(0);
    }

    public Meeting createMeeting(String userId) throws LimitExceededException {
        if (meetingsCreatedInLastMinute.incrementAndGet() > 100) {
            // simple abuse protection, should handle by IP or something like that for a "real" project
            log.warn("UserId {} failed to create meeting (limit exceeded)", userId);
            throw new LimitExceededException();
        }

        Meeting m = new Meeting(userId);
        meetingHandlerRegistry.registerHandler(m);
        meetings.put(m.getMeetingId(), m);
        log.info("UserId {} created meeting {}", userId, m.getMeetingId());
        return m;
    }


    public void deleteMeeting(String meetingId) {
        Meeting m = meetings.remove(meetingId);
        if (m != null) {
            meetingHandlerRegistry.unregisterHandler(meetingId);
        }
    }

    public Optional<Meeting> getMeeting(String meetingId) {
        return Optional.ofNullable(meetings.get(meetingId));
    }

    public boolean addUserToMeeting(String meetingId, String userId) {
        Optional<Meeting> m = getMeeting(meetingId);
        if (m.isPresent()) {
            m.get().addParticipant(userId);
            System.out.println("added user " + userId + " to meeting " + meetingId);
            return true;
        } else {
            return false;
        }
    }

    @Scheduled(fixedRate = 60000)
    public void clearStaleMeetings() {
        meetings.values().forEach(meeting -> {
            if (meeting.isStale()) {
                log.info("Deleting stale meeting {}", meeting.getMeetingId());
                deleteMeeting(meeting.getMeetingId());
            }
        });
    }


}
