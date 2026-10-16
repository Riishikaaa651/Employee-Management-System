package com.kloudspot.ems.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;

import java.util.List;

public record CurrentUserResponse(String username, List<String> roles) {

    static CurrentUserResponse from(Authentication authentication) {
        List<String> roles = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .map(authority -> authority.replaceFirst("^ROLE_", ""))
                .toList();
        return new CurrentUserResponse(authentication.getName(), roles);
    }
}
