package com.demo.webrtc;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Order(1)
public class AnonymousIdentityFilter extends OncePerRequestFilter {

    private final AnonymousIdentityService anonymousIdentityService;

    public AnonymousIdentityFilter(AnonymousIdentityService anonymousIdentityService) {
        this.anonymousIdentityService = anonymousIdentityService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String userId = anonymousIdentityService.extractOrCreateUserId(request, response);
        request.setAttribute("userId", userId);
        filterChain.doFilter(request, response);
    }
}
