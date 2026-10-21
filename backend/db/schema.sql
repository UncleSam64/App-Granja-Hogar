-- Granja Hogar — database schema
--
-- Reconstructed from the queries in backend/models/*.js (the repo did not include one).
-- Use it for local development and tests. If you already have a production database,
-- compare it with this file before running anything against it: this script drops tables.

CREATE DATABASE IF NOT EXISTS granja_hogar CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE granja_hogar;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS report_includes, reports, notifications, product_outs, product_entries,
  products, user_permissions, users, permissions, categories, units, departments, reasons;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE permissions (
  id         INT UNSIGNED PRIMARY KEY,
  permission VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE user_permissions (
  user_id       INT UNSIGNED NOT NULL,
  permission_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (user_id, permission_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (permission_id) REFERENCES permissions(id)
) ENGINE=InnoDB;

CREATE TABLE categories (
  id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE units (
  id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE departments (
  id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE reasons (
  id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE products (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id  INT UNSIGNED NOT NULL,
  unit_id      INT UNSIGNED NOT NULL,
  name         VARCHAR(150) NOT NULL,
  perishable   BOOLEAN NOT NULL DEFAULT FALSE,
  min_stock    INT NOT NULL DEFAULT 0,
  max_stock    INT NOT NULL DEFAULT 0,
  actual_stock DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at   TIMESTAMP NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (unit_id) REFERENCES units(id),
  CONSTRAINT chk_products_stock CHECK (actual_stock >= 0)
) ENGINE=InnoDB;

CREATE TABLE product_entries (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id  INT UNSIGNED NOT NULL,
  user_id     INT UNSIGNED NOT NULL,
  unit_id     INT UNSIGNED NOT NULL,
  is_donation BOOLEAN NOT NULL,
  quantity    DECIMAL(12,2) NOT NULL,
  cost        DECIMAL(12,2) NULL,
  exp_date    DATE NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (unit_id) REFERENCES units(id),
  INDEX idx_entries_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE product_outs (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NOT NULL,
  product_id    INT UNSIGNED NOT NULL,
  reason_id     INT UNSIGNED NOT NULL,
  department_id INT UNSIGNED NOT NULL,
  unit_id       INT UNSIGNED NOT NULL,
  quantity      DECIMAL(12,2) NOT NULL,
  notes         VARCHAR(255) NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (reason_id) REFERENCES reasons(id),
  FOREIGN KEY (department_id) REFERENCES departments(id),
  FOREIGN KEY (unit_id) REFERENCES units(id),
  INDEX idx_outs_created (created_at)
) ENGINE=InnoDB;

-- type_id values used by the services: 1 product created, 2 deleted, 3 edited,
-- 4 entry, 5 out, 9 user created, 10 user edited/deleted, 13 report generated.
CREATE TABLE notifications (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id          INT UNSIGNED NULL,
  product_id       INT UNSIGNED NULL,
  product_entry_id INT UNSIGNED NULL,
  product_out_id   INT UNSIGNED NULL,
  content          VARCHAR(500) NOT NULL,
  type_id          INT UNSIGNED NOT NULL,
  permission_id    INT UNSIGNED NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (product_entry_id) REFERENCES product_entries(id),
  FOREIGN KEY (product_out_id) REFERENCES product_outs(id),
  FOREIGN KEY (permission_id) REFERENCES permissions(id),
  INDEX idx_notifications_perm_date (permission_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE reports (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      INT UNSIGNED NOT NULL,
  initial_date DATE NOT NULL,
  end_date     DATE NOT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- include_id: 1 inventory, 2 entries, 3 outs
CREATE TABLE report_includes (
  report_id  INT UNSIGNED NOT NULL,
  include_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (report_id, include_id),
  FOREIGN KEY (report_id) REFERENCES reports(id)
) ENGINE=InnoDB;
