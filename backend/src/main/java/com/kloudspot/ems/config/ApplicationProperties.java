package com.kloudspot.ems.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * Application-specific settings bound from {@code app.*} properties, which in turn read
 * environment variables (see application.properties and .env.example).
 */
@ConfigurationProperties(prefix = "app")
public record ApplicationProperties(Cors cors, Admin admin, DemoData demoData) {

    /** @param allowedOrigins browser origins allowed to call the API with credentials */
    public record Cors(List<String> allowedOrigins) {
    }

    /** Credentials used once to create the first administrator if that username does not exist yet. */
    public record Admin(String username, String password) {
    }

    /** @param enabled insert sample employees when the employees table is empty */
    public record DemoData(boolean enabled) {
    }
}
