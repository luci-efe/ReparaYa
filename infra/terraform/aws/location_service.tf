# Amazon Location Service para geocodificación y cálculo de distancias

# TODO: Descomentar cuando se tenga acceso a AWS

# # Place Index para geocodificación (dirección → coordenadas)
# resource "aws_location_place_index" "places" {
#   index_name    = var.location_place_index_name
#   data_source   = "Esri"  # Esri es buen proveedor para México
#
#   data_source_configuration {
#     intended_use = "SingleUse"  # Para búsquedas one-off
#   }
#
#   tags = {
#     Name        = "${var.project_name}-places-${var.environment}"
#     Purpose     = "Geocodificación de direcciones"
#   }
# }

# # Route Calculator para cálculo de distancias
# resource "aws_location_route_calculator" "routes" {
#   calculator_name = var.location_route_calculator_name
#   data_source     = "Esri"
#
#   tags = {
#     Name        = "${var.project_name}-routes-${var.environment}"
#     Purpose     = "Cálculo de distancias entre servicios y clientes"
#   }
# }

# TODO: Configurar permisos IAM para que la aplicación pueda usar estos recursos
