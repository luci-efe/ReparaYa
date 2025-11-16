#!/bin/bash
# Script para configurar Supabase en ReparaYa
# Uso: ./setup-supabase.sh

set -e

echo "======================================"
echo "🔧 Configuración de Supabase - ReparaYa"
echo "======================================"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verificar que estamos en el directorio correcto
if [ ! -f "prisma/schema.prisma" ]; then
    echo -e "${RED}❌ Error: No se encontró prisma/schema.prisma${NC}"
    echo "Asegúrate de ejecutar este script desde apps/web/"
    exit 1
fi

echo -e "${BLUE}📋 Este script te ayudará a configurar las credenciales de Supabase${NC}"
echo ""
echo "Necesitas obtener las siguientes credenciales desde Supabase Dashboard:"
echo "  1. Connection Pooling URL (para DATABASE_URL)"
echo "  2. Direct Connection URL (para DIRECT_URL)"
echo ""
echo -e "${YELLOW}📍 Pasos para obtener las credenciales:${NC}"
echo ""
echo "  1. Ir a: https://supabase.com/dashboard/projects"
echo "  2. Seleccionar proyecto: vmsqbguwjjpusedhapqo"
echo "  3. Ir a: Settings → Database"
echo "  4. Buscar sección 'Connection string'"
echo "  5. Copiar ambas URLs (Pooling y Direct)"
echo ""
read -p "¿Ya tienes las credenciales? (y/n): " ready

if [ "$ready" != "y" ] && [ "$ready" != "Y" ]; then
    echo ""
    echo -e "${BLUE}👉 Abre esta URL en tu navegador:${NC}"
    echo "   https://supabase.com/dashboard/project/vmsqbguwjjpusedhapqo/settings/database"
    echo ""
    echo "Ejecuta este script nuevamente cuando tengas las credenciales."
    exit 0
fi

echo ""
echo -e "${GREEN}✅ Perfecto, vamos a configurar las variables${NC}"
echo ""

# Pedir DATABASE_URL (pooler)
echo -e "${BLUE}🔹 Paso 1: Connection Pooling URL${NC}"
echo "Esta URL usa el pooler de Supabase (puerto 6543)"
echo "Formato ejemplo:"
echo "  postgresql://postgres.vmsqbguwjjpusedhapqo:[PASSWORD]@aws-1-us-west-1.pooler.supabase.com:6543/postgres"
echo ""
read -p "Ingresa DATABASE_URL: " DATABASE_URL

# Pedir DIRECT_URL
echo ""
echo -e "${BLUE}🔹 Paso 2: Direct Connection URL${NC}"
echo "Esta URL es la conexión directa (puerto 5432)"
echo "Formato ejemplo:"
echo "  postgresql://postgres.vmsqbguwjjpusedhapqo:[PASSWORD]@aws-1-us-west-1.compute.amazonaws.com:5432/postgres"
echo ""
read -p "Ingresa DIRECT_URL: " DIRECT_URL

# Validar que las URLs no estén vacías
if [ -z "$DATABASE_URL" ] || [ -z "$DIRECT_URL" ]; then
    echo -e "${RED}❌ Error: Las URLs no pueden estar vacías${NC}"
    exit 1
fi

# Crear backup del .env.local actual
if [ -f ".env.local" ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Creando backup de .env.local actual...${NC}"
    cp .env.local ".env.local.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Actualizar .env.local
echo ""
echo -e "${BLUE}📝 Actualizando .env.local...${NC}"

# Leer el contenido actual y actualizar las variables de DB
if [ -f ".env.local" ]; then
    # Eliminar líneas antiguas de DATABASE_URL y DIRECT_URL
    grep -v "^DATABASE_URL=" .env.local | grep -v "^DIRECT_URL=" > .env.local.tmp

    # Agregar nuevas variables al inicio
    {
        echo "# ============================================"
        echo "# DATABASE - SUPABASE"
        echo "# ============================================"
        echo ""
        echo "# Connection Pooling (para runtime - Next.js, tests)"
        echo "DATABASE_URL=\"$DATABASE_URL\""
        echo ""
        echo "# Direct Connection (para migraciones de Prisma)"
        echo "DIRECT_URL=\"$DIRECT_URL\""
        echo ""
        cat .env.local.tmp
    } > .env.local

    rm .env.local.tmp
else
    # Crear nuevo .env.local
    {
        echo "# ============================================"
        echo "# DATABASE - SUPABASE"
        echo "# ============================================"
        echo ""
        echo "DATABASE_URL=\"$DATABASE_URL\""
        echo "DIRECT_URL=\"$DIRECT_URL\""
    } > .env.local
fi

echo -e "${GREEN}✅ Archivo .env.local actualizado${NC}"

# Probar conexión
echo ""
echo -e "${BLUE}🔍 Probando conexión a Supabase...${NC}"
echo ""

# Test 1: Validar schema de Prisma
echo -e "${YELLOW}Test 1: Validando schema de Prisma...${NC}"
if npx prisma validate > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Schema válido${NC}"
else
    echo -e "${RED}❌ Error en el schema${NC}"
    npx prisma validate
    exit 1
fi

# Test 2: Probar conexión con Prisma
echo -e "${YELLOW}Test 2: Probando conexión a la base de datos...${NC}"
if echo "SELECT version();" | npx prisma db execute --stdin > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Conexión exitosa${NC}"
    CONN_SUCCESS=true
else
    echo -e "${RED}❌ Error de conexión${NC}"
    echo "Intenta verificar manualmente con:"
    echo "  npx prisma db execute --stdin <<< 'SELECT 1;'"
    CONN_SUCCESS=false
fi

echo ""
echo "======================================"
echo -e "${GREEN}🎉 Configuración completa${NC}"
echo "======================================"
echo ""

if [ "$CONN_SUCCESS" = true ]; then
    echo -e "${GREEN}✅ Todo listo. Próximos pasos:${NC}"
    echo ""
    echo "  1. Ejecutar migración:"
    echo "     npx prisma migrate dev --name init"
    echo ""
    echo "  2. Verificar tablas creadas:"
    echo "     npx prisma studio"
    echo ""
    echo "  3. Correr tests:"
    echo "     npm run test -- tests/database"
    echo ""
else
    echo -e "${YELLOW}⚠️  Configuración guardada pero la conexión falló${NC}"
    echo ""
    echo "Verifica que:"
    echo "  - La contraseña sea correcta"
    echo "  - La contraseña esté URL-encoded si tiene caracteres especiales"
    echo "  - Las URLs sean exactamente las del Dashboard de Supabase"
    echo ""
    echo "Más información en: SUPABASE_SETUP.md"
fi

echo ""
echo -e "${BLUE}📚 Archivos importantes:${NC}"
echo "  - .env.local (actualizado con credenciales)"
echo "  - .env.local.backup.* (backup del archivo anterior)"
echo "  - SUPABASE_SETUP.md (guía completa)"
echo ""
