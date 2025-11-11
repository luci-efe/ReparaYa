# Infraestructura como Código (Terraform) - ReparaYa

## Propósito

Este directorio contiene la configuración de Terraform para provisionar y gestionar
los recursos de AWS necesarios para ReparaYa:

- **S3**: Almacenamiento de imágenes de servicios
- **SES**: Envío de correos transaccionales
- **Amazon Location Service**: Geocodificación y cálculo de distancias
- **IAM**: Roles y políticas de acceso

## Estructura

```
infra/terraform/
├── main.tf           # Configuración principal y provider
├── variables.tf      # Variables de configuración
├── outputs.tf        # Outputs de recursos creados
└── aws/
    ├── s3_media.tf           # Bucket S3 para medios
    ├── ses_email.tf          # Configuración SES
    ├── location_service.tf   # Place Index y Route Calculator
    └── iam.tf                # Roles y políticas IAM
```

## Uso

### Prerrequisitos

1. Instalar [Terraform](https://www.terraform.io/downloads.html) >= 1.0
2. Configurar credenciales de AWS:
   ```bash
   aws configure
   # O exportar variables de entorno:
   export AWS_ACCESS_KEY_ID="..."
   export AWS_SECRET_ACCESS_KEY="..."
   export AWS_REGION="us-west-2"
   ```

### Comandos básicos

```bash
# Inicializar Terraform (primera vez)
cd infra/terraform
terraform init

# Ver plan de cambios
terraform plan

# Aplicar cambios (crear/actualizar recursos)
terraform apply

# Destruir recursos (CUIDADO en producción)
terraform destroy

# Ver outputs
terraform output
```

### Configuración de variables

Puedes crear un archivo `terraform.tfvars` para personalizar variables:

```hcl
aws_region              = "us-west-2"
environment             = "dev"
s3_media_bucket_name    = "reparaya-media-dev"
ses_sender_email        = "noreply@reparaya.com"
```

**IMPORTANTE**: NO commitear `terraform.tfvars` si contiene valores sensibles.

## Ambientes

### Desarrollo (dev)

- Bucket S3: `reparaya-media-dev`
- SES: Modo sandbox (límite de 200 emails/día)
- Location Service: recursos compartidos

Se mantendrá un ambiente dev **persistente** (no se destruye después de cada demo).

### Staging / Producción

TODO: Configurar workspaces de Terraform o directorios separados cuando sea necesario.

```bash
# Ejemplo con workspaces
terraform workspace new staging
terraform workspace select staging
terraform apply
```

## Credenciales

Las credenciales generadas (IAM access keys) deben:
1. Guardarse de forma segura (1Password, AWS Secrets Manager, etc.)
2. Configurarse en Vercel como variables de entorno:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION`

**NUNCA** commitear credenciales en el repositorio.

## Backend remoto (TODO)

Para trabajo en equipo, configurar backend remoto en S3:

```hcl
terraform {
  backend "s3" {
    bucket = "reparaya-terraform-state"
    key    = "dev/terraform.tfstate"
    region = "us-west-2"
    # encrypt = true
    # dynamodb_table = "terraform-locks"  # Para locking
  }
}
```

## Estado Actual

⚠️ **Todos los recursos están comentados** (TODOs) porque aún no se tienen credenciales de AWS.

Una vez que se obtengan:
1. Descomentar los recursos necesarios en `aws/*.tf`
2. Ejecutar `terraform apply`
3. Copiar outputs (bucket names, ARNs) a `.env` de la aplicación

## Costos estimados

Con uso moderado (proyecto académico):
- **S3**: ~$1-2/mes (almacenamiento + requests)
- **SES**: $0.10 por 1,000 emails (sandbox gratis hasta límite)
- **Location Service**: ~$0.50-1/mes para geocodificación básica
- **Total estimado**: <$5/mes

**Nota**: Siempre monitorear con AWS Cost Explorer.

## Referencias

- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS S3 Terraform](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket)
- [AWS SES Terraform](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ses_email_identity)
- [Amazon Location Service Terraform](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/location_place_index)
