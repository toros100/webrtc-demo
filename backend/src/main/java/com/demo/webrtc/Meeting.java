package com.demo.webrtc;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;

public class Meeting {

    private static final Logger log = LoggerFactory.getLogger(Meeting.class);

    private final int MAX_CAPACITY = 6;
    private final String meetingId;
    private final Set<String> participants;
    private final String owner;

    private Instant lastLeaveTimestamp;

    private Consumer<String> onParticipantAdded;
    private Consumer<String> onParticipantRemoved;


    public Meeting(String owner) {
        this.meetingId = UUID.randomUUID().toString();
        participants = ConcurrentHashMap.newKeySet();
        lastLeaveTimestamp = Instant.now();
        this.owner = owner;
    }

    public MeetingJoinResult addParticipant(String participantId) {
        synchronized (participants) {
            if (participants.contains(participantId)) {
                log.info("User {} failed to join meeting {} (Already joined)", participantId, meetingId);
                return MeetingJoinResult.ALREADY_JOINED;
            } else {
                if (participants.size() < MAX_CAPACITY) {
                    log.info("User {} successfully joined meeting {}", participantId, meetingId);
                    participants.add(participantId);
                    if (onParticipantAdded != null) {
                        onParticipantAdded.accept(participantId);
                    }
                    return MeetingJoinResult.SUCCESS;
                } else {
                    log.info("User {} failed to join meeting {} (Meeting full)", participantId, meetingId);
                    return MeetingJoinResult.MEETING_FULL;
                }
            }
        }
    }

    public void removeParticipant(String participantId) {
        synchronized (participants) {
            if (participants.remove(participantId)) {
                log.info("User {} removed from meeting {}", participantId, meetingId);
                this.lastLeaveTimestamp = Instant.now();
                if (onParticipantRemoved != null) {
                    onParticipantRemoved.accept(participantId);
                }
            }
        }

    }

    public boolean isStale() {
        return this.participants.isEmpty() && this.lastLeaveTimestamp.isBefore(Instant.now().minus(Duration.ofMinutes(10)));
    }


    public void setOnParticipantAdded(Consumer<String> onParticipantAdded) {
        this.onParticipantAdded = onParticipantAdded;
    }

    public void setOnParticipantRemoved(Consumer<String> onParticipantRemoved) {
        this.onParticipantRemoved = onParticipantRemoved;
    }

    public String getMeetingId() {
        return this.meetingId;
    }

    public Set<String> getParticipants() {
        return participants;
    }


}
