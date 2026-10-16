package com.kloudspot.ems.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.Map;

/** Error body returned by every failing API call (validation, auth, not-found, conflicts, server errors). */
@Schema(description = "Standard error response")
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiErrorResponse(
        Instant timestamp,
        int status,
        String error,
        String message,
        String path,
        @Schema(description = "Field name to validation message; present only for field-level validation failures")
        Map<String, String> fieldErrors
) {
}
