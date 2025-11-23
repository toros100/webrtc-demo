package com.demo.webrtc;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class WebRTCSignalingApplication {

    public static void main(String[] args) {
        SpringApplication.run(WebRTCSignalingApplication.class, args);

    }

}
