package com.kloudspot.ems.security;

import com.kloudspot.ems.config.ApplicationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.time.Duration;
import java.util.List;

/**
 * Session-cookie authentication for the React frontend.
 * <ul>
 *   <li>POST /api/auth/login (form fields username, password) creates an HTTP session.</li>
 *   <li>All other /api endpoints require the ADMIN role; unauthenticated calls get 401 JSON.</li>
 *   <li>CSRF protection stays enabled: state-changing requests must echo the XSRF-TOKEN cookie
 *       in the X-XSRF-TOKEN header.</li>
 * </ul>
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    static final String LOGIN_URL = "/api/auth/login";
    static final String LOGOUT_URL = "/api/auth/logout";

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, JsonSecurityResponseWriter responseWriter)
            throws Exception {
        CookieCsrfTokenRepository csrfTokenRepository = CookieCsrfTokenRepository.withHttpOnlyFalse();
        csrfTokenRepository.setCookiePath("/");

        http
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf
                        .csrfTokenRepository(csrfTokenRepository)
                        .csrfTokenRequestHandler(new SpaCsrfTokenRequestHandler()))
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(HttpMethod.POST, LOGIN_URL).permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/auth/csrf").permitAll()
                        .requestMatchers("/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**").permitAll()
                        .requestMatchers("/error").permitAll()
                        .requestMatchers("/api/auth/me").authenticated()
                        .requestMatchers("/api/**").hasRole(AdminAccountInitializer.ADMIN_ROLE)
                        .anyRequest().denyAll())
                .formLogin(form -> form
                        .loginPage(LOGIN_URL)
                        .loginProcessingUrl(LOGIN_URL)
                        .usernameParameter("username")
                        .passwordParameter("password")
                        .successHandler(responseWriter.loginSuccessHandler())
                        .failureHandler(responseWriter.loginFailureHandler()))
                .logout(logout -> logout
                        .logoutUrl(LOGOUT_URL)
                        .logoutSuccessHandler(responseWriter.logoutSuccessHandler())
                        .invalidateHttpSession(true)
                        .deleteCookies("JSESSIONID"))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(responseWriter.unauthenticatedEntryPoint())
                        .accessDeniedHandler(responseWriter.accessDeniedHandler()))
                // The SPA handles navigation after login, so there is no saved request to redirect back to.
                .requestCache(requestCache -> requestCache.disable())
                .httpBasic(httpBasic -> httpBasic.disable());
        return http.build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /** Only the configured frontend origin(s) may send credentialed cross-origin requests. */
    @Bean
    CorsConfigurationSource corsConfigurationSource(ApplicationProperties applicationProperties) {
        List<String> allowedOrigins = applicationProperties.cors() == null
                || applicationProperties.cors().allowedOrigins() == null
                ? List.of()
                : applicationProperties.cors().allowedOrigins();

        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(allowedOrigins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Content-Type", "X-XSRF-TOKEN", "X-Requested-With"));
        configuration.setExposedHeaders(List.of("Location"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(Duration.ofHours(1));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }
}
