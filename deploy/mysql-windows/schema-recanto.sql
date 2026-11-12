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
  price_cents   INT UNSIGNED NOT NUaLL,
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
-- Dados iniciais (alinhados ao seed da aplicação — hotel em operação)
-- Timestamps em ms (Unix); check-in/out relativos a CURDATE().
-- ---------------------------------------------------------------------------
SET @now_ms = ROUND(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000);
SET @t0_ms = @now_ms - 5 * 3600000;
SET @opened_yesterday_ms = @now_ms - 22 * 3600000;
SET @opened_renata_ms = @now_ms - 45 * 60 * 1000;
SET @check_in = CURDATE();
SET @check_out_short = DATE_ADD(CURDATE(), INTERVAL 2 DAY);
SET @check_out_long = DATE_ADD(CURDATE(), INTERVAL 4 DAY);
SET @check_in_yesterday = DATE_SUB(CURDATE(), INTERVAL 1 DAY);
SET @day_use_end_ms = ROUND(UNIX_TIMESTAMP(TIMESTAMP(CURDATE(), '20:00:00')) * 1000);
SET @proposal_ttl_ms = 300000;

INSERT INTO products (id, name, category, description, price_cents, available, sector) VALUES
  ('p1',  'Cerveja long neck', 'Bebidas', 'Pilsen 355 ml, bem gelada', 1400, 1, 'Bar da Piscina'),
  ('p2',  'Água de coco', 'Bebidas', 'Natural, servida no coco', 1200, 1, 'Bar da Piscina'),
  ('p4',  'Suco natural', 'Bebidas', 'Laranja, abacaxi ou maracujá', 1300, 1, 'Bar da Piscina'),
  ('p5',  'Água mineral', 'Bebidas', '500 ml com ou sem gás', 600, 1, 'Bar da Piscina'),
  ('b06', 'Chopp 300 ml', 'Bebidas', 'Cerveja artesanal local', 1600, 1, 'Bar da Piscina'),
  ('b07', 'Energético', 'Bebidas', 'Lata 250 ml', 1200, 1, 'Bar da Piscina'),
  ('b08', 'Ice tea pêssego', 'Bebidas', 'Garrafa 500 ml', 900, 1, 'Bar da Piscina'),
  ('p6',  'Caipirinha', 'Drinks', 'Cachaça artesanal e limão', 2600, 1, 'Bar da Piscina'),
  ('p7',  'Piña colada', 'Drinks', 'Rum, coco e abacaxi', 3200, 1, 'Bar da Piscina'),
  ('p8',  'Mojito', 'Drinks', 'Hortelã fresca e rum branco', 2900, 0, 'Bar da Piscina'),
  ('b09', 'Gin tônica', 'Drinks', 'Gin nacional, tônica e limão', 3400, 1, 'Bar da Piscina'),
  ('b10', 'Aperol spritz', 'Drinks', 'Espumante, Aperol e laranja', 3600, 1, 'Bar da Piscina'),
  ('b11', 'Caipiroska frutas vermelhas', 'Drinks', 'Vodka, morango e framboesa', 2800, 1, 'Bar da Piscina'),
  ('b12', 'Batida de maracujá', 'Drinks', 'Cachaça, polpa e leite condensado', 2400, 1, 'Bar da Piscina'),
  ('p9',  'Batata frita', 'Porções', '500 g com páprica defumada', 3800, 1, 'Bar da Piscina'),
  ('b13', 'Pastel misto (3 un.)', 'Porções', 'Carne, queijo e camarão', 3200, 1, 'Bar da Piscina'),
  ('b14', 'Camarão alho e óleo', 'Porções', 'Porção individual, torrada', 6200, 1, 'Bar da Piscina'),
  ('b15', 'Tábua de frios', 'Porções', 'Queijos, salame e azeitonas', 4800, 1, 'Bar da Piscina'),
  ('b16', 'Amendoim crocante', 'Porções', 'Temperado com alecrim', 1200, 1, 'Bar da Piscina'),
  ('p12', 'Filé à parmegiana', 'Pratos', 'Arroz, fritas e salada', 7900, 1, 'Restaurante'),
  ('p13', 'Moqueca capixaba', 'Pratos', 'Para dois, com pirão', 13800, 1, 'Restaurante'),
  ('p14', 'Salada tropical', 'Pratos', 'Folhas, manga e castanhas', 4200, 1, 'Restaurante'),
  ('r04', 'Risoto de camarão', 'Pratos', 'Arborio, bisque e limão siciliano', 9200, 1, 'Restaurante'),
  ('r05', 'Peixe grelhado', 'Pratos', 'Filé do dia, legumes e arroz', 8600, 1, 'Restaurante'),
  ('r06', 'Frango grelhado', 'Pratos', 'Peito orgânico, purê e farofa', 6800, 1, 'Restaurante'),
  ('r07', 'Penne ao molho pesto', 'Pratos', 'Tomate confit e parmesão', 6400, 1, 'Restaurante'),
  ('r08', 'Escondidinho de abóbora', 'Pratos', 'Opção vegetariana, coalhada seca', 5200, 1, 'Restaurante'),
  ('r09', 'Picanha na pedra', 'Pratos', '300 g, arroz, feijão e vinagrete', 9800, 1, 'Restaurante'),
  ('r10', 'Sopa do chef', 'Pratos', 'Receita do dia, pão artesanal', 3800, 1, 'Restaurante'),
  ('p20', 'Suco do dia', 'Bebidas', 'Jarra individual 400 ml', 1500, 1, 'Restaurante'),
  ('p21', 'Água com gás', 'Bebidas', '510 ml — mesa', 700, 1, 'Restaurante'),
  ('r11', 'Vinho tinto taça', 'Bebidas', 'Seleção da casa 150 ml', 2800, 1, 'Restaurante'),
  ('r12', 'Vinho branco taça', 'Bebidas', 'Leve e frutado 150 ml', 2600, 1, 'Restaurante'),
  ('r13', 'Cerveja artesanal 600 ml', 'Bebidas', 'IPA ou Pilsen', 2200, 1, 'Restaurante'),
  ('r14', 'Água sem gás', 'Bebidas', 'Garrafa 510 ml', 650, 1, 'Restaurante'),
  ('p16', 'Pudim de leite', 'Sobremesas', 'Receita da casa', 1600, 0, 'Restaurante'),
  ('r15', 'Petit gâteau', 'Sobremesas', 'Chocolate 70%, sorvete de creme', 2800, 1, 'Restaurante'),
  ('r16', 'Cheesecake de frutas vermelhas', 'Sobremesas', 'Base crocante', 2400, 1, 'Restaurante'),
  ('r17', 'Mousse de maracujá', 'Sobremesas', 'Sobremesa leve', 1800, 1, 'Restaurante'),
  ('r18', 'Café expresso', 'Bebidas', 'Duplo ou simples', 900, 1, 'Restaurante'),
  ('p3',  'Refrigerante lata', 'Bebidas', '350 ml, diversos sabores', 800, 1, 'Lanchonete'),
  ('p22', 'Água mineral', 'Bebidas', '500 ml', 600, 1, 'Lanchonete'),
  ('l03', 'Suco de caixa 300 ml', 'Bebidas', 'Uva, pêssego ou maçã', 700, 1, 'Lanchonete'),
  ('l04', 'Milkshake chocolate', 'Bebidas', '400 ml, chantilly', 2200, 1, 'Lanchonete'),
  ('l05', 'Café com leite', 'Bebidas', 'Copo 300 ml', 1000, 1, 'Lanchonete'),
  ('l06', 'Chocolate quente', 'Bebidas', 'Cacau 50%, marshmallow', 1400, 1, 'Lanchonete'),
  ('p10', 'Isca de tilápia', 'Porções', 'Empanada, molho tártaro', 5600, 1, 'Lanchonete'),
  ('p11', 'Mandioca frita', 'Porções', 'Crocante com manteiga de garrafa', 3400, 1, 'Lanchonete'),
  ('l07', 'Hot dog completo', 'Porções', 'Pão, salsicha, purê e batata palha', 2800, 1, 'Lanchonete'),
  ('l08', 'Misto quente', 'Porções', 'Pão de forma, presunto e queijo', 1800, 1, 'Lanchonete'),
  ('l09', 'Coxinha de frango', 'Porções', '2 unidades', 1600, 1, 'Lanchonete'),
  ('l10', 'Sanduíche natural', 'Porções', 'Frango, cream cheese e alface', 2400, 1, 'Lanchonete'),
  ('l11', 'Pizza fatia margherita', 'Porções', 'Massa fina, molho e muçarela', 2200, 1, 'Lanchonete'),
  ('l12', 'Nachos com cheddar', 'Porções', 'Totopos, queijo e guacamole', 3600, 1, 'Lanchonete'),
  ('p15', 'Açaí 500 ml', 'Sobremesas', 'Banana, granola e mel', 2400, 1, 'Lanchonete'),
  ('l13', 'Sorvete 2 bolas', 'Sobremesas', 'Creme, chocolate ou morango', 1600, 1, 'Lanchonete'),
  ('l14', 'Brownie com sorvete', 'Sobremesas', 'Brownie quente e calda', 2200, 1, 'Lanchonete'),
  ('l15', 'Salada de frutas', 'Sobremesas', 'Taça individual', 1400, 1, 'Lanchonete');

