package com.kloudspot.ems.employee;

import com.kloudspot.ems.config.ApplicationProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;

/**
 * Inserts sample employees (all with @example.com addresses) when SEED_DEMO_DATA=true
 * and the employees table is empty. Existing data is never modified or deleted.
 */
@Component
public class DemoEmployeeDataInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoEmployeeDataInitializer.class);

    private record DemoEmployee(String fullName, String department, String designation, String dateOfJoining,
                                String salary, EmployeeStatus status) {
    }

    private static final List<DemoEmployee> DEMO_EMPLOYEES = List.of(
            new DemoEmployee("Aarav Mehta", "Engineering", "Software Engineer", "2022-03-14", "950000.00", EmployeeStatus.ACTIVE),
            new DemoEmployee("Priya Sharma", "Engineering", "Senior Software Engineer", "2019-07-01", "1850000.00", EmployeeStatus.ACTIVE),
            new DemoEmployee("Rohan Iyer", "Engineering", "QA Engineer", "2023-01-09", "720000.00", EmployeeStatus.ACTIVE),
            new DemoEmployee("Ananya Reddy", "Human Resources", "HR Manager", "2018-11-19", "1400000.00", EmployeeStatus.ACTIVE),
            new DemoEmployee("Vikram Singh", "Sales", "Account Executive", "2021-05-24", "880000.00", EmployeeStatus.INACTIVE),
            new DemoEmployee("Meera Nair", "Finance", "Financial Analyst", "2020-08-03", "1100000.00", EmployeeStatus.ACTIVE),
            new DemoEmployee("Karthik Rao", "Engineering", "DevOps Engineer", "2022-10-17", "1300000.00", EmployeeStatus.ACTIVE),
            new DemoEmployee("Sneha Kulkarni", "Marketing", "Marketing Specialist", "2021-02-01", "780000.00", EmployeeStatus.ACTIVE),
            new DemoEmployee("Arjun Patel", "Sales", "Sales Manager", "2017-04-10", "1650000.00", EmployeeStatus.ACTIVE),
            new DemoEmployee("Divya Menon", "Customer Support", "Support Engineer", "2023-06-12", "600000.00", EmployeeStatus.ACTIVE),
            new DemoEmployee("Rahul Verma", "Engineering", "Engineering Manager", "2016-09-05", "2600000.00", EmployeeStatus.ACTIVE),
            new DemoEmployee("Ishita Gupta", "Finance", "Accountant", "2022-01-03", "690000.00", EmployeeStatus.INACTIVE),
            new DemoEmployee("Nikhil Joshi", "Marketing", "Content Strategist", "2020-12-07", "820000.00", EmployeeStatus.ACTIVE),
            new DemoEmployee("Kavya Pillai", "Human Resources", "Talent Acquisition Specialist", "2023-03-20", "650000.00", EmployeeStatus.ACTIVE),
            new DemoEmployee("Siddharth Bose", "Customer Support", "Support Team Lead", "2019-02-25", "1050000.00", EmployeeStatus.INACTIVE),
            new DemoEmployee("Pooja Desai", "Engineering", "Frontend Developer", "2024-02-05", "900000.00", EmployeeStatus.ACTIVE),
            new DemoEmployee("Aditya Kumar", "Sales", "Business Development Associate", "2024-07-15", "560000.00", EmployeeStatus.ACTIVE),
            new DemoEmployee("Neha Chatterjee", "Finance", "Finance Manager", "2018-06-18", "2100000.00", EmployeeStatus.ACTIVE),
            new DemoEmployee("Manish Agarwal", "Engineering", "Data Engineer", "2021-09-27", "1400000.00", EmployeeStatus.ACTIVE),
            new DemoEmployee("Ritu Saxena", "Marketing", "Marketing Manager", "2017-12-11", "1750000.00", EmployeeStatus.INACTIVE),
            new DemoEmployee("Harsh Malhotra", "Customer Support", "Customer Success Associate", "2025-01-06", "520000.00", EmployeeStatus.ACTIVE),
            new DemoEmployee("Tanvi Shetty", "Engineering", "Backend Developer", "2024-09-02", "980000.00", EmployeeStatus.ACTIVE),
            new DemoEmployee("Yash Thakur", "Human Resources", "HR Executive", "2022-07-11", "540000.00", EmployeeStatus.ACTIVE),
            new DemoEmployee("Lakshmi Krishnan", "Engineering", "Software Architect", "2015-03-02", "3200000.00", EmployeeStatus.ACTIVE)
    );

    private final EmployeeRepository employeeRepository;
    private final ApplicationProperties applicationProperties;

    public DemoEmployeeDataInitializer(EmployeeRepository employeeRepository,
                                       ApplicationProperties applicationProperties) {
        this.employeeRepository = employeeRepository;
        this.applicationProperties = applicationProperties;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments arguments) {
        boolean enabled = applicationProperties.demoData() != null && applicationProperties.demoData().enabled();
        if (!enabled) {
            return;
        }
        if (employeeRepository.count() > 0) {
            log.info("Demo data enabled but employees already exist; skipping sample data.");
            return;
        }
        for (int index = 0; index < DEMO_EMPLOYEES.size(); index++) {
            employeeRepository.save(toEmployee(DEMO_EMPLOYEES.get(index), index));
        }
        log.info("Inserted {} demo employees.", DEMO_EMPLOYEES.size());
    }

    private static Employee toEmployee(DemoEmployee demoEmployee, int index) {
        Employee employee = new Employee();
        employee.setFullName(demoEmployee.fullName());
        employee.setEmail(demoEmployee.fullName().toLowerCase(Locale.ROOT).replace(' ', '.') + "@example.com");
        employee.setPhoneNumber(String.format("+91 98450 %05d", 10000 + index * 137));
        employee.setDepartment(demoEmployee.department());
        employee.setDesignation(demoEmployee.designation());
        employee.setDateOfJoining(LocalDate.parse(demoEmployee.dateOfJoining()));
        employee.setSalary(new BigDecimal(demoEmployee.salary()));
        employee.setEmploymentStatus(demoEmployee.status());
        return employee;
    }
}
