package com.kloudspot.ems.employee.dto;

import com.kloudspot.ems.employee.EmployeeStatus;

/** Optional filters for the employee list; a null or blank value means "do not filter". */
public record EmployeeSearchCriteria(String search, String department, EmployeeStatus status) {
}
