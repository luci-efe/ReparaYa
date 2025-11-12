#!/bin/bash
# CI validation script for Terraform infrastructure

set -e

echo "======================================"
echo "Terraform Infrastructure CI Validation"
echo "======================================"

# Change to terraform directory
cd "$(dirname "$0")"

echo ""
echo "1. Running terraform fmt check..."
terraform fmt -check -recursive

echo ""
echo "2. Running terraform init..."
terraform init -backend=false

echo ""
echo "3. Running terraform validate..."
terraform validate

echo ""
echo "4. Installing tflint..."
if ! command -v tflint &> /dev/null; then
    echo "tflint not found, installing..."
    curl -s https://raw.githubusercontent.com/terraform-linters/tflint/master/install_linux.sh | bash
fi

echo ""
echo "5. Initializing tflint..."
tflint --init

echo ""
echo "6. Running tflint..."
tflint --recursive

echo ""
echo "7. Running Terratest (plan-only)..."
cd tests
if ! command -v go &> /dev/null; then
    echo "Go not found, skipping Terratest. Install Go to run tests."
else
    echo "Installing Go dependencies..."
    go mod download
    
    echo "Running tests..."
    go test -v -timeout 30m -run TestPlanMultiRegion
    
    echo ""
    echo "All tests passed!"
fi

echo ""
echo "======================================"
echo "✓ All CI checks passed successfully!"
echo "======================================"
