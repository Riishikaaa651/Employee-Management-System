package com.kloudspot.ems;

import org.springframework.boot.SpringApplication;

/**
 * Starts the real application against an in-memory H2 database (profile "preview") for a
 * quick look without MySQL. Data is lost on shutdown. Run with:
 * {@code ./mvnw spring-boot:test-run}. ADMIN_USERNAME / ADMIN_PASSWORD must still be set.
 */
public class LocalPreviewApplication {

    public static void main(String[] args) {
        SpringApplication.from(EmployeeManagementApplication::main)
                .withAdditionalProfiles("preview")
                .run(args);
    }
}
