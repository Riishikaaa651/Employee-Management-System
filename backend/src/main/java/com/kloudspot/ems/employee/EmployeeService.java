package com.kloudspot.ems.employee;

import com.kloudspot.ems.common.DuplicateResourceException;
import com.kloudspot.ems.common.InvalidRequestException;
import com.kloudspot.ems.common.PagedResponse;
import com.kloudspot.ems.common.ResourceNotFoundException;
import com.kloudspot.ems.employee.dto.EmployeeRequest;
import com.kloudspot.ems.employee.dto.EmployeeResponse;
import com.kloudspot.ems.employee.dto.EmployeeSearchCriteria;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class EmployeeService {

    public static final int MAX_PAGE_SIZE = 100;

    /** API sort keys mapped to entity properties; anything else is rejected rather than passed to the query. */
    static final Map<String, String> SORTABLE_FIELDS = Map.of(
            "id", "id",
            "fullName", "fullName",
            "email", "email",
            "department", "department",
            "designation", "designation",
            "dateOfJoining", "dateOfJoining",
            "salary", "salary",
            "employmentStatus", "employmentStatus");

    static final String DUPLICATE_EMAIL_MESSAGE = "An employee with this email address already exists";

    private final EmployeeRepository employeeRepository;
    private final Clock clock;

    public EmployeeService(EmployeeRepository employeeRepository, Clock clock) {
        this.employeeRepository = employeeRepository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public PagedResponse<EmployeeResponse> searchEmployees(EmployeeSearchCriteria criteria, int page, int size,
                                                           String sortBy, String sortDirection) {
        Pageable pageable = buildPageable(page, size, sortBy, sortDirection);
        return PagedResponse.from(
                employeeRepository.findAll(EmployeeSpecifications.matching(criteria), pageable),
                EmployeeResponse::from);
    }

    @Transactional(readOnly = true)
    public EmployeeResponse getEmployee(Long employeeId) {
        return EmployeeResponse.from(findExistingEmployee(employeeId));
    }

    @Transactional(readOnly = true)
    public List<String> listDepartments() {
        return employeeRepository.findDistinctDepartments();
    }

    @Transactional
    public EmployeeResponse createEmployee(EmployeeRequest request) {
        validateBusinessRules(request);
        String normalizedEmail = normalizeEmail(request.email());
        if (employeeRepository.existsByEmail(normalizedEmail)) {
            throw duplicateEmail();
        }
        Employee employee = new Employee();
        applyRequest(employee, request, normalizedEmail);
        return EmployeeResponse.from(saveEnforcingUniqueEmail(employee));
    }

    @Transactional
    public EmployeeResponse updateEmployee(Long employeeId, EmployeeRequest request) {
        Employee employee = findExistingEmployee(employeeId);
        validateBusinessRules(request);
        String normalizedEmail = normalizeEmail(request.email());
        if (employeeRepository.existsByEmailAndIdNot(normalizedEmail, employeeId)) {
            throw duplicateEmail();
        }
        applyRequest(employee, request, normalizedEmail);
        return EmployeeResponse.from(saveEnforcingUniqueEmail(employee));
    }

    @Transactional
    public void deleteEmployee(Long employeeId) {
        Employee employee = findExistingEmployee(employeeId);
        employeeRepository.delete(employee);
    }

    Pageable buildPageable(int page, int size, String sortBy, String sortDirection) {
        if (page < 0) {
            throw new InvalidRequestException("page", "Page index must be 0 or greater");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new InvalidRequestException("size", "Page size must be between 1 and " + MAX_PAGE_SIZE);
        }
        String sortProperty = SORTABLE_FIELDS.get(sortBy);
        if (sortProperty == null) {
            throw new InvalidRequestException("sortBy",
                    "Unsupported sort field. Allowed values: " + String.join(", ", SORTABLE_FIELDS.keySet().stream().sorted().toList()));
        }
        Sort.Direction direction = Sort.Direction.fromOptionalString(sortDirection)
                .orElseThrow(() -> new InvalidRequestException("sortDirection", "Sort direction must be 'asc' or 'desc'"));
        // Secondary sort on id keeps page boundaries stable when many rows share the primary sort value.
        Sort sort = Sort.by(direction, sortProperty);
        if (!"id".equals(sortProperty)) {
            sort = sort.and(Sort.by(Sort.Direction.ASC, "id"));
        }
        return PageRequest.of(page, size, sort);
    }

    private void validateBusinessRules(EmployeeRequest request) {
        if (request.dateOfJoining() != null && request.dateOfJoining().isAfter(LocalDate.now(clock))) {
            throw new InvalidRequestException("dateOfJoining", "Date of joining cannot be in the future");
        }
    }

    private Employee findExistingEmployee(Long employeeId) {
        return employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee with ID " + employeeId + " was not found"));
    }

    /**
     * The existence check above gives a friendly error in the common case; the database's
     * unique index is what actually guarantees uniqueness when two requests race.
     */
    private Employee saveEnforcingUniqueEmail(Employee employee) {
        try {
            return employeeRepository.saveAndFlush(employee);
        } catch (DataIntegrityViolationException exception) {
            throw duplicateEmail();
        }
    }

    private static void applyRequest(Employee employee, EmployeeRequest request, String normalizedEmail) {
        employee.setFullName(request.fullName().trim());
        employee.setEmail(normalizedEmail);
        employee.setPhoneNumber(request.phoneNumber().trim());
        employee.setDepartment(request.department().trim());
        employee.setDesignation(request.designation().trim());
        employee.setDateOfJoining(request.dateOfJoining());
        employee.setSalary(request.salary());
        employee.setEmploymentStatus(request.employmentStatus());
    }

    static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static DuplicateResourceException duplicateEmail() {
        return new DuplicateResourceException("email", DUPLICATE_EMAIL_MESSAGE);
    }
}
