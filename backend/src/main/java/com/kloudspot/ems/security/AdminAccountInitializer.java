package com.kloudspot.ems.security;

import com.kloudspot.ems.config.ApplicationProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Creates the administrator account from ADMIN_USERNAME / ADMIN_PASSWORD on startup.
 * An existing account with that username is never modified, so restarting the
 * application cannot silently reset a password.
 */
@Component
public class AdminAccountInitializer implements ApplicationRunner {

    static final int MINIMUM_PASSWORD_LENGTH = 8;
    static final String ADMIN_ROLE = "ADMIN";

    private static final Logger log = LoggerFactory.getLogger(AdminAccountInitializer.class);

    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final ApplicationProperties applicationProperties;

    public AdminAccountInitializer(AppUserRepository appUserRepository, PasswordEncoder passwordEncoder,
                                   ApplicationProperties applicationProperties) {
        this.appUserRepository = appUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.applicationProperties = applicationProperties;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments arguments) {
        ApplicationProperties.Admin admin = applicationProperties.admin();
        String username = admin == null ? null : admin.username();
        String password = admin == null ? null : admin.password();

        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            if (appUserRepository.count() == 0) {
                log.warn("No user accounts exist and ADMIN_USERNAME / ADMIN_PASSWORD are not set. "
                        + "Set them (see .env.example) and restart to create the administrator account.");
            }
            return;
        }
        String trimmedUsername = username.trim();
        if (appUserRepository.existsByUsername(trimmedUsername)) {
            log.info("Administrator account '{}' already exists; leaving it unchanged.", trimmedUsername);
            return;
        }
        if (password.length() < MINIMUM_PASSWORD_LENGTH) {
            throw new IllegalStateException("ADMIN_PASSWORD must be at least " + MINIMUM_PASSWORD_LENGTH
                    + " characters long.");
        }
        appUserRepository.save(new AppUser(trimmedUsername, passwordEncoder.encode(password), ADMIN_ROLE));
        log.info("Created administrator account '{}'.", trimmedUsername);
    }
}
