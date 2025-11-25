package com.demo.webrtc;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.naming.LimitExceededException;
import java.util.*;

@RestController
@RequestMapping("/api/meeting")
public class MeetingController {

    private static final Logger log = LoggerFactory.getLogger(MeetingController.class);

    private final MeetingService meetingService;

    public MeetingController(MeetingService meetingService) {
        this.meetingService = meetingService;
    }


    @PostMapping("/{meetingId}/join")
    public ResponseEntity<String> joinMeeting(@PathVariable String meetingId, HttpServletRequest request) {
        if (request.getAttribute("userId") instanceof String userId) {
            Optional<Meeting> meeting = meetingService.getMeeting(meetingId);
            if (meeting.isPresent()) {
                MeetingJoinResult res = meeting.get().addParticipant(userId);
                switch (res) {
                    case SUCCESS -> {
                        return ResponseEntity.ok().body("Joined successfully");
                    }
                    case ALREADY_JOINED -> {
                        return ResponseEntity.ok().body("Already in meeting.");
                    }
                    case MEETING_FULL -> {
                        return ResponseEntity.status(409).body("Meeting full.");
                    }
                }
            } else {
                return ResponseEntity.badRequest().body("Meeting not found.");
            }
        }

        return ResponseEntity.badRequest().body("Internal Server Error.");
    }




    @GetMapping("/{meetingId}/checkIfExists")
    public ResponseEntity<String> checkIfExists(@PathVariable String meetingId, HttpServletRequest request) {
        Optional<Meeting> meeting = meetingService.getMeeting(meetingId);
        if (meeting.isPresent()) {
            return ResponseEntity.ok("Meeting " + meetingId + " exists.");
        } else {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Meeting " + meetingId + " does not exist.");
        }
    }


    @PostMapping("/create")
    public ResponseEntity<String> createMeeting(HttpServletRequest request) {
        if (request.getAttribute("userId") instanceof String userId) {
            try {
                Meeting meeting = meetingService.createMeeting(userId);
                return ResponseEntity.ok(meeting.getMeetingId());
            } catch (LimitExceededException e) {
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body("Meeting creation limit exceeded.");
            }
        } else {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Internal server error");
        }
    }


}
