package com.kloudspot.ems.employee.dto;

import com.kloudspot.ems.employee.EmployeeStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Payload for creating an employee (POST) and for replacing an employee's details (PUT).
 * A PUT must send every field; the frontend edit form always submits the full record.
 */
@Schema(description = "Employee details submitted when creating or updating an employee")
public record EmployeeRequest(

        @Schema(example = "Priya Sharma")
        @NotBlank(message = "Full name is required")
        @Size(max = 100, message = "Full name must be at most 100 characters")
        String fullName,

        @Schema(example = "priya.sharma@example.com")
        @NotBlank(message = "Email is required")
        @Email(message = "Email must be a valid email address")
        @Pattern(regexp = EMAIL_DOMAIN_PATTERN, message = "Email must be a valid email address")
        @Size(max = 150, message = "Email must be at most 150 characters")
        String email,

        @Schema(example = "+91 98765 43210", description = "7 to 15 digits; may start with + and contain spaces or hyphens")
        @NotBlank(message = "Phone number is required")
        @Pattern(regexp = PHONE_NUMBER_PATTERN,
                message = "Phone number must contain 7 to 15 digits and may start with +")
        String phoneNumber,

        @Schema(example = "Engineering")
        @NotBlank(message = "Department is required")
        @Size(max = 100, message = "Department must be at most 100 characters")
        String department,

        @Schema(example = "Software Engineer")
        @NotBlank(message = "Designation is required")
        @Size(max = 100, message = "Designation must be at most 100 characters")
        String designation,

        @Schema(example = "2024-07-01", description = "ISO date (yyyy-MM-dd); cannot be in the future")
        @NotNull(message = "Date of joining is required")
        LocalDate dateOfJoining,

        @Schema(example = "850000.00", description = "Annual salary; non-negative, up to 2 decimal places")
        @NotNull(message = "Salary is required")
        @DecimalMin(value = "0.00", message = "Salary cannot be negative")
        @Digits(integer = 10, fraction = 2, message = "Salary must have at most 10 digits and 2 decimal places")
        BigDecimal salary,

        @Schema(example = "ACTIVE")
        @NotNull(message = "Employment status is required")
        EmployeeStatus employmentStatus
) {
    /** Optional leading "+", then digits separated by single spaces or hyphens; digit count is checked separately. */
    public static final String PHONE_NUMBER_PATTERN = "^(?=(?:\\D*\\d){7,15}\\D*$)\\+?\\d+(?:[ -]\\d+)*$";

    /** @Email alone accepts "user@localhost"; employee addresses must have a dotted domain. */
    public static final String EMAIL_DOMAIN_PATTERN = "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$";
}
