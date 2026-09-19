-- Pick The Bank · Banken, erweiterte Anlagestatus und echte Dokumentenablage
-- Erweitert 001 ohne bestehende Daten zu verlieren.

/* ---------------------------------------------------------------- Banken */

CREATE TABLE banks (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(160)    NOT NULL,
  legal_name  VARCHAR(190)    NULL,
  country     VARCHAR(80)     NOT NULL,
  city        VARCHAR(120)    NULL,
  address     VARCHAR(190)    NULL,
  postal_code VARCHAR(20)     NULL,
  website     VARCHAR(190)    NULL,
  bic         VARCHAR(11)     NULL,
  -- Das Logo liegt wie alle Dateien ausserhalb des Webroots; hier steht nur der Schlüssel.
  logo_key    VARCHAR(255)    NULL,
  logo_mime   VARCHAR(120)    NULL,
  notes       TEXT            NULL,
  created_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at  DATETIME(3)     NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_banks_name (name),
  KEY ix_banks_country (country)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* --------------------------------------------- Anlagen: Bank und Status */

ALTER TABLE fixed_deposit_accounts
  ADD COLUMN bank_id BIGINT UNSIGNED NULL AFTER customer_id,
  ADD KEY ix_accounts_bank (bank_id),
  ADD CONSTRAINT fk_accounts_bank FOREIGN KEY (bank_id) REFERENCES banks (id) ON DELETE RESTRICT;

-- Die bisherigen Status bleiben gültig, die vom Fachkonzept geforderten kommen hinzu.
ALTER TABLE fixed_deposit_accounts
  MODIFY COLUMN status ENUM(
    'DRAFT','KYC_PENDING','DOCS_PENDING','IN_PROGRESS',
    'PENDING','ACTIVE','MATURED','PAID_OUT','CLOSED','CANCELLED'
  ) NOT NULL DEFAULT 'PENDING';

/* ------------------------------------------------------------ Dokumente */

-- Schritt 1: neue Kategorien zusätzlich erlauben, damit die Umschlüsselung läuft.
ALTER TABLE documents
  MODIFY COLUMN category ENUM(
    'IDENTIFICATION','CONTRACTS','CONFIRMATIONS','STATEMENTS','CORRESPONDENCE','OTHER',
    'IDENTITY','KYC','BANK_DOCUMENTS'
  ) NOT NULL DEFAULT 'OTHER';

UPDATE documents SET category = 'IDENTITY' WHERE category = 'IDENTIFICATION';
UPDATE documents SET category = 'BANK_DOCUMENTS'
 WHERE category IN ('CONFIRMATIONS','STATEMENTS','CORRESPONDENCE');

-- Schritt 2: auf die fünf Kategorien des Fachkonzepts festlegen.
ALTER TABLE documents
  MODIFY COLUMN category ENUM('IDENTITY','KYC','CONTRACTS','BANK_DOCUMENTS','OTHER')
  NOT NULL DEFAULT 'OTHER';

ALTER TABLE documents
  ADD COLUMN title            VARCHAR(255) NULL AFTER filename,
  ADD COLUMN doc_type         VARCHAR(60)  NULL AFTER category,
  ADD COLUMN mime_type        VARCHAR(120) NULL AFTER doc_type,
  ADD COLUMN size_bytes       BIGINT UNSIGNED NOT NULL DEFAULT 0 AFTER size_kb,
  ADD COLUMN checksum         CHAR(64)     NULL,
  ADD COLUMN uploaded_by_role ENUM('ADMIN','STAFF','CUSTOMER','SYSTEM') NOT NULL DEFAULT 'STAFF',
  ADD COLUMN deleted_at       DATETIME(3)  NULL,
  ADD KEY ix_documents_category (customer_id, category),
  ADD KEY ix_documents_uploaded (uploaded_at);

UPDATE documents SET title = filename WHERE title IS NULL;
UPDATE documents SET size_bytes = size_kb * 1024 WHERE size_bytes = 0;

/* ------------------------------------------------------- Protokollbezug */

ALTER TABLE audit_logs
  ADD COLUMN affected_bank_id     BIGINT UNSIGNED NULL AFTER affected_account_id,
  ADD COLUMN affected_document_id BIGINT UNSIGNED NULL AFTER affected_bank_id;
