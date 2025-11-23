package com.demo.webrtc;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.demo.webrtc.CoturnCredentialsService.TurnCredentials;

@RestController
public class CoturnCredentialsController {

    private static final Logger log = LoggerFactory.getLogger(CoturnCredentialsController.class);
    private final CoturnCredentialsService coturnCredentialsService;

    public  CoturnCredentialsController(CoturnCredentialsService coturnCredentialsService) {
        this.coturnCredentialsService = coturnCredentialsService;
    }


    @GetMapping("/api/turn-credentials")
    public ResponseEntity<?> getCoturnCredentials(HttpServletRequest request) {
        if (request.getAttribute("userId") instanceof String userId) {
            log.info("User {} received turn credentials", userId);
            return new ResponseEntity<>(coturnCredentialsService.getTurnCredentials(userId), HttpStatus.OK);
        } else {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }



}