INSERT INTO staff_users (id, login, display_name, password_hash, role) VALUES
  ('st_admin', 'admin', 'Administrador', 'demo:1234', 'admin'),
  ('st_lucas', 'lucas', 'Lucas (bar)',   'demo:1234', 'atendente');

-- Estadias (titular definido após participantes)
INSERT INTO stays (id, type, room, holder_id, status, check_in_date, check_out_date, day_use_ends_at, opened_at, closed_at) VALUES
  ('sty_208', 'hospedagem', '208', NULL, 'aberta', @check_in, @check_out_long, NULL, @opened_yesterday_ms, NULL),
  ('sty_203', 'hospedagem', '203', NULL, 'aberta', @check_in, @check_out_short, NULL, @t0_ms, NULL),
  ('sty_du1', 'dayuse',     NULL,  NULL, 'aberta', NULL, NULL, @day_use_end_ms, @t0_ms + 600000, NULL),
  ('sty_du2', 'dayuse',     NULL,  NULL, 'aberta', NULL, NULL, @day_use_end_ms, @t0_ms, NULL),
  ('sty_fict','dayuse',     NULL,  NULL, 'aberta', NULL, NULL, @day_use_end_ms, @t0_ms + 300000, NULL),
  ('sty_210', 'hospedagem', '210', NULL, 'aberta', @check_in, @check_out_short, NULL, @opened_renata_ms, NULL),
  ('sty_204', 'hospedagem', '204', NULL, 'aberta', @check_in_yesterday, @check_out_short, NULL, @opened_yesterday_ms, NULL);

