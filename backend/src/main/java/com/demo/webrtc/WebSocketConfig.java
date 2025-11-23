package com.demo.webrtc;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final WebSocketHandshakeInterceptor webSocketHandshakeInterceptor;

    private final RoutingWebSocketHandler routingWebSocketHandler;


    @Value("${app.cors.allowed-origins:}")
    private String allowedOrigins;

    public WebSocketConfig(WebSocketHandshakeInterceptor webSocketHandshakeInterceptor, RoutingWebSocketHandler routingWebSocketHandler) {
        this.webSocketHandshakeInterceptor = webSocketHandshakeInterceptor;
        this.routingWebSocketHandler = routingWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(routingWebSocketHandler, "/wsr/{meetingId}")
                .setAllowedOrigins(allowedOrigins)
                .addInterceptors(webSocketHandshakeInterceptor);

        // note that the {meetingId} in the path is just for documentation, it acts like *
        // the actual parsing of the meetingId is done in the handshake interceptor

    }
}
