-- Lookup values the app hard-codes by ID (see backend/utils and frontend/utils),
-- plus one admin account for local development.
USE granja_hogar;

INSERT INTO permissions (id, permission) VALUES
  (1, 'admin'), (2, 'products-entries'), (3, 'products-outs'),
  (4, 'generate-reports'), (5, 'edit-catalog'), (6, 'manage-users');

INSERT INTO units (id, name) VALUES (1, 'Kg'), (2, 'L'), (3, 'Pcs');

INSERT INTO categories (id, name) VALUES
  (1, 'Material de Oficina'), (2, 'Alimentos y Aseo'), (3, 'Papelería'),
  (4, 'Material de Cómputo'), (5, 'Material de Ferretería');

INSERT INTO departments (id, name) VALUES (1, 'Comedor'), (2, 'Cocina'), (3, 'Administración');

INSERT INTO reasons (id, name) VALUES
  (1, 'Venta'), (2, 'Uso'), (3, 'Donación'), (4, 'Ajuste'), (5, 'Otro');

-- Development login: admin / admin12345 — change it before using real data.
INSERT INTO users (id, name, last_name, username, password_hash) VALUES
  (1, 'admin', 'granja hogar', 'admin', '$2b$10$t0ztYR7aCQwyy/eOHyUZiOPwY0.WatVkmFtPejkSDLj0/zC4YDfVO');
INSERT INTO user_permissions (user_id, permission_id) VALUES (1, 1);
