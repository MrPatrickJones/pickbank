-- Pick The Bank · Grundschema (MySQL 8 / MariaDB 10.6+)

CREATE TABLE customers (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_number VARCHAR(32)     NOT NULL,
  first_name      VARCHAR(100)    NOT NULL,
  last_name       VARCHAR(100)    NOT NULL,
  company_name    VARCHAR(160)    NULL,
  email           VARCHAR(190)    NOT NULL,
  phone           VARCHAR(40)     NULL,
  mobile          VARCHAR(40)     NULL,
  date_of_birth   DATE            NULL,
  address         VARCHAR(190)    NULL,
  postal_code     VARCHAR(20)     NULL,
  city            VARCHAR(120)    NULL,
  country         VARCHAR(80)     NULL,
  nationality     VARCHAR(80)     NULL,
  customer_status ENUM('ACTIVE','INACTIVE','PENDING','BLOCKED') NOT NULL DEFAULT 'PENDING',
  kyc_status      ENUM('OPEN','SUBMITTED','VERIFIED','REJECTED')  NOT NULL DEFAULT 'OPEN',
  identified_at   DATE            NULL,
  identification_type VARCHAR(60) NULL,
  created_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  last_login_at   DATETIME(3)     NULL,
  deleted_at      DATETIME(3)     NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_customers_number (customer_number),
  UNIQUE KEY uq_customers_email (email),
  KEY ix_customers_status (customer_status),
  KEY ix_customers_country (country),
  KEY ix_customers_created (created_at),
  KEY ix_customers_name (last_name, first_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE fixed_deposit_accounts (
  id                     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id            BIGINT UNSIGNED NOT NULL,
  account_number         VARCHAR(32)     NOT NULL,
  product_name           VARCHAR(120)    NOT NULL,
  principal_amount       DECIMAL(18,2)   NOT NULL,
  currency               CHAR(3)         NOT NULL DEFAULT 'EUR',
  interest_rate          DECIMAL(6,4)    NOT NULL,
  term_months            SMALLINT UNSIGNED NOT NULL,
  start_date             DATE            NOT NULL,
  maturity_date          DATE            NOT NULL,
  status                 ENUM('PENDING','ACTIVE','MATURED','CLOSED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  interest_payment_method ENUM('AT_MATURITY','ANNUAL','QUARTERLY','MONTHLY') NOT NULL DEFAULT 'AT_MATURITY',
  payout_date            DATE            NULL,
  reference_account      VARCHAR(64)     NULL,
  notes                  TEXT            NULL,
  created_at             DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at             DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at             DATETIME(3)     NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_accounts_number (account_number),
  KEY ix_accounts_customer (customer_id),
  KEY ix_accounts_status (status),
  KEY ix_accounts_maturity (maturity_date),
  CONSTRAINT fk_accounts_customer FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE,
  CONSTRAINT ck_accounts_principal CHECK (principal_amount >= 0),
  CONSTRAINT ck_accounts_rate CHECK (interest_rate >= 0 AND interest_rate <= 25),
  CONSTRAINT ck_accounts_term CHECK (term_months > 0 AND term_months <= 120),
  CONSTRAINT ck_accounts_dates CHECK (maturity_date > start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ein Login je Benutzer: Mitarbeitende ohne customer_id, Kundenzugänge mit customer_id.
CREATE TABLE auth_users (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email                VARCHAR(190)    NOT NULL,
  password_hash        VARCHAR(255)    NOT NULL,
  role                 ENUM('ADMIN','STAFF','CUSTOMER') NOT NULL,
  full_name            VARCHAR(160)    NOT NULL,
  customer_id          BIGINT UNSIGNED NULL,
  status               ENUM('ACTIVE','LOCKED','DISABLED') NOT NULL DEFAULT 'ACTIVE',
  must_change_password TINYINT(1)      NOT NULL DEFAULT 0,
  failed_attempts      SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  locked_until         DATETIME(3)     NULL,
  last_login_at        DATETIME(3)     NULL,
  password_changed_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_by           BIGINT UNSIGNED NULL,
  created_at           DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at           DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_auth_email (email),
  UNIQUE KEY uq_auth_customer (customer_id),
  KEY ix_auth_role (role),
  CONSTRAINT fk_auth_customer FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sessions (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id        BIGINT UNSIGNED NOT NULL,
  token_hash     CHAR(64)        NOT NULL,
  csrf_token     CHAR(64)        NOT NULL,
  ip_address     VARCHAR(45)     NULL,
  user_agent     VARCHAR(255)    NULL,
  expires_at     DATETIME(3)     NOT NULL,
  last_seen_at   DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at     DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  revoked_at     DATETIME(3)     NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sessions_token (token_hash),
  KEY ix_sessions_user (user_id),
  KEY ix_sessions_expires (expires_at),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES auth_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE password_resets (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NOT NULL,
  token_hash  CHAR(64)        NOT NULL,
  expires_at  DATETIME(3)     NOT NULL,
  used_at     DATETIME(3)     NULL,
  created_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_reset_token (token_hash),
  KEY ix_reset_user (user_id),
  CONSTRAINT fk_reset_user FOREIGN KEY (user_id) REFERENCES auth_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE login_attempts (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifier  VARCHAR(190)    NOT NULL,
  ip_address  VARCHAR(45)     NULL,
  successful  TINYINT(1)      NOT NULL DEFAULT 0,
  created_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_attempts_identifier (identifier, created_at),
  KEY ix_attempts_ip (ip_address, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE documents (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id  BIGINT UNSIGNED NOT NULL,
  account_id   BIGINT UNSIGNED NULL,
  filename     VARCHAR(255)    NOT NULL,
  category     ENUM('IDENTIFICATION','CONTRACTS','CONFIRMATIONS','STATEMENTS','CORRESPONDENCE','OTHER') NOT NULL DEFAULT 'OTHER',
  size_kb      INT UNSIGNED    NOT NULL DEFAULT 0,
  storage_key  VARCHAR(255)    NULL,
  uploaded_by  BIGINT UNSIGNED NULL,
  uploaded_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_documents_customer (customer_id),
  KEY ix_documents_account (account_id),
  CONSTRAINT fk_documents_customer FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE,
  CONSTRAINT fk_documents_account FOREIGN KEY (account_id) REFERENCES fixed_deposit_accounts (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE messages (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id BIGINT UNSIGNED NOT NULL,
  subject     VARCHAR(190)    NOT NULL,
  body        TEXT            NOT NULL,
  sent_by     BIGINT UNSIGNED NULL,
  sent_at     DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  read_at     DATETIME(3)     NULL,
  PRIMARY KEY (id),
  KEY ix_messages_customer (customer_id, sent_at),
  CONSTRAINT fk_messages_customer FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE audit_logs (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id             BIGINT UNSIGNED NULL,
  user_role           ENUM('ADMIN','STAFF','CUSTOMER','SYSTEM') NOT NULL,
  user_label          VARCHAR(160)    NOT NULL,
  action              VARCHAR(80)     NOT NULL,
  description         VARCHAR(500)    NOT NULL,
  affected_customer_id BIGINT UNSIGNED NULL,
  affected_account_id  BIGINT UNSIGNED NULL,
  changed_field       VARCHAR(80)     NULL,
  old_value           VARCHAR(255)    NULL,
  new_value           VARCHAR(255)    NULL,
  ip_address          VARCHAR(45)     NULL,
  created_at          DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_audit_customer (affected_customer_id, created_at),
  KEY ix_audit_account (affected_account_id, created_at),
  KEY ix_audit_created (created_at),
  KEY ix_audit_action (action),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES auth_users (id) ON DELETE SET NULL,
  CONSTRAINT fk_audit_customer FOREIGN KEY (affected_customer_id) REFERENCES customers (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