INSERT INTO participants (id, stay_id, name, document, phone) VALUES
  ('par_rafael', 'sty_208', 'Rafael Souza', '123.456.789-00', '(27) 99911-2200'),
  ('par_ana',    'sty_208', 'Ana Souza', NULL, NULL),
  ('par_clara',  'sty_208', 'Clara Souza', NULL, NULL),
  ('par_joao',   'sty_203', 'João Pereira', NULL, '(27) 98822-3344'),
  ('par_marina', 'sty_du1', 'Marina Lima', NULL, NULL),
  ('par_pedro',  'sty_du2', 'Pedro Almeida', NULL, NULL),
  ('par_fict',   'sty_fict','Cliente Fictício', NULL, NULL),
  ('par_renata', 'sty_210', 'Renata', NULL, '(27) 99700-1122'),
  ('par_helo',   'sty_204', 'Heloísa Martins', NULL, NULL),
  ('par_beto',   'sty_204', 'Roberto Martins', NULL, NULL);

UPDATE stays SET holder_id = 'par_rafael' WHERE id = 'sty_208';
UPDATE stays SET holder_id = 'par_joao'   WHERE id = 'sty_203';
UPDATE stays SET holder_id = 'par_marina' WHERE id = 'sty_du1';
UPDATE stays SET holder_id = 'par_pedro'  WHERE id = 'sty_du2';
UPDATE stays SET holder_id = 'par_fict'   WHERE id = 'sty_fict';
UPDATE stays SET holder_id = 'par_renata' WHERE id = 'sty_210';
UPDATE stays SET holder_id = 'par_helo'   WHERE id = 'sty_204';

