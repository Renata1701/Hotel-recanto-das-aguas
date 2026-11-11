-- Recanto das Águas — modelo relacional (MySQL 8)
-- Execute conectado como root ou hotel, com schema recanto selecionado.

USE recanto;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------------
-- Catálogo
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS entries;
DROP TABLE IF EXISTS proposal_items;
DROP TABLE IF EXISTS proposals;
DROP TABLE IF EXISTS credentials;
DROP TABLE IF EXISTS participants;
DROP TABLE IF EXISTS stays;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS staff_users;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE products (
  id            VARCHAR(32)  NOT NULL PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  category      ENUM('Bebidas','Drinks','Porções','Pratos','Sobremesas') NOT NULL,
  description   VARCHAR(255) NOT NULL DEFAULT '',
  price_cents   INT UNSIGNED NOT NULL,
  available     TINYINT(1)   NOT NULL DEFAULT 1,
  sector        ENUM('Bar da Piscina','Restaurante','Lanchonete') NOT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_products_sector (sector, available)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Permanência (conta) e hóspedes
-- ---------------------------------------------------------------------------
CREATE TABLE stays (
  id            VARCHAR(32)  NOT NULL PRIMARY KEY,
  type          ENUM('hospedagem','dayuse') NOT NULL,
  room          VARCHAR(10)  NULL,
  holder_id     VARCHAR(32)  NULL,
  status        ENUM('aberta','em_fechamento','encerrada') NOT NULL DEFAULT 'aberta',
  check_in_date DATE         NULL,
  check_out_date DATE        NULL,
  day_use_ends_at BIGINT     NULL,
  opened_at     BIGINT       NOT NULL,
  closed_at     BIGINT       NULL,
  INDEX idx_stays_status (status),
  INDEX idx_stays_room (room)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE participants (
  id            VARCHAR(32)  NOT NULL PRIMARY KEY,
  stay_id       VARCHAR(32)  NOT NULL,
  name          VARCHAR(120) NOT NULL,
  document      VARCHAR(20)  NULL,
  phone         VARCHAR(20)  NULL,
  CONSTRAINT fk_participants_stay
    FOREIGN KEY (stay_id) REFERENCES stays(id) ON DELETE CASCADE,
  INDEX idx_participants_stay (stay_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE stays
  ADD CONSTRAINT fk_stays_holder
  FOREIGN KEY (holder_id) REFERENCES participants(id) ON DELETE SET NULL;

CREATE TABLE credentials (
  id                VARCHAR(32)  NOT NULL PRIMARY KEY,
  code              VARCHAR(24)  NOT NULL,
  stay_id           VARCHAR(32)  NOT NULL,
  participant_id    VARCHAR(32)  NOT NULL,
  medium            ENUM('celular','pulseira') NOT NULL,
  status            ENUM('ativa','bloqueada','expirada','revogada') NOT NULL DEFAULT 'ativa',
  pin_hash          VARCHAR(255) NULL COMMENT 'hash do PIN; não armazenar PIN em texto puro em produção',
  activation_code   VARCHAR(12)  NULL,
  issued_at         BIGINT       NOT NULL,
  UNIQUE KEY uk_credentials_code (code),
  CONSTRAINT fk_credentials_stay
    FOREIGN KEY (stay_id) REFERENCES stays(id) ON DELETE CASCADE,
  CONSTRAINT fk_credentials_participant
    FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
  INDEX idx_credentials_stay (stay_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Consumo (propostas UC01)
-- ---------------------------------------------------------------------------
CREATE TABLE proposals (
  id                VARCHAR(32)  NOT NULL PRIMARY KEY,
  operation_id      VARCHAR(64)  NOT NULL,
  stay_id           VARCHAR(32)  NOT NULL,
  participant_id    VARCHAR(32)  NOT NULL,
  credential_id     VARCHAR(32)  NOT NULL,
  sector            ENUM('Bar da Piscina','Restaurante','Lanchonete') NOT NULL,
  attendant         VARCHAR(80)  NOT NULL,
  total_cents       INT UNSIGNED NOT NULL,
  status            ENUM('aguardando','confirmada','recusada','expirada','cancelada') NOT NULL DEFAULT 'aguardando',
  created_at        BIGINT       NOT NULL,
  expires_at        BIGINT       NOT NULL,
  resolved_at       BIGINT       NULL,
  resolved_via      ENUM('sessao','terminal') NULL,
  CONSTRAINT fk_proposals_stay
    FOREIGN KEY (stay_id) REFERENCES stays(id) ON DELETE CASCADE,
  CONSTRAINT fk_proposals_participant
    FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
  CONSTRAINT fk_proposals_credential
    FOREIGN KEY (credential_id) REFERENCES credentials(id) ON DELETE CASCADE,
  INDEX idx_proposals_stay (stay_id, status),
  UNIQUE KEY uk_proposals_operation (operation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE proposal_items (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  proposal_id   VARCHAR(32)     NOT NULL,
  product_id    VARCHAR(32)     NOT NULL,
  product_name  VARCHAR(120)    NOT NULL,
  unit_price    INT UNSIGNED    NOT NULL,
  qty           INT UNSIGNED    NOT NULL DEFAULT 1,
  note          VARCHAR(255)    NULL,
  CONSTRAINT fk_proposal_items_proposal
    FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE,
  CONSTRAINT fk_proposal_items_product
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  INDEX idx_proposal_items_proposal (proposal_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Lançamentos e pagamentos (RF24)
-- ---------------------------------------------------------------------------
CREATE TABLE entries (
  id              VARCHAR(32)  NOT NULL PRIMARY KEY,
  stay_id         VARCHAR(32)  NOT NULL,
  kind            ENUM('debito','estorno') NOT NULL,
  proposal_id     VARCHAR(32)  NULL,
  participant_id  VARCHAR(32)  NULL,
  amount_cents    INT UNSIGNED NOT NULL,
  description     VARCHAR(255) NOT NULL,
  author          VARCHAR(80)  NOT NULL,
  reason          VARCHAR(255) NULL,
  recorded_at     BIGINT       NOT NULL,
  CONSTRAINT fk_entries_stay
    FOREIGN KEY (stay_id) REFERENCES stays(id) ON DELETE CASCADE,
  CONSTRAINT fk_entries_proposal
    FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE SET NULL,
  CONSTRAINT fk_entries_participant
    FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE SET NULL,
  INDEX idx_entries_stay (stay_id, recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payments (
  id            VARCHAR(32)  NOT NULL PRIMARY KEY,
  stay_id       VARCHAR(32)  NOT NULL,
  amount_cents  INT UNSIGNED NOT NULL,
  method        ENUM('Pix','Crédito','Débito','Dinheiro') NOT NULL,
  staff_name    VARCHAR(80)  NOT NULL,
  recorded_at   BIGINT       NOT NULL,
  CONSTRAINT fk_payments_stay
    FOREIGN KEY (stay_id) REFERENCES stays(id) ON DELETE CASCADE,
  INDEX idx_payments_stay (stay_id, recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Equipe e auditoria (opcional / API futura)
-- ---------------------------------------------------------------------------
CREATE TABLE staff_users (
  id            VARCHAR(32)  NOT NULL PRIMARY KEY,
  login         VARCHAR(40)  NOT NULL,
  display_name  VARCHAR(80)  NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('recepcao','atendente','admin') NOT NULL DEFAULT 'atendente',
  active        TINYINT(1)   NOT NULL DEFAULT 1,
  UNIQUE KEY uk_staff_login (login)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE audit_log (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  actor         VARCHAR(80)     NOT NULL,
  message       VARCHAR(500)    NOT NULL,
  recorded_at   BIGINT          NOT NULL,
  INDEX idx_audit_at (recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Dados iniciais (amostra)
-- ---------------------------------------------------------------------------
INSERT INTO products (id, name, category, description, price_cents, available, sector) VALUES
  ('p1',  'Cerveja long neck', 'Bebidas', 'Pilsen 355 ml, bem gelada', 1400, 1, 'Bar da Piscina'),
  ('p6',  'Caipirinha',        'Drinks',  'Cachaça artesanal e limão', 2600, 1, 'Bar da Piscina'),
  ('p12', 'Filé à parmegiana', 'Pratos',  'Arroz, fritas e salada',    7900, 1, 'Restaurante'),
  ('l07', 'Hot dog completo',  'Porções', 'Pão, salsicha, purê e batata palha', 2800, 1, 'Lanchonete');

INSERT INTO staff_users (id, login, display_name, password_hash, role) VALUES
  ('st_admin', 'admin', 'Administrador', 'demo:1234', 'admin'),
  ('st_lucas', 'lucas', 'Lucas (bar)',   'demo:1234', 'atendente');

SELECT 'Schema recanto aplicado.' AS resultado;
