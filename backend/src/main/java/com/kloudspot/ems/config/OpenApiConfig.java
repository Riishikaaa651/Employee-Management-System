package com.kloudspot.ems.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.PathItem;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.media.ObjectSchema;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.media.StringSchema;
import io.swagger.v3.oas.models.parameters.RequestBody;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.responses.ApiResponses;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    private static final String AUTHENTICATION_TAG = "Authentication";

    @Bean
    OpenAPI employeeManagementOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Employee Management System API")
                        .version("1.0.0")
                        .description("""
                                REST API for managing employee records.

                                **Authentication:** call `POST /api/auth/login` with form fields `username` and `password`. \
                                The server sets a `JSESSIONID` session cookie that authenticates later requests.

                                **CSRF:** POST, PUT and DELETE requests must send the value of the `XSRF-TOKEN` cookie in the \
                                `X-XSRF-TOKEN` header. Swagger UI does this automatically; call `GET /api/auth/csrf` first \
                                if the cookie is not present yet.
                                """))
                .components(new Components().addSecuritySchemes("sessionCookie", new SecurityScheme()
                        .type(SecurityScheme.Type.APIKEY)
                        .in(SecurityScheme.In.COOKIE)
                        .name("JSESSIONID")
                        .description("Session cookie issued by POST /api/auth/login")));
    }

    /** Documents the login/logout endpoints, which are implemented by Spring Security filters rather than a controller. */
    @Bean
    OpenApiCustomizer authenticationEndpointsCustomizer() {
        return openApi -> {
            Schema<?> loginForm = new ObjectSchema()
                    .addProperty("username", new StringSchema().example("admin"))
                    .addProperty("password", new StringSchema().format("password"));
            loginForm.setRequired(List.of("username", "password"));

            Operation login = new Operation()
                    .addTagsItem(AUTHENTICATION_TAG)
                    .summary("Log in")
                    .description("Authenticates the administrator and starts a session (JSESSIONID cookie).")
                    .requestBody(new RequestBody().required(true).content(new Content()
                            .addMediaType("application/x-www-form-urlencoded", new MediaType().schema(loginForm))))
                    .responses(new ApiResponses()
                            .addApiResponse("200", new ApiResponse().description("Logged in; body contains the current user"))
                            .addApiResponse("401", new ApiResponse().description("Invalid username or password"))
                            .addApiResponse("403", new ApiResponse().description("Missing or invalid CSRF token")));

            Operation logout = new Operation()
                    .addTagsItem(AUTHENTICATION_TAG)
                    .summary("Log out")
                    .description("Invalidates the current session.")
                    .responses(new ApiResponses()
                            .addApiResponse("204", new ApiResponse().description("Logged out"))
                            .addApiResponse("403", new ApiResponse().description("Missing or invalid CSRF token")));

            openApi.path("/api/auth/login", new PathItem().post(login));
            openApi.path("/api/auth/logout", new PathItem().post(logout));
        };
    }
}
