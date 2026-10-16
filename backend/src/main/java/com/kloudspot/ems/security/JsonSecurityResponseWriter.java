package com.kloudspot.ems.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kloudspot.ems.common.ApiErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.authentication.logout.LogoutSuccessHandler;
import org.springframework.security.web.csrf.CsrfException;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Instant;

/**
 * Writes JSON responses for security events so the SPA never receives redirects or HTML
 * login pages. Failure messages are deliberately generic: a failed login does not reveal
 * whether the username exists.
 */
@Component
class JsonSecurityResponseWriter {

    private final ObjectMapper objectMapper;

    JsonSecurityResponseWriter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    AuthenticationEntryPoint unauthenticatedEntryPoint() {
        return (request, response, exception) ->
                writeError(request, response, HttpStatus.UNAUTHORIZED, "Authentication required. Please log in.");
    }

    AccessDeniedHandler accessDeniedHandler() {
        return (request, response, exception) -> {
            String message = exception instanceof CsrfException
                    ? "Missing or invalid CSRF token. Refresh the page and try again."
                    : "You do not have permission to perform this action.";
            writeError(request, response, HttpStatus.FORBIDDEN, message);
        };
    }

    AuthenticationSuccessHandler loginSuccessHandler() {
        return (request, response, authentication) ->
                writeJson(response, HttpStatus.OK, CurrentUserResponse.from(authentication));
    }

    AuthenticationFailureHandler loginFailureHandler() {
        return (request, response, exception) ->
                writeError(request, response, HttpStatus.UNAUTHORIZED, "Invalid username or password");
    }

    LogoutSuccessHandler logoutSuccessHandler() {
        return (request, response, authentication) -> response.setStatus(HttpStatus.NO_CONTENT.value());
    }

    private void writeError(HttpServletRequest request, HttpServletResponse response, HttpStatus status,
                            String message) throws IOException {
        ApiErrorResponse body = new ApiErrorResponse(Instant.now(), status.value(), status.getReasonPhrase(),
                message, request.getRequestURI(), null);
        writeJson(response, status, body);
    }

    private void writeJson(HttpServletResponse response, HttpStatus status, Object body) throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getOutputStream(), body);
    }
}