INSERT INTO credentials (id, code, stay_id, participant_id, medium, status, pin_hash, activation_code, issued_at) VALUES
  ('crd_rafael', 'RDA-R4F4-208A', 'sty_208', 'par_rafael', 'celular',  'ativa', 'demo:1234', NULL,     @opened_yesterday_ms),
  ('crd_ana',    'RDA-AN4S-208B', 'sty_208', 'par_ana',    'pulseira', 'ativa', 'demo:1234', NULL,     @opened_yesterday_ms),
  ('crd_clara',  'RDA-CL4R-208C', 'sty_208', 'par_clara',  'pulseira', 'ativa', NULL,      '482913', @opened_yesterday_ms),
  ('crd_joao',   'RDA-J04O-203A', 'sty_203', 'par_joao',   'celular',  'ativa', 'demo:1234', NULL,     @t0_ms),
  ('crd_marina', 'RDA-M4R1-DU01', 'sty_du1', 'par_marina', 'pulseira', 'ativa', 'demo:1234', NULL,     @t0_ms + 600000),
  ('crd_pedro',  'RDA-P3DR-DU02', 'sty_du2', 'par_pedro',  'celular',  'ativa', 'demo:1234', NULL,     @t0_ms),
  ('crd_fict',   'RDA-F1CT-DEMO', 'sty_fict','par_fict',   'celular',  'ativa', 'demo:5678', NULL,     @t0_ms + 300000),
  ('crd_renata', 'RDA-R3N4-210A', 'sty_210', 'par_renata', 'celular',  'ativa', 'demo:2026', NULL,     @opened_renata_ms),
  ('crd_helo',   'RDA-H3L0-204A', 'sty_204', 'par_helo',   'celular',  'ativa', 'demo:1234', NULL,     @opened_yesterday_ms),
  ('crd_beto',   'RDA-B3T0-204B', 'sty_204', 'par_beto',   'pulseira', 'ativa', 'demo:1234', NULL,     @opened_yesterday_ms);

INSERT INTO proposals (id, operation_id, stay_id, participant_id, credential_id, sector, attendant, total_cents, status, created_at, expires_at, resolved_at, resolved_via) VALUES
  ('prp_pend_marina', 'op-marina-bar-1',  'sty_du1', 'par_marina', 'crd_marina', 'Bar da Piscina', 'Lucas (bar)',       5200, 'aguardando', @now_ms - 90000,  @now_ms - 90000 + @proposal_ttl_ms, NULL, NULL),
  ('prp_pend_ana',    'op-ana-lanche-1',  'sty_208', 'par_ana',    'crd_ana',    'Lanchonete',     'Bia (lanchonete)',  2400, 'aguardando', @now_ms - 45000,  @now_ms - 45000 + @proposal_ttl_ms, NULL, NULL),
  ('prp_conf_joao',   'op-joao-rest-1',   'sty_203', 'par_joao',   'crd_joao',   'Restaurante',    'Carla (restaurante)', 6800, 'confirmada', @now_ms - 3600000, @now_ms - 3600000 + @proposal_ttl_ms, @now_ms - 3500000, 'sessao'),
  ('prp_conf_renata', 'op-renata-bar-1',  'sty_210', 'par_renata', 'crd_renata', 'Bar da Piscina', 'Lucas (bar)',       4000, 'confirmada', @now_ms - 2400000, @now_ms - 2400000 + @proposal_ttl_ms, @now_ms - 2300000, 'terminal'),
  ('prp_conf_rafael', 'op-rafael-bar-2',  'sty_208', 'par_rafael', 'crd_rafael', 'Bar da Piscina', 'Lucas (bar)',       6800, 'confirmada', @now_ms - 1800000, @now_ms - 1800000 + @proposal_ttl_ms, @now_ms - 1750000, 'sessao'),
  ('prp_conf_pedro',  'op-pedro-lanche-1','sty_du2', 'par_pedro',  'crd_pedro',  'Lanchonete',     'Bia (lanchonete)',  2400, 'confirmada', @now_ms - 5400000, @now_ms - 5400000 + @proposal_ttl_ms, @now_ms - 5300000, 'terminal');

