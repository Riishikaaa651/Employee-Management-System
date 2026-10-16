package com.kloudspot.ems.employee;

import com.kloudspot.ems.employee.dto.EmployeeSearchCriteria;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Builds the JPA criteria query for the employee list. Every filter is optional and
 * all supplied filters are combined with AND. Values are bound as query parameters,
 * never concatenated into SQL.
 */
public final class EmployeeSpecifications {

    private static final char LIKE_ESCAPE_CHARACTER = '\\';

    private EmployeeSpecifications() {
    }

    public static Specification<Employee> matching(EmployeeSearchCriteria criteria) {
        return (root, query, builder) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (StringUtils.hasText(criteria.search())) {
                String pattern = "%" + escapeLikeWildcards(criteria.search().trim().toLowerCase(Locale.ROOT)) + "%";
                predicates.add(builder.or(
                        builder.like(builder.lower(root.get("fullName")), pattern, LIKE_ESCAPE_CHARACTER),
                        builder.like(builder.lower(root.get("email")), pattern, LIKE_ESCAPE_CHARACTER)));
            }
            if (StringUtils.hasText(criteria.department())) {
                predicates.add(builder.equal(
                        builder.lower(root.get("department")),
                        criteria.department().trim().toLowerCase(Locale.ROOT)));
            }
            if (criteria.status() != null) {
                predicates.add(builder.equal(root.get("employmentStatus"), criteria.status()));
            }
            return builder.and(predicates.toArray(Predicate[]::new));
        };
    }

    /** Makes user-typed "%" and "_" match literally instead of acting as wildcards. */
    static String escapeLikeWildcards(String value) {
        return value
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
    }
}
