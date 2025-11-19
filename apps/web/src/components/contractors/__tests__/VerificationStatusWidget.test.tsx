/**
 * Unit tests for VerificationStatusWidget component
 * TC-CDASH-001, TC-CDASH-002, TC-CDASH-012
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VerificationStatusWidget } from '../VerificationStatusWidget';

// Mock Card component
jest.mock('@/components/ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card">{children}</div>
  ),
}));

describe('VerificationStatusWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('TC-CDASH-001: DRAFT (unverified) state rendering', () => {
    it('should display "En Revisión" badge when not verified', () => {
      // Arrange & Act
      render(<VerificationStatusWidget verified={false} />);

      // Assert
      expect(screen.getByText('En Revisión')).toBeInTheDocument();
    });

    it('should display correct message for unverified profile', () => {
      // Arrange & Act
      render(<VerificationStatusWidget verified={false} />);

      // Assert
      const message = screen.getByText(/tu perfil está en revisión/i);
      expect(message).toBeInTheDocument();
      expect(message).toHaveTextContent(
        'Tu perfil está en revisión. Podrás publicar servicios cuando sea aprobado.'
      );
    });

    it('should display yellow badge styling for unverified state', () => {
      // Arrange & Act
      render(<VerificationStatusWidget verified={false} />);

      const badge = screen.getByText('En Revisión').closest('span');

      // Assert
      expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800');
    });

    it('should show pulsing clock icon for unverified state', () => {
      // Arrange
      const { container: _container } = render(<VerificationStatusWidget verified={false} />);

      // Assert - _container declared but not used, relying on screen queries instead
      const badge = screen.getByText('En Revisión').closest('span');
      const svg = badge?.querySelector('svg.animate-pulse');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('TC-CDASH-002: ACTIVE (verified) state rendering', () => {
    it('should display "Verificado" badge when verified', () => {
      // Arrange & Act
      render(<VerificationStatusWidget verified={true} />);

      // Assert
      expect(screen.getByText('Verificado')).toBeInTheDocument();
    });

    it('should display correct message for verified profile', () => {
      // Arrange & Act
      render(<VerificationStatusWidget verified={true} />);

      // Assert
      const message = screen.getByText(/tu perfil ha sido aprobado/i);
      expect(message).toBeInTheDocument();
      expect(message).toHaveTextContent(
        'Tu perfil ha sido aprobado. Ya puedes publicar servicios.'
      );
    });

    it('should display green badge styling for verified state', () => {
      // Arrange & Act
      render(<VerificationStatusWidget verified={true} />);

      const badge = screen.getByText('Verificado').closest('span');

      // Assert
      expect(badge).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('should show checkmark icon for verified state', () => {
      // Arrange
      const { container: _container } = render(<VerificationStatusWidget verified={true} />);

      // Assert - _container declared but not used, relying on screen queries instead
      const badge = screen.getByText('Verificado').closest('span');
      const svg = badge?.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).not.toHaveClass('animate-pulse'); // Should not pulse
    });
  });

  describe('Accessibility (TC-CDASH-012)', () => {
    it('should have role="status" for screen readers on unverified', () => {
      // Arrange & Act
      render(<VerificationStatusWidget verified={false} />);

      // Assert
      const statusElement = screen.getByText(/tu perfil está en revisión/i);
      expect(statusElement).toHaveAttribute('role', 'status');
    });

    it('should have role="status" for screen readers on verified', () => {
      // Arrange & Act
      render(<VerificationStatusWidget verified={true} />);

      // Assert
      const statusElement = screen.getByText(/tu perfil ha sido aprobado/i);
      expect(statusElement).toHaveAttribute('role', 'status');
    });

    it('should have aria-live="polite" for unverified state', () => {
      // Arrange & Act
      render(<VerificationStatusWidget verified={false} />);

      // Assert
      const statusElement = screen.getByText(/tu perfil está en revisión/i);
      expect(statusElement).toHaveAttribute('aria-live', 'polite');
    });

    it('should have aria-live="polite" for verified state', () => {
      // Arrange & Act
      render(<VerificationStatusWidget verified={true} />);

      // Assert
      const statusElement = screen.getByText(/tu perfil ha sido aprobado/i);
      expect(statusElement).toHaveAttribute('aria-live', 'polite');
    });

    it('icons should have aria-hidden attribute', () => {
      // Arrange
      const { container: _container } = render(<VerificationStatusWidget verified={true} />);

      // Assert
      const svg = _container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Component Structure', () => {
    it('should render inside Card component', () => {
      // Arrange & Act
      render(<VerificationStatusWidget verified={true} />);

      // Assert
      expect(screen.getByTestId('card')).toBeInTheDocument();
    });

    it('should have correct heading', () => {
      // Arrange & Act
      render(<VerificationStatusWidget verified={true} />);

      // Assert
      const heading = screen.getByRole('heading', { name: /estado de verificación/i });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe('H3');
    });

    it('should have proper layout structure with flexbox', () => {
      // Arrange
      const { container: _container } = render(<VerificationStatusWidget verified={true} />);

      // Assert
      const flexContainer = _container.querySelector('.flex.items-center.justify-between');
      expect(flexContainer).toBeInTheDocument();
    });
  });

  describe('State Transitions', () => {
    it('should update from unverified to verified when prop changes', () => {
      // Arrange
      const { rerender } = render(<VerificationStatusWidget verified={false} />);

      // Assert initial state
      expect(screen.getByText('En Revisión')).toBeInTheDocument();

      // Act - Update to verified
      rerender(<VerificationStatusWidget verified={true} />);

      // Assert new state
      expect(screen.getByText('Verificado')).toBeInTheDocument();
      expect(screen.queryByText('En Revisión')).not.toBeInTheDocument();
    });

    it('should update from verified to unverified when prop changes', () => {
      // Arrange
      const { rerender } = render(<VerificationStatusWidget verified={true} />);

      // Assert initial state
      expect(screen.getByText('Verificado')).toBeInTheDocument();

      // Act - Update to unverified
      rerender(<VerificationStatusWidget verified={false} />);

      // Assert new state
      expect(screen.getByText('En Revisión')).toBeInTheDocument();
      expect(screen.queryByText('Verificado')).not.toBeInTheDocument();
    });

    it('should maintain consistent status message when state changes', () => {
      // Arrange
      const { rerender } = render(<VerificationStatusWidget verified={false} />);

      // Act & Assert - Status should always be present
      expect(screen.getByRole('status')).toBeInTheDocument();

      rerender(<VerificationStatusWidget verified={true} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Visual Styling', () => {
    it('should have correct text styles for title', () => {
      // Arrange & Act
      render(<VerificationStatusWidget verified={true} />);

      const heading = screen.getByRole('heading', { name: /estado de verificación/i });

      // Assert
      expect(heading).toHaveClass('text-lg', 'font-semibold', 'text-gray-900');
    });

    it('should have correct text styles for message', () => {
      // Arrange & Act
      render(<VerificationStatusWidget verified={true} />);

      const message = screen.getByText(/tu perfil ha sido aprobado/i);

      // Assert
      expect(message).toHaveClass('mt-1', 'text-sm', 'text-gray-600');
    });

    it('badge should have consistent styling structure', () => {
      // Arrange & Act
      render(<VerificationStatusWidget verified={true} />);

      const badge = screen.getByText('Verificado').closest('span');

      // Assert
      expect(badge).toHaveClass(
        'inline-flex',
        'items-center',
        'rounded-full',
        'px-4',
        'py-2',
        'text-sm',
        'font-medium'
      );
    });
  });

  describe('Icon Rendering', () => {
    it('verified icon should have checkmark path', () => {
      // Arrange
      const { container: _container } = render(<VerificationStatusWidget verified={true} />);

      // Assert - _container declared but not used, relying on screen queries instead
      const badge = screen.getByText('Verificado').closest('span');
      const svg = badge?.querySelector('svg');
      const path = svg?.querySelector('path');
      expect(path).toHaveAttribute('fill-rule', 'evenodd');
      expect(path).toHaveAttribute('clip-rule', 'evenodd');
    });

    it('unverified icon should have clock path', () => {
      // Arrange
      const { container: _container } = render(<VerificationStatusWidget verified={false} />);

      // Assert - _container declared but not used, relying on screen queries instead
      const badge = screen.getByText('En Revisión').closest('span');
      const svg = badge?.querySelector('svg');
      const path = svg?.querySelector('path');
      expect(path).toHaveAttribute('fill-rule', 'evenodd');
      expect(path).toHaveAttribute('clip-rule', 'evenodd');
    });

    it('icon should have correct size classes', () => {
      // Arrange
      const { container: _container } = render(<VerificationStatusWidget verified={true} />);

      // Assert
      const svg = _container.querySelector('svg');
      expect(svg).toHaveClass('w-4', 'h-4', 'mr-1.5');
    });
  });
});
