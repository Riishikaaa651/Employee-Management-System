CREATE TABLE employees (
    id                BIGINT         NOT NULL AUTO_INCREMENT,
    full_name         VARCHAR(100)   NOT NULL,
    email             VARCHAR(150)   NOT NULL,
    phone_number      VARCHAR(20)    NOT NULL,
    department        VARCHAR(100)   NOT NULL,
    designation       VARCHAR(100)   NOT NULL,
    date_of_joining   DATE           NOT NULL,
    salary            DECIMAL(12, 2) NOT NULL,
    employment_status VARCHAR(10)    NOT NULL,
    created_at        DATETIME(6)    NOT NULL,
    updated_at        DATETIME(6)    NOT NULL,
    CONSTRAINT pk_employees PRIMARY KEY (id),
    CONSTRAINT uk_employees_email UNIQUE (email),
    CONSTRAINT ck_employees_salary_non_negative CHECK (salary >= 0),
    CONSTRAINT ck_employees_status CHECK (employment_status IN ('ACTIVE', 'INACTIVE'))
);

CREATE INDEX idx_employees_department ON employees (department);
CREATE INDEX idx_employees_status ON employees (employment_status);
CREATE INDEX idx_employees_full_name ON employees (full_name);
