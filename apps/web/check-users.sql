-- Script para verificar usuarios sincronizados desde Clerk
-- Ejecutar en Supabase SQL Editor o con psql

SELECT
  id,
  "clerkUserId",
  email,
  "firstName",
  "lastName",
  role,
  status,
  "createdAt"
FROM "User"
ORDER BY "createdAt" DESC
LIMIT 10;
