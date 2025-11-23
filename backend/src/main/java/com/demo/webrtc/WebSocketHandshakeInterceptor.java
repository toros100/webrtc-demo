package com.demo.webrtc;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.http.server.ServletServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;


@Component
public class WebSocketHandshakeInterceptor implements HandshakeInterceptor {


    private static final Logger log = LoggerFactory.getLogger(WebSocketHandshakeInterceptor.class);


    public WebSocketHandshakeInterceptor() {
    }


    @Override
    public boolean beforeHandshake(ServerHttpRequest request,
                                   ServerHttpResponse response,
                                   WebSocketHandler wsHandler,
                                   Map<String, Object> attributes) {

        if (request instanceof ServletServerHttpRequest servletServerHttpRequest && response instanceof ServletServerHttpResponse servletServerHttpResponse) {


            HttpServletRequest httpServletRequest = servletServerHttpRequest.getServletRequest();

            if (httpServletRequest.getAttribute("userId") instanceof String userId) {
                attributes.put("userId", userId);
            } else {
                log.error("UserId not present in request attributes");
                return false;
            }

            // getting meetingId from path. path is supposed to be like /wsr/{meetingId}
            String path = httpServletRequest.getRequestURI();
            String[] parts = path.split("/");

            if (parts.length < 3) {
                log.warn("Malformed path {}", path);
                return false;
            }
            String meetingId = parts[2];

            // i deliberately don't check existence of the meeting/handler here
            // this is done in the routing handler, where i can then close the wss with a meaningful error code

            attributes.put("meetingId", meetingId);
            return true;
        } else {
            throw new RuntimeException("Expected a ServletServerHttpRequest");
        }
    }

    @Override
    public void afterHandshake(ServerHttpRequest request,
                               ServerHttpResponse response,
                               WebSocketHandler wsHandler,
                               Exception exception) {
    }
}
