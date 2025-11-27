# Infraestructura como Código (Terraform) - ReparaYa

## Propósito

Este directorio contiene la configuración de Terraform para provisionar y gestionar
los recursos de AWS necesarios para ReparaYa y su integración con Vercel:

- **AWS**:
  - **S3**: Almacenamiento de imágenes de servicios
  - **SES**: Envío de correos transaccionales
  - **Amazon Location Service**: Geocodificación y cálculo de distancias
  - **IAM**: Roles y políticas de acceso
- **Vercel**:
  - Sincronización automática de variables de entorno (Credenciales AWS, Nombres de recursos)

## Estructura

```
infra/terraform/
├── bootstrap/        # Configuración inicial para el estado remoto
│   └── main.tf
├── aws/              # Módulo de recursos AWS
│   ├── s3_media.tf
│   ├── ses_email.tf
│   ├── location_service.tf
│   ├── iam.tf
│   ├── variables.tf
│   └── outputs.tf
├── main.tf           # Configuración principal y providers
├── vercel.tf         # Recursos de integración con Vercel
├── variables.tf      # Variables globales
└── outputs.tf        # Outputs principales
```

## Uso

### Prerrequisitos

1. Instalar [Terraform](https://www.terraform.io/downloads.html) >= 1.0
2. Configurar credenciales de AWS:
   ```bash
   export AWS_ACCESS_KEY_ID="..."
   export AWS_SECRET_ACCESS_KEY="..."
   export AWS_REGION="us-west-2"
   ```
3. Configurar token de Vercel:
   ```bash
   export VERCEL_API_TOKEN="..."
   ```

### 1. Bootstrap (Solo primera vez)

Para crear el bucket S3 y la tabla DynamoDB para el estado remoto:

```bash
cd infra/terraform/bootstrap
terraform init
terraform apply
```

### 2. Despliegue de Infraestructura

```bash
cd infra/terraform

# Inicializar Terraform
terraform init

# Ver plan de cambios
terraform plan

# Aplicar cambios
terraform apply
```

### Configuración de variables

Crea un archivo `terraform.tfvars` para personalizar variables:

```hcl
aws_region              = "us-west-2"
environment             = "dev"
project_name            = "reparaya"
vercel_project_id       = "prj_..."
vercel_team_id          = "team_..." # Opcional
```

**IMPORTANTE**: NO commitear `terraform.tfvars` si contiene valores sensibles.

## Integración Continua

La configuración incluye el provider de Vercel, lo que significa que al aplicar los cambios, las siguientes variables de entorno se inyectarán automáticamente en el proyecto Vercel (Production, Preview, Development):

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `AWS_S3_BUCKET_MEDIA`
- `AWS_SES_SENDER_EMAIL`
- `AWS_LOCATION_PLACE_INDEX`
- `AWS_LOCATION_ROUTE_CALCULATOR`

## Costos estimados

Con uso moderado (proyecto académico):
- **S3**: ~$1-2/mes (almacenamiento + requests)
- **SES**: $0.10 por 1,000 emails (sandbox gratis hasta límite)
- **Location Service**: ~$0.50-1/mes para geocodificación básica
- **Total estimado**: <$5/mes

**Nota**: Siempre monitorear con AWS Cost Explorer.
