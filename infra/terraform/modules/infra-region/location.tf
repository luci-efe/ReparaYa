# Amazon Location Service for geocoding and routing (conditionally created)

# Place Index for geocoding (address → coordinates)
resource "aws_location_place_index" "places" {
  count       = var.enable_location_service ? 1 : 0
  index_name  = "${var.project_name}-places-${var.environment}-${var.region}"
  data_source = "Esri" # Good provider for Latin America/Mexico

  data_source_configuration {
    intended_use = "SingleUse" # For one-off searches
  }

  tags = {
    Name    = "${var.project_name}-places-${var.environment}-${var.region}"
    Purpose = "Geocoding of addresses"
    Region  = var.region
  }
}

# Route Calculator for distance calculations
resource "aws_location_route_calculator" "routes" {
  count           = var.enable_location_service ? 1 : 0
  calculator_name = "${var.project_name}-routes-${var.environment}-${var.region}"
  data_source     = "Esri"

  tags = {
    Name    = "${var.project_name}-routes-${var.environment}-${var.region}"
    Purpose = "Distance calculation between services and clients"
    Region  = var.region
  }
}
