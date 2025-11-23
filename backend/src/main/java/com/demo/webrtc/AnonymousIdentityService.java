package com.demo.webrtc;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.*;

@Service
public class AnonymousIdentityService {
    private final Mac hmacSha256;

    private static final Logger log = LoggerFactory.getLogger(AnonymousIdentityService.class);

    public AnonymousIdentityService(@Value("{app.hmac.sha256.secret}") String secret) {
        try {
            hmacSha256 = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(secret.getBytes(), "HmacSHA256");
            hmacSha256.init(secretKey);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new RuntimeException("Failed to instantiate Mac in AnonymousIdentityService");
        }
    }


    @Value("${app.cookies.secure}")
    private Boolean secureCookies;

    private Optional<String> extractCookie(HttpServletRequest request, String cookieName) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return Optional.empty();
        } else {
            Optional<Cookie> cookie = Arrays.stream(cookies)
                    .filter(c -> c.getName().equals(cookieName))
                    .findFirst();
            return cookie.map(Cookie::getValue);
        }
    }


    public boolean isValidSignedUserId(Object object) {
        if (object instanceof String s) {
            String[] parts = s.split(":");
            if (parts.length == 2 && parts[0].length() == 40) { // 36 length for UUID.randomUUID() and 4 extra for "usr-"
                String signature = Base64.getEncoder().encodeToString(hmacSha256.doFinal(parts[0].getBytes()));
                return signature.equals(parts[1]);
            }
        }
        return false;
    }

    public String extractOrCreateUserId(HttpServletRequest request, HttpServletResponse response) {
        Optional<String> userId = extractCookie(request, "userId");

        if (userId.isPresent()) {
            String uIdAndSignature = userId.get();
            String[] parts = uIdAndSignature.split(":");
            if (parts.length == 2) {
                String signature = Base64.getEncoder().encodeToString(hmacSha256.doFinal(parts[0].getBytes()));
                if (signature.equals(parts[1])) {
                    return parts[0];
                }
            }
        }

        String freshId = "usr-" + UUID.randomUUID();
        String signature = Base64.getEncoder().encodeToString(hmacSha256.doFinal(freshId.getBytes()));
        log.info("Generated fresh userId {}", freshId);

        ResponseCookie cookie = ResponseCookie.from("userId", freshId + ":" + signature)
                .httpOnly(true)
                .secure(secureCookies)
                .sameSite("Lax")
                .maxAge(Duration.ofDays(365))
                .path("/")
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        return freshId;
    }

}

