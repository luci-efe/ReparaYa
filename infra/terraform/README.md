# Infraestructura como Código (Terraform) - ReparaYa

## 🚀 Quick Start

**New to this infrastructure?** Start here:
- **[QUICKSTART.md](./QUICKSTART.md)** - Get running in 5 minutes
- **[AWS_SETUP_GUIDE.md](./AWS_SETUP_GUIDE.md)** - Complete AWS connection guide
- **[IMPLEMENTATION.md](./IMPLEMENTATION.md)** - Technical implementation details

## Propósito

Este directorio contiene la configuración de Terraform para provisionar y gestionar
los recursos de AWS necesarios para ReparaYa en **múltiples regiones**:

- **S3**: Almacenamiento de imágenes de servicios (multi-región)
- **SES**: Envío de correos transaccionales (multi-región)
- **Amazon Location Service**: Geocodificación y cálculo de distancias (multi-región)
- **IAM**: Roles y políticas de acceso con least-privilege
- **Cross-Region Replication (CRR)**: Replicación opcional de S3 entre regiones

## Arquitectura Multi-Región

La infraestructura soporta despliegue en múltiples regiones AWS de forma simultánea:
- Pre-aprovisiona recursos en todas las regiones configuradas
- Usa configuración para activar región preferida (evita crear/destruir recursos dinámicamente)
- Outputs indexados por región permiten selección runtime en la aplicación
- CRR opcional para durabilidad de datos S3

## Estructura

```
infra/terraform/
├── main.tf                          # Configuración principal y provider aliases
├── variables.tf                     # Variables de configuración multi-región
├── outputs.tf                       # Outputs indexados por región
├── crr.tf                           # S3 Cross-Region Replication (opcional)
├── ci-validate.sh                   # Script de validación CI
├── .tflint.hcl                      # Configuración de linting
├── modules/
│   └── infra-region/                # Módulo para recursos por región
│       ├── s3.tf                    # Bucket S3 para medios
│       ├── ses.tf                   # Configuración SES
│       ├── location.tf              # Place Index y Route Calculator
│       ├── iam.tf                   # Políticas IAM con least-privilege
│       ├── variables.tf             # Variables del módulo
│       ├── outputs.tf               # Outputs del módulo
│       └── versions.tf              # Provider requirements
└── tests/
    ├── terraform_multi_region_test.go  # Terratest para validación
    └── go.mod                          # Go dependencies
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
# Multi-region configuration
regions                 = ["us-west-2", "eu-central-1"]
environment             = "dev"
project_name            = "reparaya"
ses_sender_email        = "noreply@reparaya.com"

# Optional: Enable/disable services per region
enable_ses              = true
enable_location_service = true

# Optional: Enable Cross-Region Replication
enable_crr              = false
primary_region          = "us-west-2"
replica_region          = "eu-central-1"
```

**IMPORTANTE**: NO commitear `terraform.tfvars` si contiene valores sensibles.

### Multi-Region Usage

#### Configure Multiple Regions

```hcl
# Deploy to US West and EU Central
regions = ["us-west-2", "eu-central-1"]
```

#### Access Region-Specific Resources

All outputs are maps keyed by region:

```bash
# Get S3 bucket names for all regions
terraform output s3_bucket_names

# Output:
# {
#   "us-west-2" = "reparaya-media-dev-us-west-2"
#   "eu-central-1" = "reparaya-media-dev-eu-central-1"
# }

# Get Location Service endpoints
terraform output location_place_index_names
```

#### Activate Preferred Region in Application

The application should use environment variables or config to select the active region:

```bash
# In your application environment (.env)
ACTIVE_REGION_S3=us-west-2
ACTIVE_REGION_LOCATION=eu-central-1
ACTIVE_REGION_SES=us-west-2

# Fallback region if preferred is unavailable
FALLBACK_REGION=us-west-2
```

Application logic should:
1. Read region-indexed Terraform outputs
2. Select endpoint for active region from environment
3. Fall back to nearest/default region on error

#### Enable Cross-Region Replication (Optional)

```hcl
enable_crr       = true
primary_region   = "us-west-2"   # Source bucket
replica_region   = "eu-central-1" # Destination bucket
```

**Note**: CRR requires:
- At least 2 regions configured
- Versioning enabled on both buckets (automatic)
- Additional IAM permissions (automatic)
- Additional costs for replication

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

## Security: IAM Least-Privilege Patterns

The infrastructure follows IAM least-privilege principles:

### S3 Access
- Policies reference specific bucket ARNs (no wildcards)
- Separate permissions for object operations vs bucket operations
- Public access blocked by default

### SES Access
- Policies reference specific SES identity and configuration set ARNs
- Limited to SendEmail and SendRawEmail actions only

### Location Service Access
- Policies reference specific Place Index and Route Calculator ARNs
- Limited to required actions: SearchPlaceIndex, CalculateRoute

