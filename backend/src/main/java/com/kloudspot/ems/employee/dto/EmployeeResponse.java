package com.kloudspot.ems.employee.dto;

import com.kloudspot.ems.employee.Employee;
import com.kloudspot.ems.employee.EmployeeStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record EmployeeResponse(
        Long id,
        String fullName,
        String email,
        String phoneNumber,
        String department,
        String designation,
        LocalDate dateOfJoining,
        BigDecimal salary,
        EmployeeStatus employmentStatus,
        Instant createdAt,
        Instant updatedAt
) {
    public static EmployeeResponse from(Employee employee) {
        return new EmployeeResponse(
                employee.getId(),
                employee.getFullName(),
                employee.getEmail(),
                employee.getPhoneNumber(),
                employee.getDepartment(),
                employee.getDesignation(),
                employee.getDateOfJoining(),
                employee.getSalary(),
                employee.getEmploymentStatus(),
                employee.getCreatedAt(),
                employee.getUpdatedAt());
    }
}
