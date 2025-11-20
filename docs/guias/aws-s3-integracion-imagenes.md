# Guía de Integración: AWS S3 para Almacenamiento de Imágenes de Servicios

**Módulo:** Servicios del Contratista
**Versión:** 1.0.0
**Fecha:** 2025-11-20
**Estado:** Preparación (Sin implementar aún)

---

## Índice

1. [Introducción](#introducción)
2. [Requisitos Previos](#requisitos-previos)
3. [Configuración de IAM](#configuración-de-iam)
4. [Creación y Configuración del Bucket S3](#creación-y-configuración-del-bucket-s3)
5. [Configuración de CORS](#configuración-de-cors)
6. [Variables de Entorno](#variables-de-entorno)
7. [Flujo de Subida Segura (Presigned URLs)](#flujo-de-subida-segura-presigned-urls)
8. [Validaciones del Lado del Cliente](#validaciones-del-lado-del-cliente)
9. [Buenas Prácticas](#buenas-prácticas)
10. [Pruebas Locales](#pruebas-locales)
11. [Checklist de Verificación](#checklist-de-verificación)
12. [Troubleshooting](#troubleshooting)

---

## Introducción

Esta guía explica cómo configurar AWS S3 para almacenar imágenes de los servicios publicados por contratistas en ReparaYa. La arquitectura utiliza **presigned URLs** para permitir que los clientes suban imágenes directamente a S3 sin exponer credenciales AWS, mientras el backend mantiene control total sobre las validaciones y permisos.

### ¿Por qué Presigned URLs?

- **Seguridad:** Las credenciales AWS nunca se exponen al cliente
- **Performance:** El cliente sube directamente a S3, sin pasar por nuestro servidor (reduce latencia y costos de ancho de banda)
- **Control:** El servidor genera URLs con permisos temporales (1 hora) y valida metadatos antes de autorizar la subida
- **Escalabilidad:** S3 maneja automáticamente el tráfico de subida sin afectar nuestros servidores

### Arquitectura del Flujo

```
┌─────────┐                    ┌─────────────┐                    ┌─────────┐
│ Cliente │                    │  Backend    │                    │   S3    │
│ (React) │                    │ (Next.js)   │                    │  Bucket │
└────┬────┘                    └──────┬──────┘                    └────┬────┘
     │                                │                                 │
     │ 1. POST /api/services/:id/    │                                 │
     │    images/upload-url           │                                 │
     │    { fileName, fileType, size }│                                 │
     ├───────────────────────────────>│                                 │
     │                                │                                 │
     │                                │ 2. Valida metadatos             │
     │                                │    (tipo, tamaño, límites)      │
     │                                │                                 │
     │                                │ 3. Genera presigned PUT URL     │
     │                                │    con expiración de 1 hora     │
     │                                ├────────────────────────────────>│
     │                                │                                 │
     │                                │ 4. Retorna URL firmada          │
     │ 5. { uploadUrl, s3Key,         │                                 │
     │       expiresIn: 3600 }        │                                 │
     │ <───────────────────────────────┤                                │
     │                                │                                 │
     │ 6. PUT a presigned URL         │                                 │
     │    (subida directa)            │                                 │
     ├────────────────────────────────┼────────────────────────────────>│
     │                                │                                 │
     │                                │                          7. 200 OK
     │ 8. 200 OK                      │                                 │
     │ <───────────────────────────────┼─────────────────────────────────┤
     │                                │                                 │
     │ 9. POST /api/services/:id/     │                                 │
     │    images/confirm              │                                 │
     │    { s3Key, s3Url, width, ... }│                                 │
     ├───────────────────────────────>│                                 │
     │                                │                                 │
     │                                │ 10. Guarda metadatos en DB      │
     │                                │                                 │
     │ 11. 201 Created                │                                 │
     │     { imageId, url, ... }      │                                 │
     │ <───────────────────────────────┤                                 │
     │                                │                                 │
```

---

## Requisitos Previos

### 1. Cuenta de AWS

- Cuenta activa de AWS (puedes usar la capa gratuita para desarrollo)
- Acceso a la consola de AWS: https://console.aws.amazon.com/

### 2. AWS CLI (Opcional pero recomendado)

Instalar AWS CLI para ejecutar comandos desde la terminal:

```bash
# macOS (Homebrew)
brew install awscli

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Windows
# Descargar instalador desde: https://awscli.amazonaws.com/AWSCLIV2.msi
```

Verificar instalación:

```bash
aws --version
# Output esperado: aws-cli/2.x.x Python/3.x.x ...
```

### 3. Dependencias del Proyecto

El proyecto ya incluye las dependencias necesarias:

```json
{
  "@aws-sdk/client-s3": "^3.620.0",
  "@aws-sdk/s3-request-presigner": "^3.620.0"
}
```

Si faltan, instalar con:

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

---

## Configuración de IAM

### Paso 1: Crear un Usuario IAM

1. Ir a la consola de AWS IAM: https://console.aws.amazon.com/iam/
2. Navegar a **Users** → **Create user**
3. Configurar:
   - **User name:** `reparaya-s3-uploader`
   - **Access type:** ✅ Programmatic access (Access key ID y Secret access key)
   - **Console access:** ❌ NO seleccionar (no necesita acceso a consola)
4. Click en **Next**

### Paso 2: Asignar Permisos (Política Personalizada)

En lugar de usar políticas administradas (demasiado permisivas), crear una política personalizada:

1. En la pantalla de permisos, seleccionar **Attach policies directly** → **Create policy**
2. En el editor JSON, pegar la siguiente política:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowS3PresignedUrlGeneration",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::reparaya-media-dev/contractor-services/*"
    },
    {
      "Sid": "AllowS3BucketListing",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::reparaya-media-dev",
      "Condition": {
        "StringLike": {
          "s3:prefix": "contractor-services/*"
        }
      }
    }
  ]
}
```

**Explicación de permisos:**
- `s3:PutObject`: Necesario para generar presigned PUT URLs
- `s3:GetObject`: Necesario para verificar que el archivo fue subido correctamente
- `s3:DeleteObject`: Necesario para limpiar imágenes eliminadas por el usuario
- `s3:ListBucket`: Necesario para listar archivos (usado en limpieza de huérfanos)
- **Limitación:** Los permisos solo aplican al prefijo `contractor-services/*` del bucket

3. Nombre de la política: `ReparaYaS3ContractorServicesPolicy`
4. Click en **Create policy**
5. Regresar a la creación del usuario y asignar la política recién creada

### Paso 3: Revisar y Crear Usuario

1. Revisar la configuración
2. Click en **Create user**
3. **⚠️ IMPORTANTE:** Descargar o copiar las credenciales:
   - **Access Key ID:** `AKIA...` (visible siempre)
   - **Secret Access Key:** `wJalr...` (solo visible una vez)
4. Guardar estas credenciales en un lugar seguro (se usarán en las variables de entorno)

**Recomendación de Seguridad:**
- Nunca commitear estas credenciales al repositorio
- Usar AWS Secrets Manager o variables de entorno cifradas en producción
- Rotar las credenciales cada 90 días

---

## Creación y Configuración del Bucket S3

### Paso 1: Crear el Bucket

1. Ir a la consola de S3: https://console.aws.amazon.com/s3/
2. Click en **Create bucket**
3. Configurar:
   - **Bucket name:** `reparaya-media-dev` (debe ser único globalmente)
     - Para staging: `reparaya-media-staging`
     - Para producción: `reparaya-media-prod`
   - **Region:** `us-west-2` (o región más cercana a tus usuarios)
   - **Block Public Access settings:**
     - ✅ Block all public access (mantendremos el bucket privado)
     - El acceso público se gestionará vía presigned URLs, no con permisos de bucket
   - **Bucket Versioning:** ❌ Disable (opcional: habilitar para auditoría)
   - **Default encryption:** ✅ Enable (Server-side encryption with Amazon S3 managed keys - SSE-S3)
4. Click en **Create bucket**

### Paso 2: Configurar Políticas de Bucket (Opcional)

Si necesitas permitir acceso de lectura pública a imágenes (para mostrar en el catálogo sin presigned URLs para GET):

1. Ir a **Bucket** → **Permissions** → **Bucket Policy**
2. Agregar la siguiente política:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::reparaya-media-dev/contractor-services/*"
    }
  ]
}
```

**⚠️ Nota:** Esto hace que las imágenes sean públicas (cualquiera con la URL puede verlas). Si prefieres mantener privacidad total, usa presigned URLs también para lectura.

### Paso 3: Habilitar Versionado (Opcional)

Si quieres mantener historial de cambios en imágenes:

1. Ir a **Bucket** → **Properties** → **Bucket Versioning**
2. Click en **Edit** → **Enable**
3. Guardar cambios

**Ventajas:**
- Permite restaurar versiones anteriores de imágenes
- Útil para auditoría y recuperación ante eliminaciones accidentales

**Desventajas:**
- Incrementa costos de almacenamiento (cada versión consume espacio)

---

## Configuración de CORS

Para permitir que el cliente (navegador) suba imágenes directamente desde una aplicación web, es necesario configurar CORS (Cross-Origin Resource Sharing).

### Paso 1: Configurar CORS en el Bucket

1. Ir a **Bucket** → **Permissions** → **Cross-origin resource sharing (CORS)**
2. Click en **Edit**
3. Pegar la siguiente configuración:

```json
[
  {
    "AllowedHeaders": [
      "*"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://reparaya-dev.vercel.app",
      "https://reparaya.com"
    ],
    "ExposeHeaders": [
      "ETag",
      "x-amz-request-id"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

**Explicación:**
- `AllowedHeaders`: `*` permite cualquier header (necesario para presigned URLs que incluyen headers de autenticación)
- `AllowedMethods`: Métodos HTTP permitidos (PUT es crítico para subidas)
- `AllowedOrigins`: Lista de dominios autorizados para hacer requests cross-origin
  - **⚠️ IMPORTANTE:** Actualizar con los dominios reales de tu aplicación
  - Nunca usar `*` en producción (vulnerabilidad de seguridad)
- `ExposeHeaders`: Headers que el navegador puede leer en la respuesta
- `MaxAgeSeconds`: Tiempo que el navegador cachea la configuración CORS (1 hora)

4. Click en **Save changes**

### Validar Configuración CORS

Usar `curl` para verificar:

```bash
curl -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: PUT" \
  -X OPTIONS \
  https://reparaya-media-dev.s3.us-west-2.amazonaws.com/
```

**Respuesta esperada:**
```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: GET, PUT, POST, DELETE, HEAD
Access-Control-Max-Age: 3600
```

---

## Variables de Entorno

### Variables Requeridas

Agregar las siguientes variables al archivo `.env.local` (desarrollo) y a las configuraciones de Vercel (producción):

```bash
# AWS Configuración General
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=wJalr...

# AWS S3 Buckets
AWS_S3_BUCKET_MEDIA=reparaya-media-dev

# Configuración de Subida de Imágenes
AWS_S3_PRESIGNED_URL_EXPIRY_SECONDS=3600           # 1 hora
AWS_S3_MAX_IMAGE_SIZE_MB=10                         # 10 MB
AWS_S3_MAX_IMAGES_PER_SERVICE=5                     # Máximo 5 imágenes por servicio

# Prefijos de S3 (organización de archivos)
AWS_S3_CONTRACTOR_SERVICE_PREFIX=contractor-services/
```

### Configuración por Ambiente

**Desarrollo (`/.env.local`):**
```bash
AWS_S3_BUCKET_MEDIA=reparaya-media-dev
```

**Staging:**
```bash
AWS_S3_BUCKET_MEDIA=reparaya-media-staging
```

**Producción:**
```bash
AWS_S3_BUCKET_MEDIA=reparaya-media-prod
```

### Validar Variables de Entorno

Crear un script de validación en `/scripts/validate-env.ts`:

```typescript
const requiredEnvVars = [
  'AWS_REGION',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_S3_BUCKET_MEDIA',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

console.log('✅ All required AWS environment variables are set');
```

Ejecutar antes del build:

```bash
npx ts-node scripts/validate-env.ts
```

---

## Flujo de Subida Segura (Presigned URLs)

### Implementación en el Backend

**Archivo:** `src/lib/aws/s3StorageService.ts` (ver TODOs en el archivo existente)

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

export class S3StorageService implements IStorageService {
  private s3Client: S3Client;
  private bucket: string;
  private region: string;

  constructor() {
    this.region = process.env.AWS_REGION || 'us-west-2';
    this.bucket = process.env.AWS_S3_BUCKET_MEDIA!;

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

  async generatePresignedUploadUrl(
    request: PresignedUploadRequest
  ): Promise<PresignedUploadResponse> {
    const command = new PutObjectCommand({
      Bucket: request.bucket,
      Key: request.key,
      ContentType: request.contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: request.expirySeconds || 3600,
    });

    return {
      uploadUrl,
      s3Key: request.key,
      expiresIn: request.expirySeconds || 3600,
    };
  }

  buildServiceImageKey(
    contractorId: string,
    serviceId: string,
    fileName: string
  ): string {
    const uuid = randomUUID().split('-')[0]; // Primeros 8 caracteres
    const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg';
    const sanitizedExt = ext.replace(/[^a-z0-9]/gi, '');
    return `contractor-services/${contractorId}/${serviceId}/${uuid}.${sanitizedExt}`;
  }

  buildPublicUrl(bucket: string, key: string): string {
    // Opción 1: URL directa de S3
    return `https://${bucket}.s3.${this.region}.amazonaws.com/${key}`;

    // Opción 2: CloudFront CDN (si está configurado)
    // const cdnDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
    // if (cdnDomain) {
    //   return `https://${cdnDomain}/${key}`;
    // }
  }
}
```

### Endpoint de API: Generar Presigned URL

**Archivo:** `app/api/services/[id]/images/upload-url/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/modules/auth/utils/requireRole';
import { requestUploadUrlSchema } from '@/modules/services/validators';
import { getStorageService } from '@/lib/aws/s3StorageService';
import { serviceService } from '@/modules/services';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Autenticación
    const user = await requireRole('CONTRACTOR');

    // 2. Validar ownership del servicio
    const service = await serviceService.getService(params.id, user.id);
    if (service.contractorId !== user.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    // 3. Validar request body
    const body = await request.json();
    const validated = requestUploadUrlSchema.parse(body);

    // 4. Validar límite de imágenes
    const currentImageCount = await imageRepository.countByServiceId(params.id);
    if (currentImageCount >= 5) {
      return NextResponse.json(
        { error: 'Límite de imágenes alcanzado (máximo 5)' },
        { status: 400 }
      );
    }

    // 5. Generar S3 key
    const storageService = getStorageService();
    const s3Key = storageService.buildServiceImageKey(
      user.id,
      params.id,
      validated.fileName
    );

    // 6. Generar presigned URL
    const presignedUrl = await storageService.generatePresignedUploadUrl({
      bucket: process.env.AWS_S3_BUCKET_MEDIA!,
      key: s3Key,
      contentType: validated.fileType,
      fileSizeBytes: validated.fileSize,
      expirySeconds: 3600,
    });

    return NextResponse.json(presignedUrl, { status: 200 });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
```

### Cliente (React): Subir Imagen

```typescript
async function uploadServiceImage(
  serviceId: string,
  file: File
): Promise<void> {
  // 1. Solicitar presigned URL al backend
  const response = await fetch(`/api/services/${serviceId}/images/upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get upload URL');
  }

  const { uploadUrl, s3Key, expiresIn } = await response.json();

  // 2. Subir archivo directamente a S3
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error('Failed to upload file to S3');
  }

  // 3. Confirmar subida con el backend (guardar metadatos en DB)
  await fetch(`/api/services/${serviceId}/images/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      s3Key,
      s3Url: `https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET}.s3.${process.env.NEXT_PUBLIC_AWS_REGION}.amazonaws.com/${s3Key}`,
      width: 1200, // Obtener del archivo con Image API
      height: 900,
      altText: 'Descripción de la imagen',
    }),
  });
}
```

---

## Validaciones del Lado del Cliente

### Validaciones Obligatorias Antes de Solicitar Presigned URL

```typescript
function validateImageFile(file: File): { valid: boolean; error?: string } {
  // 1. Validar tipo MIME
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Solo se permiten archivos JPEG, PNG o WebP',
    };
  }

  // 2. Validar tamaño
  const maxSizeBytes = 10 * 1024 * 1024; // 10 MB
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: 'El archivo no debe exceder 10 MB',
    };
  }

  // 3. Validar dimensiones mínimas (opcional, requiere lectura de imagen)
  // Esto se hace de forma asíncrona con una Image API

  return { valid: true };
}
```

### Validar Dimensiones de Imagen (Asíncrono)

```typescript
async function validateImageDimensions(
  file: File
): Promise<{ width: number; height: number; valid: boolean; error?: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      if (img.width < 800 || img.height < 600) {
        resolve({
          width: img.width,
          height: img.height,
          valid: false,
          error: 'La imagen debe tener al menos 800x600 píxeles',
        });
      } else {
        resolve({
          width: img.width,
          height: img.height,
          valid: true,
        });
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: 0,
        height: 0,
        valid: false,
        error: 'No se pudo leer la imagen',
      });
    };

    img.src = url;
  });
}
```

---

## Buenas Prácticas

### 1. Seguridad

- ✅ **Nunca exponer credenciales AWS en el cliente**
- ✅ **Usar presigned URLs con expiración corta (1 hora)**
- ✅ **Validar MIME types en el servidor** (el cliente puede mentir)
- ✅ **Limitar tamaño de archivos** (10 MB para imágenes)
- ✅ **Usar políticas IAM restrictivas** (solo permisos necesarios)
- ✅ **Habilitar cifrado en reposo (SSE-S3)** en el bucket
- ✅ **Rotar credenciales cada 90 días**
- ✅ **Auditar accesos con CloudTrail** (opcional en producción)

### 2. Performance

- ✅ **Subir directamente a S3** (no pasar por el backend)
- ✅ **Usar CloudFront CDN** para lectura de imágenes (reduce latencia)
- ✅ **Habilitar compresión automática** con Lambda@Edge (opcional)
- ✅ **Lazy loading de imágenes** en el frontend
- ✅ **Usar imágenes responsive** (múltiples resoluciones)

### 3. Costos

- ✅ **Implementar lifecycle policies** para eliminar archivos huérfanos (después de 7 días)
- ✅ **Usar S3 Intelligent-Tiering** para archivos poco accedidos
- ✅ **Monitorear costos con AWS Cost Explorer**
- ✅ **Alertas de facturación** (si se exceden umbrales)

### 4. Observabilidad

- ✅ **Logging de operaciones S3** (subidas, errores, eliminaciones)
- ✅ **Telemetría de latencia** (tiempo de generación de presigned URLs)
- ✅ **Alertas de fallos** (ej. tasa de errores > 5%)
- ✅ **Dashboards de métricas** (número de imágenes subidas por día)

### 5. Limpieza de Archivos Huérfanos

**Problema:** Si un usuario solicita un presigned URL pero nunca confirma la subida, el archivo queda en S3 sin metadatos en la DB.

**Solución:** Crear un job programado (cron) que limpie archivos no confirmados:

```typescript
// scripts/cleanup-orphaned-images.ts
import { S3Client, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '@/lib/prisma';

async function cleanupOrphanedImages() {
  const s3Client = new S3Client({ region: process.env.AWS_REGION });
  const bucket = process.env.AWS_S3_BUCKET_MEDIA!;

  // Listar todos los archivos en contractor-services/
  const listCommand = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: 'contractor-services/',
  });

  const response = await s3Client.send(listCommand);
  const s3Keys = response.Contents?.map((obj) => obj.Key!) || [];

  // Obtener todas las s3Keys registradas en la DB
  const registeredKeys = await prisma.serviceImage.findMany({
    select: { s3Key: true },
  });
  const registeredKeySet = new Set(registeredKeys.map((img) => img.s3Key));

  // Eliminar archivos que no están en la DB y tienen más de 7 días
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  for (const key of s3Keys) {
    if (!registeredKeySet.has(key)) {
      // Verificar si el archivo tiene más de 7 días
      const headResponse = await s3Client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: key })
      );
      if (headResponse.LastModified && headResponse.LastModified < sevenDaysAgo) {
        console.log(`Deleting orphaned file: ${key}`);
        await s3Client.send(
          new DeleteObjectCommand({ Bucket: bucket, Key: key })
        );
      }
    }
  }
}

// Ejecutar con cron (ej. GitHub Actions, Vercel Cron, AWS Lambda)
cleanupOrphanedImages().catch(console.error);
```

**Programar con Vercel Cron:**

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-orphaned-images",
      "schedule": "0 2 * * *"
    }
  ]
}
```

---

## Pruebas Locales

### 1. Probar Generación de Presigned URL

```bash
curl -X POST http://localhost:3000/api/services/{serviceId}/images/upload-url \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "fileName": "test-image.jpg",
    "fileType": "image/jpeg",
    "fileSize": 2048000
  }'
```

**Respuesta esperada:**
```json
{
  "uploadUrl": "https://reparaya-media-dev.s3.us-west-2.amazonaws.com/contractor-services/...",
  "s3Key": "contractor-services/user-123/service-456/abc123.jpg",
  "expiresIn": 3600
}
```

### 2. Probar Subida a S3

```bash
curl -X PUT "{uploadUrl}" \
  -H "Content-Type: image/jpeg" \
  --upload-file ./test-image.jpg
```

**Respuesta esperada:** `200 OK`

### 3. Verificar Archivo en S3

```bash
aws s3 ls s3://reparaya-media-dev/contractor-services/ --recursive
```

O visitar la consola de S3 y navegar al bucket.

---

## Checklist de Verificación

### Antes de Implementar

- [ ] Cuenta de AWS activa
- [ ] Usuario IAM creado con política restrictiva
- [ ] Credenciales AWS guardadas de forma segura
- [ ] Bucket S3 creado con cifrado habilitado
- [ ] CORS configurado correctamente
- [ ] Variables de entorno agregadas a `.env.local`
- [ ] Dependencias instaladas (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`)

### Durante la Implementación

- [ ] `S3StorageService` implementado en `src/lib/aws/s3StorageService.ts`
- [ ] Endpoint `/api/services/:id/images/upload-url` implementado
- [ ] Endpoint `/api/services/:id/images/confirm` implementado
- [ ] Validaciones de MIME type y tamaño en el servidor
- [ ] Componente de subida de imágenes en el frontend
- [ ] Validaciones de cliente (tipo, tamaño, dimensiones)
- [ ] Manejo de errores y reintento (3 intentos)

### Después de Implementar

- [ ] Pruebas unitarias para `S3StorageService`
- [ ] Pruebas de integración para endpoints de imágenes
- [ ] Pruebas E2E de flujo completo de subida
- [ ] Verificar que archivos se suben correctamente a S3
- [ ] Verificar que metadatos se guardan en la DB
- [ ] Verificar que imágenes se muestran correctamente en el frontend
- [ ] Configurar job de limpieza de archivos huérfanos
- [ ] Monitorear logs de errores en producción

---

## Troubleshooting

### Error: `SignatureDoesNotMatch`

**Problema:** La firma de la presigned URL no coincide.

**Solución:**
- Verificar que `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY` sean correctos
- Verificar que la región del bucket coincida con `AWS_REGION`
- Verificar que el Content-Type del PUT request coincida con el especificado en la presigned URL

### Error: `AccessDenied`

**Problema:** El usuario IAM no tiene permisos suficientes.

**Solución:**
- Verificar que la política IAM incluya `s3:PutObject` y `s3:GetObject`
- Verificar que el recurso en la política sea `arn:aws:s3:::reparaya-media-dev/contractor-services/*`
- Verificar que el bucket no tenga políticas de bloqueo público que impidan la operación

### Error: CORS policy blocks request

**Problema:** El navegador bloquea la request por CORS.

**Solución:**
- Verificar que el dominio del frontend esté en `AllowedOrigins` de la configuración CORS del bucket
- Verificar que `AllowedMethods` incluya `PUT`
- Verificar que `AllowedHeaders` incluya `*` o los headers específicos necesarios
- Limpiar caché del navegador y reintentar

### Error: `ExpiredToken`

**Problema:** La presigned URL expiró.

**Solución:**
- Las presigned URLs expiran después de 1 hora por defecto
- Solicitar una nueva presigned URL
- Considerar incrementar `expirySeconds` si los usuarios necesitan más tiempo

### Error: Image upload succeeds but metadata not saved in DB

**Problema:** La subida a S3 es exitosa pero `/api/services/:id/images/confirm` falla.

**Solución:**
- Verificar logs del backend para errores en el endpoint de confirmación
- Verificar que el `s3Key` enviado coincida con el generado originalmente
- Verificar que el `serviceId` sea válido
- Verificar que el usuario tenga permisos para modificar el servicio

---

## Recursos Adicionales

### Documentación Oficial

- [AWS S3 Presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [S3 CORS Configuration](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html)
- [IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)

### Herramientas

- [AWS Cost Calculator](https://calculator.aws/) - Estimar costos de S3
- [CloudTrail](https://aws.amazon.com/cloudtrail/) - Auditoría de accesos
- [CloudWatch](https://aws.amazon.com/cloudwatch/) - Monitoreo de métricas
- [Terraform AWS S3 Module](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket) - IaC para S3

---

## Notas de Handoff

### Conexión con Futuros Módulos

**1. Disponibilidad/Calendario:**
Cuando se implemente el módulo de disponibilidad, las imágenes de los servicios ya estarán almacenadas en S3 y vinculadas en la tabla `ServiceImage`. El módulo de calendario solo necesitará referenciar `Service.id`.

**2. Mensajería:**
Si se permite enviar imágenes en mensajes entre cliente y contratista, reutilizar el mismo `S3StorageService` con un prefijo diferente (ej. `messages/{bookingId}/`).

**3. Portafolios de Contratistas (Futuro):**
Reutilizar la misma infraestructura S3 con prefijo `contractor-portfolios/{contractorId}/`.

---

## Resumen

Esta guía proporciona una configuración completa para integrar AWS S3 en ReparaYa con un enfoque en seguridad, performance y buenas prácticas. La arquitectura de presigned URLs asegura que las credenciales AWS nunca se expongan al cliente, mientras que las validaciones del lado del servidor garantizan la integridad de los datos.

**Próximos pasos:**
1. Implementar el código en `src/lib/aws/s3StorageService.ts`
2. Crear los endpoints de API para presigned URLs
3. Desarrollar el componente de subida en el frontend
4. Escribir tests de integración
5. Configurar job de limpieza de archivos huérfanos
6. Monitorear métricas en producción

**Preguntas o problemas:** Consultar la sección de [Troubleshooting](#troubleshooting) o abrir un issue en el repositorio.
