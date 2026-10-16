package com.kloudspot.ems.security;

import com.kloudspot.ems.config.ApplicationProperties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminAccountInitializerTest {

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(4);

    @Mock
    private AppUserRepository appUserRepository;

    @Test
    void createsAdministratorWithBcryptHashedPassword() {
        when(appUserRepository.existsByUsername("admin")).thenReturn(false);

        initializerWith(" admin ", "s3cure-passw0rd").run(new DefaultApplicationArguments());

        ArgumentCaptor<AppUser> savedUser = ArgumentCaptor.forClass(AppUser.class);
        verify(appUserRepository).save(savedUser.capture());
        assertThat(savedUser.getValue().getUsername()).isEqualTo("admin");
        assertThat(savedUser.getValue().getRole()).isEqualTo("ADMIN");
        assertThat(savedUser.getValue().getPasswordHash())
                .isNotEqualTo("s3cure-passw0rd")
                .startsWith("$2");
        assertThat(passwordEncoder.matches("s3cure-passw0rd", savedUser.getValue().getPasswordHash())).isTrue();
    }

    @Test
    void neverOverwritesAnExistingAccount() {
        when(appUserRepository.existsByUsername("admin")).thenReturn(true);

        initializerWith("admin", "a-different-password").run(new DefaultApplicationArguments());

        verify(appUserRepository, never()).save(any(AppUser.class));
    }

    @Test
    void skipsCreationWhenCredentialsAreNotConfigured() {
        initializerWith("", "").run(new DefaultApplicationArguments());

        verify(appUserRepository, never()).save(any(AppUser.class));
    }

    @Test
    void refusesPasswordsShorterThanMinimumLength() {
        when(appUserRepository.existsByUsername("admin")).thenReturn(false);

        assertThatThrownBy(() -> initializerWith("admin", "short").run(new DefaultApplicationArguments()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("at least 8 characters");
        verify(appUserRepository, never()).save(any());
    }

    private AdminAccountInitializer initializerWith(String username, String password) {
        ApplicationProperties properties = new ApplicationProperties(
                new ApplicationProperties.Cors(List.of()),
                new ApplicationProperties.Admin(username, password),
                new ApplicationProperties.DemoData(false));
        return new AdminAccountInitializer(appUserRepository, passwordEncoder, properties);
    }
}
