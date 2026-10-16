package com.kloudspot.ems;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kloudspot.ems.employee.EmployeeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Exercises the full HTTP stack (security filters, validation, exception handling, JPA and
 * the Flyway schema) against an in-memory H2 database in MySQL mode.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class EmployeeApiIntegrationTest {

    private static final String ADMIN_USERNAME = "test-admin";
    private static final String ADMIN_PASSWORD = "test-password-123";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private EmployeeRepository employeeRepository;

    @BeforeEach
    void clearEmployees() {
        employeeRepository.deleteAll();
    }

    @Test
    void rejectsUnauthenticatedRequestsWithJson401() throws Exception {
        mockMvc.perform(get("/api/employees"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Authentication required. Please log in."));
    }

    @Test
    void rejectsWrongPasswordWithGenericMessage() throws Exception {
        mockMvc.perform(post("/api/auth/login").with(csrf())
                        .param("username", ADMIN_USERNAME)
                        .param("password", "wrong-password"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid username or password"));
    }

    @Test
    void rejectsStateChangingRequestWithoutCsrfToken() throws Exception {
        MockHttpSession session = logIn();

        mockMvc.perform(post("/api/employees").session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(employeeJson("No Csrf", "no.csrf@example.com", "Engineering", "ACTIVE")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message", containsString("CSRF")));
    }

    @Test
    void supportsFullEmployeeLifecycle() throws Exception {
        MockHttpSession session = logIn();

        MvcResult created = mockMvc.perform(post("/api/employees").session(session).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(employeeJson("Priya Sharma", "Priya.Sharma@Example.com", "Engineering", "ACTIVE")))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", containsString("/api/employees/")))
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.email").value("priya.sharma@example.com"))
                .andExpect(jsonPath("$.dateOfJoining").value("2024-07-01"))
                .andExpect(jsonPath("$.salary").value(850000.5))
                .andExpect(jsonPath("$.employmentStatus").value("ACTIVE"))
                .andReturn();
        long employeeId = readJson(created).get("id").asLong();

        mockMvc.perform(get("/api/employees/{id}", employeeId).session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Priya Sharma"))
                .andExpect(jsonPath("$.phoneNumber").value("+91 98765 43210"));

        mockMvc.perform(put("/api/employees/{id}", employeeId).session(session).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(employeeJson("Priya S. Sharma", "priya.sharma@example.com", "Finance", "INACTIVE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Priya S. Sharma"))
                .andExpect(jsonPath("$.department").value("Finance"))
                .andExpect(jsonPath("$.employmentStatus").value("INACTIVE"));

        mockMvc.perform(delete("/api/employees/{id}", employeeId).session(session).with(csrf()))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/employees/{id}", employeeId).session(session))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Employee with ID " + employeeId + " was not found"));
    }

    @Test
    void rejectsDuplicateEmailIgnoringCaseWith409() throws Exception {
        MockHttpSession session = logIn();
        createEmployee(session, "Aarav Mehta", "aarav@example.com", "Engineering", "ACTIVE");

        mockMvc.perform(post("/api/employees").session(session).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(employeeJson("Someone Else", "AARAV@example.com", "Sales", "ACTIVE")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.fieldErrors.email").value("An employee with this email address already exists"));
    }

    @Test
    void returnsFieldErrorsForInvalidInput() throws Exception {
        MockHttpSession session = logIn();
        String invalidJson = objectMapper.writeValueAsString(Map.of(
                "fullName", "",
                "email", "not-an-email",
                "phoneNumber", "12ab",
                "department", "Engineering",
                "designation", "x".repeat(101),
                "dateOfJoining", "2024-07-01",
                "salary", -1,
                "employmentStatus", "ACTIVE"));

        mockMvc.perform(post("/api/employees").session(session).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.fullName").value("Full name is required"))
                .andExpect(jsonPath("$.fieldErrors.email").exists())
                .andExpect(jsonPath("$.fieldErrors.phoneNumber").exists())
                .andExpect(jsonPath("$.fieldErrors.designation").value("Designation must be at most 100 characters"))
                .andExpect(jsonPath("$.fieldErrors.salary").value("Salary cannot be negative"));
    }

    @Test
    void returns400ForUnknownStatusInBodyWithoutLeakingInternals() throws Exception {
        MockHttpSession session = logIn();

        mockMvc.perform(post("/api/employees").session(session).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(employeeJson("Bad Status", "bad.status@example.com", "Engineering", "RETIRED")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("ACTIVE or INACTIVE")))
                .andExpect(jsonPath("$.trace").doesNotExist());
    }

    @Test
    void combinesSearchDepartmentStatusAndPagination() throws Exception {
        MockHttpSession session = logIn();
        createEmployee(session, "Asha Rao", "asha.rao@example.com", "Engineering", "ACTIVE");
        createEmployee(session, "Ashok Kumar", "ashok.kumar@example.com", "Engineering", "ACTIVE");
        createEmployee(session, "Ashwin Iyer", "ashwin.iyer@example.com", "Engineering", "INACTIVE");
        createEmployee(session, "Ashley Dsouza", "ashley.dsouza@example.com", "Sales", "ACTIVE");
        createEmployee(session, "Bala Murali", "bala@asha-consulting.example.com", "Engineering", "ACTIVE");

        mockMvc.perform(get("/api/employees").session(session)
                        .param("search", "ASH")
                        .param("department", "engineering")
                        .param("status", "ACTIVE")
                        .param("page", "0")
                        .param("size", "2")
                        .param("sortBy", "fullName")
                        .param("sortDirection", "asc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(2)))
                .andExpect(jsonPath("$.content[0].fullName").value("Asha Rao"))
                .andExpect(jsonPath("$.content[1].fullName").value("Ashok Kumar"))
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.first").value(true))
                .andExpect(jsonPath("$.last").value(false));

        mockMvc.perform(get("/api/employees").session(session)
                        .param("search", "ASH").param("department", "Engineering").param("status", "ACTIVE")
                        .param("page", "1").param("size", "2").param("sortBy", "fullName"))
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].fullName").value("Bala Murali"))
                .andExpect(jsonPath("$.last").value(true));

        mockMvc.perform(get("/api/employees/departments").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0]").value("Engineering"))
                .andExpect(jsonPath("$[1]").value("Sales"));
    }

    @Test
    void treatsLikeWildcardsInSearchAsLiteralCharacters() throws Exception {
        MockHttpSession session = logIn();
        createEmployee(session, "Plain Name", "plain@example.com", "Engineering", "ACTIVE");

        mockMvc.perform(get("/api/employees").session(session).param("search", "%"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void rejectsInvalidPagingAndSortingParameters() throws Exception {
        MockHttpSession session = logIn();

        mockMvc.perform(get("/api/employees").session(session).param("sortBy", "passwordHash"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.sortBy").exists());
        mockMvc.perform(get("/api/employees").session(session).param("size", "1000"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.size").exists());
        mockMvc.perform(get("/api/employees").session(session).param("status", "RETIRED"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid value for parameter 'status'"));
        mockMvc.perform(get("/api/employees/not-a-number").session(session))
                .andExpect(status().isBadRequest());
    }

    @Test
    void logoutInvalidatesTheSession() throws Exception {
        MockHttpSession session = logIn();
        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value(ADMIN_USERNAME));

        mockMvc.perform(post("/api/auth/logout").session(session).with(csrf()))
                .andExpect(status().isNoContent());

        assertThat(session.isInvalid()).isTrue();
        mockMvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void servesOpenApiDocumentWithoutAuthentication() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paths['/api/employees']").exists())
                .andExpect(jsonPath("$.paths['/api/auth/login'].post").exists());
    }

    private MockHttpSession logIn() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login").with(csrf())
                        .param("username", ADMIN_USERNAME)
                        .param("password", ADMIN_PASSWORD))
                .andExpect(status().isOk())
                .andReturn();
        return (MockHttpSession) result.getRequest().getSession(false);
    }

    private void createEmployee(MockHttpSession session, String fullName, String email, String department,
                                String status) throws Exception {
        mockMvc.perform(post("/api/employees").session(session).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(employeeJson(fullName, email, department, status)))
                .andExpect(status().isCreated());
    }

    private String employeeJson(String fullName, String email, String department, String status) throws Exception {
        return objectMapper.writeValueAsString(Map.of(
                "fullName", fullName,
                "email", email,
                "phoneNumber", "+91 98765 43210",
                "department", department,
                "designation", "Software Engineer",
                "dateOfJoining", "2024-07-01",
                "salary", "850000.50",
                "employmentStatus", status));
    }

    private JsonNode readJson(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }
}
