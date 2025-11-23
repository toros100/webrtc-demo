package com.demo.webrtc;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/id")
public class IdentityController {

    private final AnonymousIdentityService identityService;

    public IdentityController(AnonymousIdentityService identityService) {
        this.identityService = identityService;
    }


    @GetMapping("/userId")
    public String test(HttpServletRequest request, HttpServletResponse response) {
        return identityService.extractOrCreateUserId(request, response);
    }

}
