package com.kloudspot.ems.common;

/**
 * A request that is well-formed but breaks a business rule or uses an unsupported
 * query parameter. {@code field} is set when the problem belongs to one input field.
 */
public class InvalidRequestException extends RuntimeException {

    private final String field;

    public InvalidRequestException(String field, String message) {
        super(message);
        this.field = field;
    }

    public String getField() {
        return field;
    }
}
