package com.kloudspot.ems;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Verifies the real cookie-to-header CSRF flow used by the React app.
 * Runs in its own application context because spring-security-test's {@code csrf()}
 * post-processor (used elsewhere) replaces the CSRF token repository of a shared context.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_CLASS)
class CsrfCookieFlowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void loginAndMutationSucceedWhenXsrfCookieIsEchoedInHeader() throws Exception {
        Cookie xsrfCookie = fetchXsrfCookie(null);

        MvcResult login = mockMvc.perform(post("/api/auth/login")
                        .cookie(xsrfCookie)
                        .header("X-XSRF-TOKEN", xsrfCookie.getValue())
                        .param("username", "test-admin")
                        .param("password", "test-password-123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("test-admin"))
                .andExpect(jsonPath("$.roles[0]").value("ADMIN"))
                .andReturn();
        MockHttpSession session = (MockHttpSession) login.getRequest().getSession(false);

        // The token is rotated on login, so the client must use the freshly issued cookie.
        Cookie rotatedCookie = fetchXsrfCookie(session);
        assertThat(rotatedCookie.getValue()).isNotEqualTo(xsrfCookie.getValue());

        mockMvc.perform(post("/api/employees").session(session)
                        .cookie(rotatedCookie)
                        .header("X-XSRF-TOKEN", rotatedCookie.getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Cookie Flow","email":"cookie.flow@example.com","phoneNumber":"9876543210",
                                 "department":"Engineering","designation":"Engineer","dateOfJoining":"2024-01-15",
                                 "salary":500000,"employmentStatus":"ACTIVE"}
                                """))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/employees").session(session)
                        .cookie(rotatedCookie)
                        .header("X-XSRF-TOKEN", "forged-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    private Cookie fetchXsrfCookie(MockHttpSession session) throws Exception {
        var request = get("/api/auth/csrf");
        if (session != null) {
            request.session(session);
        }
        MvcResult result = mockMvc.perform(request).andExpect(status().isNoContent()).andReturn();
        Cookie cookie = result.getResponse().getCookie("XSRF-TOKEN");
        assertThat(cookie).as("XSRF-TOKEN cookie").isNotNull();
        return cookie;
    }
}
