package com.kloudspot.ems.common;

/** Thrown when a write would violate a uniqueness rule, e.g. two employees with the same email. */
public class DuplicateResourceException extends RuntimeException {

    private final String field;

    public DuplicateResourceException(String field, String message) {
        super(message);
        this.field = field;
    }

    public String getField() {
        return field;
    }
}
