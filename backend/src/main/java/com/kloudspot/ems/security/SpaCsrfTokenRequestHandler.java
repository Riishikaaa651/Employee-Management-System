package com.kloudspot.ems.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.csrf.CsrfTokenRequestHandler;
import org.springframework.security.web.csrf.XorCsrfTokenRequestAttributeHandler;
import org.springframework.util.StringUtils;

import java.util.function.Supplier;

/**
 * CSRF handling for a single-page app, following the Spring Security reference guide.
 * The token lives in the readable XSRF-TOKEN cookie; the frontend copies it into the
 * X-XSRF-TOKEN header on every state-changing request.
 */
final class SpaCsrfTokenRequestHandler implements CsrfTokenRequestHandler {

    private final CsrfTokenRequestHandler plainHandler = new CsrfTokenRequestAttributeHandler();
    private final CsrfTokenRequestHandler xorHandler = new XorCsrfTokenRequestAttributeHandler();

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, Supplier<CsrfToken> csrfToken) {
        // BREACH protection for tokens rendered into responses.
        xorHandler.handle(request, response, csrfToken);
        // Load the deferred token so the cookie is written on every response.
        csrfToken.get();
    }

    @Override
    public String resolveCsrfTokenValue(HttpServletRequest request, CsrfToken csrfToken) {
        String headerValue = request.getHeader(csrfToken.getHeaderName());
        // A header value is the raw cookie value copied by JavaScript; anything else is a masked form parameter.
        return (StringUtils.hasText(headerValue) ? plainHandler : xorHandler)
                .resolveCsrfTokenValue(request, csrfToken);
    }
}
