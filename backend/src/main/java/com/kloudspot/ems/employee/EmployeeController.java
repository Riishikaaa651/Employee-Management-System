package com.kloudspot.ems.employee;

import com.kloudspot.ems.common.ApiErrorResponse;
import com.kloudspot.ems.common.PagedResponse;
import com.kloudspot.ems.employee.dto.EmployeeRequest;
import com.kloudspot.ems.employee.dto.EmployeeResponse;
import com.kloudspot.ems.employee.dto.EmployeeSearchCriteria;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/employees")
@Tag(name = "Employees", description = "Create, read, update, delete and search employee records")
@SecurityRequirement(name = "sessionCookie")
@ApiResponses({
        @ApiResponse(responseCode = "401", description = "Not logged in or session expired",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
        @ApiResponse(responseCode = "403", description = "Missing or invalid CSRF token, or insufficient permission",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
})
public class EmployeeController {

    private final EmployeeService employeeService;

    public EmployeeController(EmployeeService employeeService) {
        this.employeeService = employeeService;
    }

    @GetMapping
    @Operation(summary = "List employees",
            description = "Returns one page of employees. Search, department and status filters are optional and combined with AND.")
    @ApiResponse(responseCode = "200", description = "A page of employees")
    @ApiResponse(responseCode = "400", description = "Invalid page, size, sortBy or sortDirection",
            content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    public PagedResponse<EmployeeResponse> listEmployees(
            @Parameter(description = "Case-insensitive text matched against full name or email")
            @RequestParam(required = false) String search,
            @Parameter(description = "Exact department name (case-insensitive)")
            @RequestParam(required = false) String department,
            @Parameter(description = "Employment status filter")
            @RequestParam(required = false) EmployeeStatus status,
            @Parameter(description = "Zero-based page index")
            @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size, 1 to " + EmployeeService.MAX_PAGE_SIZE)
            @RequestParam(defaultValue = "10") int size,
            @Parameter(description = "One of: id, fullName, email, department, designation, dateOfJoining, salary, employmentStatus")
            @RequestParam(defaultValue = "id") String sortBy,
            @Parameter(description = "asc or desc")
            @RequestParam(defaultValue = "asc") String sortDirection) {
        EmployeeSearchCriteria criteria = new EmployeeSearchCriteria(search, department, status);
        return employeeService.searchEmployees(criteria, page, size, sortBy, sortDirection);
    }

    @GetMapping("/departments")
    @Operation(summary = "List departments in use",
            description = "Distinct department names across all employees, used to populate the department filter")
    public List<String> listDepartments() {
        return employeeService.listDepartments();
    }

    @GetMapping("/{employeeId}")
    @Operation(summary = "Get employee details")
    @ApiResponse(responseCode = "200", description = "Employee found")
    @ApiResponse(responseCode = "404", description = "No employee with this ID",
            content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    public EmployeeResponse getEmployee(@PathVariable Long employeeId) {
        return employeeService.getEmployee(employeeId);
    }

    @PostMapping
    @Operation(summary = "Create an employee")
    @ApiResponse(responseCode = "201", description = "Employee created; Location header points to the new record")
    @ApiResponse(responseCode = "400", description = "Validation failed",
            content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    @ApiResponse(responseCode = "409", description = "Email address already used by another employee",
            content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    public ResponseEntity<EmployeeResponse> createEmployee(@Valid @RequestBody EmployeeRequest request) {
        EmployeeResponse createdEmployee = employeeService.createEmployee(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{employeeId}")
                .buildAndExpand(createdEmployee.id())
                .toUri();
        return ResponseEntity.created(location).body(createdEmployee);
    }

    @PutMapping("/{employeeId}")
    @Operation(summary = "Update an employee", description = "Replaces all editable fields of the employee")
    @ApiResponse(responseCode = "200", description = "Employee updated")
    @ApiResponse(responseCode = "400", description = "Validation failed",
            content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "No employee with this ID",
            content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    @ApiResponse(responseCode = "409", description = "Email address already used by another employee",
            content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    public EmployeeResponse updateEmployee(@PathVariable Long employeeId,
                                           @Valid @RequestBody EmployeeRequest request) {
        return employeeService.updateEmployee(employeeId, request);
    }

    @DeleteMapping("/{employeeId}")
    @Operation(summary = "Delete an employee")
    @ApiResponse(responseCode = "204", description = "Employee deleted")
    @ApiResponse(responseCode = "404", description = "No employee with this ID",
            content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    public ResponseEntity<Void> deleteEmployee(@PathVariable Long employeeId) {
        employeeService.deleteEmployee(employeeId);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }
}
