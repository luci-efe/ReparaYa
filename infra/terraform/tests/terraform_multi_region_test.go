package test

import (
	"fmt"
	"testing"

	"github.com/gruntwork-io/terratest/modules/terraform"
	"github.com/stretchr/testify/assert"
)

func TestPlanMultiRegion(t *testing.T) {
	t.Parallel()

	// Test configuration with two regions
	regions := []string{"us-west-2", "eu-central-1"}

	terraformOptions := terraform.WithDefaultRetryableErrors(t, &terraform.Options{
		TerraformDir: "..",
		Vars: map[string]interface{}{
			"regions":                  regions,
			"environment":              "test",
			"project_name":             "reparaya-test",
			"ses_sender_email":         "test@example.com",
			"enable_ses":               true,
			"enable_location_service":  true,
			"enable_crr":               false,
		},
		PlanFilePath: "./test-plan",
	})

	defer terraform.Destroy(t, terraformOptions)

	// Run terraform init and plan
	planStruct := terraform.InitAndPlan(t, terraformOptions)

	// Verify resource counts
	resourceCount := terraform.GetResourceCount(t, planStruct)
	
	// Each region should have:
	// - 1 S3 bucket
	// - 1 S3 bucket versioning
	// - 1 S3 bucket CORS
	// - 1 S3 bucket public access block
	// - 1 S3 bucket encryption
	// - 1 SES email identity
	// - 1 SES configuration set
	// - 1 SES event destination
	// - 1 Location Place Index
	// - 1 Location Route Calculator
	// - 1 IAM policy
	// Total per region: 11 resources
	// For 2 regions: 22 resources
	expectedResourceCount := len(regions) * 11

	assert.Equal(t, expectedResourceCount, resourceCount.Add, 
		fmt.Sprintf("Expected %d resources to be created for %d regions", expectedResourceCount, len(regions)))

	// Verify outputs structure
	outputs := terraform.OutputAll(t, terraformOptions)
	
	// Check that region-indexed outputs are maps
	assert.IsType(t, map[string]interface{}{}, outputs["s3_bucket_names"], "s3_bucket_names should be a map")
	assert.IsType(t, map[string]interface{}{}, outputs["location_place_index_names"], "location_place_index_names should be a map")
	
	// Verify output keys match configured regions
	s3BucketNames := outputs["s3_bucket_names"].(map[string]interface{})
	assert.Len(t, s3BucketNames, len(regions), "Should have S3 bucket name for each region")
	
	for _, region := range regions {
		_, exists := s3BucketNames[region]
		assert.True(t, exists, fmt.Sprintf("Should have S3 bucket name for region %s", region))
	}
}

func TestPlanMultiRegionWithCRR(t *testing.T) {
	t.Parallel()

	regions := []string{"us-west-2", "eu-central-1"}

	terraformOptions := terraform.WithDefaultRetryableErrors(t, &terraform.Options{
		TerraformDir: "..",
		Vars: map[string]interface{}{
			"regions":                  regions,
			"environment":              "test",
			"project_name":             "reparaya-test",
			"ses_sender_email":         "test@example.com",
			"enable_ses":               true,
			"enable_location_service":  true,
			"enable_crr":               true,
			"primary_region":           "us-west-2",
			"replica_region":           "eu-central-1",
		},
		PlanFilePath: "./test-plan-crr",
	})

	defer terraform.Destroy(t, terraformOptions)

	planStruct := terraform.InitAndPlan(t, terraformOptions)

	// Verify additional CRR resources
	// Should have base resources + IAM role + IAM policy + IAM attachment + replication config
	resourceCount := terraform.GetResourceCount(t, planStruct)
	
	baseResourceCount := len(regions) * 11
	crrResourceCount := 4 // role, policy, attachment, replication config
	expectedTotal := baseResourceCount + crrResourceCount

	assert.GreaterOrEqual(t, resourceCount.Add, expectedTotal, 
		fmt.Sprintf("Expected at least %d resources when CRR is enabled", expectedTotal))

	// Verify CRR outputs
	outputs := terraform.OutputAll(t, terraformOptions)
	assert.Equal(t, true, outputs["crr_enabled"], "CRR should be enabled")
	assert.Equal(t, "us-west-2", outputs["crr_primary_region"], "Primary region should be us-west-2")
	assert.Equal(t, "eu-central-1", outputs["crr_replica_region"], "Replica region should be eu-central-1")
}

func TestPlanSingleRegion(t *testing.T) {
	t.Parallel()

	regions := []string{"us-west-2"}

	terraformOptions := terraform.WithDefaultRetryableErrors(t, &terraform.Options{
		TerraformDir: "..",
		Vars: map[string]interface{}{
			"regions":                  regions,
			"environment":              "test",
			"project_name":             "reparaya-test",
			"ses_sender_email":         "test@example.com",
			"enable_ses":               false,
			"enable_location_service":  false,
			"enable_crr":               false,
		},
		PlanFilePath: "./test-plan-single",
	})

	defer terraform.Destroy(t, terraformOptions)

	planStruct := terraform.InitAndPlan(t, terraformOptions)

	// With SES and Location disabled, should only have S3 and IAM resources
	// Per region: 5 S3 resources + 1 IAM policy = 6 resources
	resourceCount := terraform.GetResourceCount(t, planStruct)
	expectedResourceCount := 6

	assert.Equal(t, expectedResourceCount, resourceCount.Add, 
		fmt.Sprintf("Expected %d resources for single region with minimal features", expectedResourceCount))
}

func TestNamingPatterns(t *testing.T) {
	t.Parallel()

	regions := []string{"us-west-2", "ap-southeast-1"}
	projectName := "reparaya"
	environment := "test"

	terraformOptions := terraform.WithDefaultRetryableErrors(t, &terraform.Options{
		TerraformDir: "..",
		Vars: map[string]interface{}{
			"regions":                  regions,
			"environment":              environment,
			"project_name":             projectName,
			"ses_sender_email":         "test@example.com",
			"enable_ses":               true,
			"enable_location_service":  true,
			"enable_crr":               false,
		},
		PlanFilePath: "./test-plan-naming",
	})

	defer terraform.Destroy(t, terraformOptions)

	terraform.InitAndPlan(t, terraformOptions)
	outputs := terraform.OutputAll(t, terraformOptions)

	// Verify S3 bucket naming pattern: ${project_name}-media-${environment}-${region}
	s3BucketNames := outputs["s3_bucket_names"].(map[string]interface{})
	for _, region := range regions {
		expectedName := fmt.Sprintf("%s-media-%s-%s", projectName, environment, region)
		actualName := s3BucketNames[region].(string)
		assert.Equal(t, expectedName, actualName, 
			fmt.Sprintf("S3 bucket name should follow pattern for region %s", region))
	}

	// Verify Location Place Index naming pattern
	locationIndexNames := outputs["location_place_index_names"].(map[string]interface{})
	for _, region := range regions {
		expectedName := fmt.Sprintf("%s-places-%s-%s", projectName, environment, region)
		actualName := locationIndexNames[region].(string)
		assert.Equal(t, expectedName, actualName, 
			fmt.Sprintf("Location Place Index name should follow pattern for region %s", region))
	}

	// Verify Location Route Calculator naming pattern
	locationCalcNames := outputs["location_route_calculator_names"].(map[string]interface{})
	for _, region := range regions {
		expectedName := fmt.Sprintf("%s-routes-%s-%s", projectName, environment, region)
		actualName := locationCalcNames[region].(string)
		assert.Equal(t, expectedName, actualName, 
			fmt.Sprintf("Location Route Calculator name should follow pattern for region %s", region))
	}
}
