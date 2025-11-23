package com.demo.webrtc;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Base64;


@Service
public class CoturnCredentialsService {

    private static final Logger log =  LoggerFactory.getLogger(CoturnCredentialsService.class);

    private final Mac hmacSHA1;
    public CoturnCredentialsService(@Value("${app.coturn.secret}") String secret) {

        log.info("CoturnCredentialsService init... {}", secret);
        try {
            hmacSHA1 = Mac.getInstance("HmacSHA1");
            SecretKeySpec secretKey = new SecretKeySpec(secret.getBytes(), "HmacSHA1");
            hmacSHA1.init(secretKey);
        } catch (NoSuchAlgorithmException | InvalidKeyException e)  {
            throw new RuntimeException("Failed to instantiate Mac in CoturnCredentialsService");
        }
    }

    // this is the magical format that coturn expects for this type of auth
    public TurnCredentials getTurnCredentials(String userId) {

        // credentials valid until current time + 2 hours
        long expirationTimestamp = Instant.now().getEpochSecond() + 60*60*2;

        String username = expirationTimestamp + ":" + userId;

        byte[] hash = hmacSHA1.doFinal(username.getBytes());
        String password = Base64.getEncoder().encodeToString(hash);

        return new  TurnCredentials(username, password);
    }

    public record TurnCredentials(String username, String password) {}

}
