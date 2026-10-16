package com.kloudspot.ems.security;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Session helpers for the frontend. Login and logout themselves are handled by Spring
 * Security's filters at POST /api/auth/login and POST /api/auth/logout (see SecurityConfig).
 */
@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "Session-based login for the administrator")
public class AuthenticationController {

    @GetMapping("/me")
    @Operation(summary = "Get the logged-in user", description = "Returns 401 when there is no valid session")
    @ApiResponse(responseCode = "200", description = "Current user")
    @ApiResponse(responseCode = "401", description = "Not logged in")
    public CurrentUserResponse currentUser(Authentication authentication) {
        return CurrentUserResponse.from(authentication);
    }

    @GetMapping("/csrf")
    @Operation(summary = "Issue a CSRF token",
            description = "Sets the XSRF-TOKEN cookie. Copy its value into the X-XSRF-TOKEN header on POST, PUT and DELETE requests.")
    @ApiResponse(responseCode = "204", description = "XSRF-TOKEN cookie set")
    public ResponseEntity<Void> issueCsrfToken() {
        // The cookie is written by SpaCsrfTokenRequestHandler on every response; this endpoint just guarantees a response.
        return ResponseEntity.noContent().build();
    }
}
