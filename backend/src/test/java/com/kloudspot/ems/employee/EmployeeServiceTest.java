package com.kloudspot.ems.employee;

import com.kloudspot.ems.common.DuplicateResourceException;
import com.kloudspot.ems.common.InvalidRequestException;
import com.kloudspot.ems.common.PagedResponse;
import com.kloudspot.ems.common.ResourceNotFoundException;
import com.kloudspot.ems.employee.dto.EmployeeRequest;
import com.kloudspot.ems.employee.dto.EmployeeResponse;
import com.kloudspot.ems.employee.dto.EmployeeSearchCriteria;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmployeeServiceTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 15);
    private static final Clock FIXED_CLOCK =
            Clock.fixed(TODAY.atStartOfDay().toInstant(ZoneOffset.UTC), ZoneOffset.UTC);

    @Mock
    private EmployeeRepository employeeRepository;

    private EmployeeService employeeService;

    @BeforeEach
    void setUp() {
        employeeService = new EmployeeService(employeeRepository, FIXED_CLOCK);
    }

    @Nested
    @DisplayName("createEmployee")
    class CreateEmployee {

        @Test
        void savesTrimmedFieldsAndLowercaseEmail() {
            EmployeeRequest request = validRequestBuilder()
                    .fullName("  Priya Sharma  ")
                    .email("  Priya.Sharma@Example.COM ")
                    .department(" Engineering ")
                    .build();
            when(employeeRepository.existsByEmail("priya.sharma@example.com")).thenReturn(false);
            when(employeeRepository.saveAndFlush(any(Employee.class))).thenAnswer(invocation -> {
                Employee saved = invocation.getArgument(0);
                saved.setId(42L);
                return saved;
            });

            EmployeeResponse response = employeeService.createEmployee(request);

            ArgumentCaptor<Employee> savedEmployee = ArgumentCaptor.forClass(Employee.class);
            verify(employeeRepository).saveAndFlush(savedEmployee.capture());
            assertThat(savedEmployee.getValue().getFullName()).isEqualTo("Priya Sharma");
            assertThat(savedEmployee.getValue().getEmail()).isEqualTo("priya.sharma@example.com");
            assertThat(savedEmployee.getValue().getDepartment()).isEqualTo("Engineering");
            assertThat(savedEmployee.getValue().getSalary()).isEqualByComparingTo("850000.00");
            assertThat(response.id()).isEqualTo(42L);
            assertThat(response.email()).isEqualTo("priya.sharma@example.com");
            assertThat(response.employmentStatus()).isEqualTo(EmployeeStatus.ACTIVE);
        }

        @Test
        void rejectsEmailAlreadyUsedByAnotherEmployeeIgnoringCase() {
            when(employeeRepository.existsByEmail("priya.sharma@example.com")).thenReturn(true);
            EmployeeRequest request = validRequestBuilder().email("PRIYA.SHARMA@example.com").build();

            assertThatThrownBy(() -> employeeService.createEmployee(request))
                    .isInstanceOf(DuplicateResourceException.class)
                    .hasMessage(EmployeeService.DUPLICATE_EMAIL_MESSAGE)
                    .extracting("field").isEqualTo("email");
            verify(employeeRepository, never()).saveAndFlush(any());
        }

        @Test
        void translatesDatabaseUniqueViolationFromConcurrentInsertIntoDuplicateError() {
            when(employeeRepository.existsByEmail(anyString())).thenReturn(false);
            when(employeeRepository.saveAndFlush(any(Employee.class)))
                    .thenThrow(new DataIntegrityViolationException("Duplicate entry for key 'uk_employees_email'"));

            assertThatThrownBy(() -> employeeService.createEmployee(validRequestBuilder().build()))
                    .isInstanceOf(DuplicateResourceException.class)
                    .hasMessage(EmployeeService.DUPLICATE_EMAIL_MESSAGE);
        }

        @Test
        void rejectsJoiningDateInTheFuture() {
            EmployeeRequest request = validRequestBuilder().dateOfJoining(TODAY.plusDays(1)).build();

            assertThatThrownBy(() -> employeeService.createEmployee(request))
                    .isInstanceOf(InvalidRequestException.class)
                    .hasMessage("Date of joining cannot be in the future")
                    .extracting("field").isEqualTo("dateOfJoining");
            verify(employeeRepository, never()).saveAndFlush(any());
        }

        @Test
        void acceptsJoiningDateOfToday() {
            when(employeeRepository.existsByEmail(anyString())).thenReturn(false);
            when(employeeRepository.saveAndFlush(any(Employee.class))).thenAnswer(invocation -> invocation.getArgument(0));

            EmployeeResponse response = employeeService.createEmployee(validRequestBuilder().dateOfJoining(TODAY).build());

            assertThat(response.dateOfJoining()).isEqualTo(TODAY);
        }
    }

    @Nested
    @DisplayName("getEmployee")
    class GetEmployee {

        @Test
        void returnsEmployeeWhenFound() {
            when(employeeRepository.findById(7L)).thenReturn(Optional.of(existingEmployee(7L, "aarav.mehta@example.com")));

            EmployeeResponse response = employeeService.getEmployee(7L);

            assertThat(response.id()).isEqualTo(7L);
            assertThat(response.fullName()).isEqualTo("Aarav Mehta");
            assertThat(response.department()).isEqualTo("Engineering");
        }

        @Test
        void throwsNotFoundWhenEmployeeDoesNotExist() {
            when(employeeRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> employeeService.getEmployee(99L))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessage("Employee with ID 99 was not found");
        }
    }

    @Nested
    @DisplayName("updateEmployee")
    class UpdateEmployee {

        @Test
        void replacesAllEditableFields() {
            Employee existing = existingEmployee(5L, "aarav.mehta@example.com");
            when(employeeRepository.findById(5L)).thenReturn(Optional.of(existing));
            when(employeeRepository.existsByEmailAndIdNot("aarav.m@example.com", 5L)).thenReturn(false);
            when(employeeRepository.saveAndFlush(existing)).thenReturn(existing);
            EmployeeRequest request = validRequestBuilder()
                    .fullName("Aarav M")
                    .email("Aarav.M@example.com")
                    .designation("Senior Software Engineer")
                    .salary(new BigDecimal("1200000.50"))
                    .employmentStatus(EmployeeStatus.INACTIVE)
                    .build();

            EmployeeResponse response = employeeService.updateEmployee(5L, request);

            assertThat(response.id()).isEqualTo(5L);
            assertThat(response.fullName()).isEqualTo("Aarav M");
            assertThat(response.email()).isEqualTo("aarav.m@example.com");
            assertThat(response.designation()).isEqualTo("Senior Software Engineer");
            assertThat(response.salary()).isEqualByComparingTo("1200000.50");
            assertThat(response.employmentStatus()).isEqualTo(EmployeeStatus.INACTIVE);
        }

        @Test
        void allowsKeepingTheSameEmail() {
            Employee existing = existingEmployee(5L, "aarav.mehta@example.com");
            when(employeeRepository.findById(5L)).thenReturn(Optional.of(existing));
            when(employeeRepository.existsByEmailAndIdNot("aarav.mehta@example.com", 5L)).thenReturn(false);
            when(employeeRepository.saveAndFlush(existing)).thenReturn(existing);

            EmployeeResponse response = employeeService.updateEmployee(5L,
                    validRequestBuilder().email("aarav.mehta@example.com").build());

            assertThat(response.email()).isEqualTo("aarav.mehta@example.com");
        }

        @Test
        void rejectsEmailBelongingToAnotherEmployee() {
            when(employeeRepository.findById(5L)).thenReturn(Optional.of(existingEmployee(5L, "aarav.mehta@example.com")));
            when(employeeRepository.existsByEmailAndIdNot("priya.sharma@example.com", 5L)).thenReturn(true);

            assertThatThrownBy(() -> employeeService.updateEmployee(5L, validRequestBuilder().build()))
                    .isInstanceOf(DuplicateResourceException.class);
            verify(employeeRepository, never()).saveAndFlush(any());
        }

        @Test
        void throwsNotFoundForMissingEmployee() {
            when(employeeRepository.findById(404L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> employeeService.updateEmployee(404L, validRequestBuilder().build()))
                    .isInstanceOf(ResourceNotFoundException.class);
            verify(employeeRepository, never()).saveAndFlush(any());
        }

        @Test
        void rejectsFutureJoiningDateWithoutSaving() {
            when(employeeRepository.findById(5L)).thenReturn(Optional.of(existingEmployee(5L, "aarav.mehta@example.com")));

            assertThatThrownBy(() -> employeeService.updateEmployee(5L,
                    validRequestBuilder().dateOfJoining(TODAY.plusYears(1)).build()))
                    .isInstanceOf(InvalidRequestException.class);
            verify(employeeRepository, never()).saveAndFlush(any());
        }
    }

    @Nested
    @DisplayName("deleteEmployee")
    class DeleteEmployee {

        @Test
        void deletesExistingEmployee() {
            Employee existing = existingEmployee(3L, "rohan.iyer@example.com");
            when(employeeRepository.findById(3L)).thenReturn(Optional.of(existing));

            employeeService.deleteEmployee(3L);

            verify(employeeRepository).delete(existing);
        }

        @Test
        void throwsNotFoundAndDeletesNothingForMissingEmployee() {
            when(employeeRepository.findById(3L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> employeeService.deleteEmployee(3L))
                    .isInstanceOf(ResourceNotFoundException.class);
            verify(employeeRepository, never()).delete(any(Employee.class));
        }
    }

    @Nested
    @DisplayName("searchEmployees")
    class SearchEmployees {

        @Test
        @SuppressWarnings("unchecked")
        void passesFiltersAndRequestedPageToRepositoryAndMapsResult() {
            Employee employee = existingEmployee(1L, "aarav.mehta@example.com");
            when(employeeRepository.findAll(any(Specification.class), any(Pageable.class)))
                    .thenAnswer(invocation -> new PageImpl<>(List.of(employee), invocation.getArgument(1), 21));

            PagedResponse<EmployeeResponse> result = employeeService.searchEmployees(
                    new EmployeeSearchCriteria("aarav", "Engineering", EmployeeStatus.ACTIVE),
                    2, 10, "fullName", "desc");

            ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
            verify(employeeRepository).findAll(any(Specification.class), pageable.capture());
            assertThat(pageable.getValue().getPageNumber()).isEqualTo(2);
            assertThat(pageable.getValue().getPageSize()).isEqualTo(10);
            assertThat(pageable.getValue().getSort())
                    .isEqualTo(Sort.by(Sort.Order.desc("fullName"), Sort.Order.asc("id")));
            assertThat(result.content()).extracting(EmployeeResponse::email).containsExactly("aarav.mehta@example.com");
            assertThat(result.page()).isEqualTo(2);
            assertThat(result.totalElements()).isEqualTo(21);
            assertThat(result.totalPages()).isEqualTo(3);
            assertThat(result.last()).isTrue();
        }

        @Test
        void sortsByIdAloneWhenIdIsTheSortField() {
            Pageable pageable = employeeService.buildPageable(0, 10, "id", "ASC");

            assertThat(pageable).isEqualTo(PageRequest.of(0, 10, Sort.by(Sort.Order.asc("id"))));
        }

        @ParameterizedTest
        @ValueSource(strings = {"password", "createdAt", "full_name; drop table employees", ""})
        void rejectsUnsupportedSortFields(String sortBy) {
            assertThatThrownBy(() -> employeeService.buildPageable(0, 10, sortBy, "asc"))
                    .isInstanceOf(InvalidRequestException.class)
                    .extracting("field").isEqualTo("sortBy");
        }

        @Test
        void rejectsUnknownSortDirection() {
            assertThatThrownBy(() -> employeeService.buildPageable(0, 10, "id", "sideways"))
                    .isInstanceOf(InvalidRequestException.class)
                    .extracting("field").isEqualTo("sortDirection");
        }

        @ParameterizedTest
        @ValueSource(ints = {0, -1, EmployeeService.MAX_PAGE_SIZE + 1})
        void rejectsPageSizesOutsideBounds(int size) {
            assertThatThrownBy(() -> employeeService.buildPageable(0, size, "id", "asc"))
                    .isInstanceOf(InvalidRequestException.class)
                    .extracting("field").isEqualTo("size");
        }

        @Test
        void rejectsNegativePageIndex() {
            assertThatThrownBy(() -> employeeService.buildPageable(-1, 10, "id", "asc"))
                    .isInstanceOf(InvalidRequestException.class)
                    .extracting("field").isEqualTo("page");
        }

        @Test
        void listsDistinctDepartmentsFromRepository() {
            when(employeeRepository.findDistinctDepartments()).thenReturn(List.of("Engineering", "Finance"));

            assertThat(employeeService.listDepartments()).containsExactly("Engineering", "Finance");
        }
    }

    @Test
    void escapesLikeWildcardsInSearchTerm() {
        assertThat(EmployeeSpecifications.escapeLikeWildcards("50%_off\\")).isEqualTo("50\\%\\_off\\\\");
    }

    private static Employee existingEmployee(Long id, String email) {
        Employee employee = new Employee();
        employee.setId(id);
        employee.setFullName("Aarav Mehta");
        employee.setEmail(email);
        employee.setPhoneNumber("+91 98450 10000");
        employee.setDepartment("Engineering");
        employee.setDesignation("Software Engineer");
        employee.setDateOfJoining(LocalDate.of(2022, 3, 14));
        employee.setSalary(new BigDecimal("950000.00"));
        employee.setEmploymentStatus(EmployeeStatus.ACTIVE);
        return employee;
    }

    private static EmployeeRequestBuilder validRequestBuilder() {
        return new EmployeeRequestBuilder();
    }

    /** Test-only builder so each test states just the fields it cares about. */
    private static final class EmployeeRequestBuilder {
        private String fullName = "Priya Sharma";
        private String email = "priya.sharma@example.com";
        private final String phoneNumber = "+91 98765 43210";
        private String department = "Engineering";
        private String designation = "Software Engineer";
        private LocalDate dateOfJoining = LocalDate.of(2024, 7, 1);
        private BigDecimal salary = new BigDecimal("850000.00");
        private EmployeeStatus employmentStatus = EmployeeStatus.ACTIVE;

        EmployeeRequestBuilder fullName(String value) { fullName = value; return this; }
        EmployeeRequestBuilder email(String value) { email = value; return this; }
        EmployeeRequestBuilder department(String value) { department = value; return this; }
        EmployeeRequestBuilder designation(String value) { designation = value; return this; }
        EmployeeRequestBuilder dateOfJoining(LocalDate value) { dateOfJoining = value; return this; }
        EmployeeRequestBuilder salary(BigDecimal value) { salary = value; return this; }
        EmployeeRequestBuilder employmentStatus(EmployeeStatus value) { employmentStatus = value; return this; }

        EmployeeRequest build() {
            return new EmployeeRequest(fullName, email, phoneNumber, department, designation, dateOfJoining,
                    salary, employmentStatus);
        }
    }
}
