# Granja Hogar — Inventario

App móvil y API REST para que el personal de Granja Hogar registre entradas (donaciones y compras), salidas y el inventario, y genere reportes en PDF/Excel.

| Parte | Tecnología |
|---|---|
| `frontend/` | React Native (Expo SDK 54, expo-router, NativeWind) |
| `backend/` | Node.js, Express 5, MySQL (`mysql2`), JWT |

La API sigue capas MVC: `routes/` (validación + permisos) → `controllers/` → `services/` (reglas de negocio) → `models/` (SQL), con `valueObjects/` para dar forma a los datos.

## Requisitos

- Node.js 20+
- MySQL 8+
- Expo Go en el teléfono (o un simulador)

## 1. Base de datos

```bash
mysql -u root -p < backend/db/schema.sql
mysql -u root -p < backend/db/seed.sql
```

`schema.sql` **borra y vuelve a crear** las tablas. Úsalo solo en una base nueva o de desarrollo.
`seed.sql` carga los catálogos que la app usa por ID (permisos, unidades, categorías, departamentos, motivos) y un usuario de desarrollo `admin` / `admin12345`. Cámbialo antes de usar datos reales.

## 2. API

```bash
cd backend
cp .env.example .env   # llena DB_* y un JWT_SECRET largo y aleatorio
npm install
npm run dev            # http://localhost:8080
npm test               # 160+ pruebas unitarias, no necesitan base de datos
```

Las pruebas de carga en `__tests__/performance/` usan [k6](https://k6.io) y se corren aparte (`k6 run archivo.js`).

## 3. App móvil

```bash
cd frontend
cp .env.example .env   # API_BASE_URL = IP de tu computadora en la red local, puerto de la API
npm install
npx expo start
```

En un teléfono físico usa la IP de tu computadora (no `localhost`). Después de cambiar `.env`, reinicia con `npx expo start -c`.

## Cómo se mueve el stock

El stock de un producto (`products.actual_stock`) solo cambia con **entradas** y **salidas**; editar un producto no lo modifica.
Cada entrada/salida, su cambio de stock y su notificación se guardan en una sola transacción, y una salida solo se registra si alcanza el stock (`UPDATE … WHERE actual_stock >= ?`), así dos personas registrando salidas al mismo tiempo no pueden dejarlo en negativo.

## Permisos

| Permiso | Permite |
|---|---|
| `admin` | todo |
| `products-entries` | registrar entradas |
| `products-outs` | registrar salidas |
| `generate-reports` | reportes PDF/Excel |
| `edit-catalog` | crear, editar y eliminar productos |
| `manage-users` | usuarios y sus permisos |