INSERT INTO proposal_items (proposal_id, product_id, product_name, unit_price, qty, note) VALUES
  ('prp_pend_marina', 'p6',  'Caipirinha', 2600, 2, NULL),
  ('prp_pend_ana',    'l10', 'Sanduíche natural', 2400, 1, NULL),
  ('prp_conf_joao',   'r06', 'Frango grelhado', 6800, 1, NULL),
  ('prp_conf_renata', 'p1',  'Cerveja long neck', 1400, 2, NULL),
  ('prp_conf_renata', 'p2',  'Água de coco', 1200, 1, NULL),
  ('prp_conf_rafael', 'b09', 'Gin tônica', 3400, 2, NULL),
  ('prp_conf_pedro',  'p15', 'Açaí 500 ml', 2400, 1, NULL);

INSERT INTO entries (id, stay_id, kind, proposal_id, participant_id, amount_cents, description, author, reason, recorded_at) VALUES
  ('ent_seed1',  'sty_208', 'debito', NULL, 'par_rafael', 5600,  'Bar da Piscina · 4× Cerveja long neck', 'Lucas (bar)', NULL, @t0_ms + 3600000),
  ('ent_seed1b', 'sty_208', 'debito', NULL, 'par_rafael', 1200,  'Bar da Piscina · 1× Água de coco', 'Lucas (bar)', NULL, @t0_ms + 4200000),
  ('ent_seed1c', 'sty_208', 'debito', NULL, 'par_rafael', 3800,  'Restaurante · 1× Risoto de camarão', 'Lucas (bar)', NULL, @t0_ms + 7200000),
  ('ent_seed1d', 'sty_208', 'debito', NULL, 'par_rafael', 900,   'Lanchonete · 1× Sanduíche natural', 'Bia (lanchonete)', NULL, @t0_ms + 9000000),
  ('ent_seed1e', 'sty_208', 'debito', NULL, 'par_rafael', 1600,  'Bar da Piscina · 2× Caipirinha', 'Lucas (bar)', NULL, @t0_ms + 10800000),
  ('ent_seed2',  'sty_208', 'debito', NULL, 'par_clara',  2400,  'Lanchonete · 1× Açaí 500 ml', 'Bia (lanchonete)', NULL, @t0_ms + 5400000),
  ('ent_prp_joao',   'sty_203', 'debito', 'prp_conf_joao',   'par_joao',   6800,  'Restaurante · 1× Frango grelhado', 'Carla (restaurante)', NULL, @now_ms - 3500000),
  ('ent_prp_renata', 'sty_210', 'debito', 'prp_conf_renata', 'par_renata', 4000,  'Bar da Piscina · 2× Cerveja long neck, 1× Água de coco', 'Lucas (bar)', NULL, @now_ms - 2300000),
  ('ent_prp_rafael', 'sty_208', 'debito', 'prp_conf_rafael', 'par_rafael', 6800,  'Bar da Piscina · 2× Gin tônica', 'Lucas (bar)', NULL, @now_ms - 1750000),
  ('ent_prp_pedro',  'sty_du2', 'debito', 'prp_conf_pedro',  'par_pedro',  2400,  'Lanchonete · 1× Açaí 500 ml', 'Bia (lanchonete)', NULL, @now_ms - 5300000),
  ('ent_helo',       'sty_204', 'debito', NULL, 'par_helo', 13800, 'Restaurante · 1× Moqueca capixaba', 'Carla (restaurante)', NULL, @now_ms - 4000000);

INSERT INTO payments (id, stay_id, amount_cents, method, staff_name, recorded_at) VALUES
  ('pay_joao_1', 'sty_203', 5000,  'Pix',    'Recepção', @now_ms - 1200000),
  ('pay_208_1',  'sty_208', 10000, 'Crédito','Recepção', @now_ms - 800000);

INSERT INTO audit_log (actor, message, recorded_at) VALUES
  ('Lucas (bar)', 'Proposta prp_pend_marina enviada (day use)', @now_ms - 90000),
  ('cliente', 'Proposta prp_conf_renata confirmada · débito lançado', @now_ms - 2300000),
  ('Recepção', 'Pagamento registrado', @now_ms - 1200000);

SELECT 'Schema recanto aplicado com dados de demonstração.' AS resultado;
