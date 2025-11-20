/**
 * Mock implementation of AWS Location Service for testing
 *
 * Jest automatically uses this file when jest.mock('@/lib/aws/locationService') is called
 */

export const geocodeAddress = jest.fn();
export const reverseGeocode = jest.fn();

export class GeocodingTimeoutError extends Error {
  constructor(message = 'Geocoding service timeout') {
    super(message);
    this.name = 'GeocodingTimeoutError';
  }
}

export class InvalidAddressFormatError extends Error {
  constructor(message = 'Invalid address format') {
    super(message);
    this.name = 'InvalidAddressFormatError';
  }
}

export class GeocodingServiceUnavailableError extends Error {
  constructor(message = 'Geocoding service unavailable') {
    super(message);
    this.name = 'GeocodingServiceUnavailableError';
  }
}