### Multi-Region IAM
Each region gets its own IAM policy scoped to resources in that region only.

## SES Domain/Email Verification

**IMPORTANT**: SES requires manual verification per region.

### First-Time Setup Per Region

1. After `terraform apply`, verify email/domain in each region:
   ```bash
   # AWS Console or CLI for each region
   aws ses verify-email-identity --email-address noreply@reparaya.com --region us-west-2
   aws ses verify-email-identity --email-address noreply@reparaya.com --region eu-central-1
   ```

2. Check email inbox and click verification link

3. Request production access (move out of Sandbox):
   - AWS Console → SES → Account Dashboard → Request production access
   - Provide use case details
   - Approval takes 24-48 hours typically

### Domain Verification (Recommended for Production)

For production, verify entire domain instead of individual emails:

```bash
aws ses verify-domain-identity --domain reparaya.com --region us-west-2
```

Then add DNS records (TXT, DKIM) as provided by AWS.

## Estado Actual

✅ **Multi-region infrastructure ready to deploy**

The modular structure supports:
- Single or multiple regions
- Feature flags for SES/Location Service
- Optional Cross-Region Replication
- CI validation with Terratest

### Deployment Steps

1. Configure AWS credentials
2. Set regions in `terraform.tfvars`
3. Run `terraform init && terraform plan`
4. Review plan, then `terraform apply`
5. Verify SES email/domain in each region (see above)
6. Copy region-indexed outputs to application configuration

## CI Validation

Run CI validation script before committing:

```bash
./ci-validate.sh
```

This script runs:
1. `terraform fmt -check` - Code formatting
2. `terraform validate` - Configuration validation
3. `tflint` - Linting with AWS rules
4. Terratest - Plan-only tests for multi-region setup

### Manual Testing

```bash
# Run specific test
cd tests
go test -v -run TestPlanMultiRegion

# Run all tests
go test -v -timeout 30m
```

## Costos estimados

### Single Region (base)
- **S3**: ~$1-2/mes (almacenamiento + requests)
- **SES**: $0.10 por 1,000 emails (sandbox gratis hasta límite)
- **Location Service**: ~$0.50-1/mes para geocodificación básica
- **Total estimado**: <$5/mes

### Multi-Region (2 regions)
- Base costs × 2 regions = ~$8-10/mes
- **CRR (if enabled)**: +$0.02 per GB transferred between regions
- Data transfer within AWS: First 1 GB free, then ~$0.02/GB

### Optimization Tips
- Use S3 Intelligent-Tiering for infrequently accessed media
- Monitor usage with AWS Cost Explorer
- Set up billing alerts
- Disable Location Service in regions with low usage

**Nota**: Siempre monitorear con AWS Cost Explorer y configurar alertas de presupuesto.

## Fallback Region Strategy

### Application-Level Implementation

When a region is unavailable, the application should:

1. **Detect failure**: Catch AWS SDK errors (timeout, service unavailable)
2. **Try fallback**: Switch to next nearest region from configured list
3. **Log incident**: Track regional failures for ops monitoring
4. **Alert ops**: Send notification if primary region down for > 5 minutes

### Example Pseudocode

```javascript
const REGIONS = ['us-west-2', 'eu-central-1', 'ap-southeast-1'];
const PRIMARY_REGION = process.env.ACTIVE_REGION_LOCATION || REGIONS[0];

async function geocodeAddress(address) {
  let lastError;
  
  // Try primary first
  const orderedRegions = [PRIMARY_REGION, ...REGIONS.filter(r => r !== PRIMARY_REGION)];
  
  for (const region of orderedRegions) {
    try {
      const client = new LocationClient({ region });
      const result = await client.searchPlaceIndexForText({
        IndexName: outputs.location_place_index_names[region],
        Text: address
      });
      return result;
    } catch (error) {
      lastError = error;
      console.warn(`Region ${region} failed, trying next...`);
      // Optional: Add exponential backoff
    }
  }
  
  throw new Error(`All regions failed: ${lastError.message}`);
}
```

### Operational Recommendations

1. **Monitor regional health**: Use AWS Health Dashboard
2. **Set up CloudWatch alarms**: Alert on error rate spikes per region
3. **Test failover**: Regularly test fallback logic in staging
4. **Document runbooks**: Include steps to manually switch active region

## Pre-commit Hooks (Optional)

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
cd infra/terraform
terraform fmt -check -recursive || {
  echo "Terraform files not formatted. Run: terraform fmt -recursive"
  exit 1
}
```

## Referencias

- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS S3 Terraform](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket)
- [AWS SES Terraform](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ses_email_identity)
- [Amazon Location Service Terraform](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/location_place_index)
- [S3 Cross-Region Replication](https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication.html)
- [Terratest Documentation](https://terratest.gruntwork.io/)
- [TFLint](https://github.com/terraform-linters/tflint)
