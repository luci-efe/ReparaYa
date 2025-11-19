/**
 * Unit tests for ServiceAreaCTA component
 * TC-CDASH-003, TC-CDASH-004, TC-CDASH-012
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ServiceAreaCTA } from '../ServiceAreaCTA';

// Mock Next.js Link component
jest.mock('next/link', () => {
  const MockLink = ({ children, href, title }: { children: React.ReactNode; href: string; title?: string }) => (
    <a href={href} title={title}>
      {children}
    </a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

// Mock UI components
jest.mock('@/components/ui', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  Button: ({ children, variant, size }: { children: React.ReactNode; variant?: string; size?: string }) => (
    <button data-variant={variant} data-size={size}>{children}</button>
  ),
}));

describe('ServiceAreaCTA', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('TC-CDASH-003: Show CTA when service area is not configured', () => {
    it('should render CTA when hasServiceArea is false', () => {
      // Arrange & Act
      render(<ServiceAreaCTA hasServiceArea={false} />);

      // Assert
      expect(screen.getByText(/configura tu zona de operación/i)).toBeInTheDocument();
    });

    it('should display correct heading', () => {
      // Arrange & Act
      render(<ServiceAreaCTA hasServiceArea={false} />);

      // Assert
      const heading = screen.getByRole('heading', { name: /configura tu zona de operación/i });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe('H3');
    });

    it('should display informative description', () => {
      // Arrange & Act
      render(<ServiceAreaCTA hasServiceArea={false} />);

      // Assert
      const description = screen.getByText(
        /define el área donde ofreces tus servicios para empezar a recibir solicitudes de clientes cercanos/i
      );
      expect(description).toBeInTheDocument();
    });

    it('should have "Configurar" button', () => {
      // Arrange & Act
      render(<ServiceAreaCTA hasServiceArea={false} />);

      // Assert
      expect(screen.getByText(/configurar/i)).toBeInTheDocument();
    });

    it('button should link to settings page', () => {
      // Arrange & Act
      render(<ServiceAreaCTA hasServiceArea={false} />);

      // Assert
      const link = screen.getByTitle(/configurar zona de operación/i);
      expect(link).toHaveAttribute('href', '/contractors/settings');
    });

    it('should render inside Card with blue styling', () => {
      // Arrange & Act
      render(<ServiceAreaCTA hasServiceArea={false} />);

      // Assert
      const card = screen.getByTestId('card');
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('bg-blue-50', 'border-blue-200');
    });
  });

  describe('TC-CDASH-004: Hide CTA when service area is configured', () => {
    it('should return null when hasServiceArea is true', () => {
      // Arrange & Act
      const { container: _container } = render(<ServiceAreaCTA hasServiceArea={true} />);

      // Assert - _container declared but not used for firstChild check
      expect(_container.firstChild).toBeNull();
    });

    it('should not render any text when service area exists', () => {
      // Arrange & Act
      render(<ServiceAreaCTA hasServiceArea={true} />);

      // Assert
      expect(screen.queryByText(/configura tu zona de operación/i)).not.toBeInTheDocument();
    });

    it('should not render button when service area exists', () => {
      // Arrange & Act
      render(<ServiceAreaCTA hasServiceArea={true} />);

      // Assert
      expect(screen.queryByText(/configurar/i)).not.toBeInTheDocument();
    });

    it('should not render Card when service area exists', () => {
      // Arrange & Act
      render(<ServiceAreaCTA hasServiceArea={true} />);

      // Assert
      expect(screen.queryByTestId('card')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility (TC-CDASH-012)', () => {
    it('location icon should have aria-hidden attribute', () => {
      // Arrange
      const { container } = render(<ServiceAreaCTA hasServiceArea={false} />);

      // Assert
      const icons = container.querySelectorAll('svg[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('button should have descriptive link title', () => {
      // Arrange & Act
      render(<ServiceAreaCTA hasServiceArea={false} />);

      // Assert
      const link = screen.getByTitle('Configurar zona de operación');
      expect(link).toBeInTheDocument();
    });

    it('heading should have proper semantic structure', () => {
      // Arrange & Act
      render(<ServiceAreaCTA hasServiceArea={false} />);

      // Assert
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent(/configura tu zona de operación/i);
    });
  });

  describe('Visual Styling', () => {
    it('should have blue color scheme', () => {
      // Arrange
      const { container: _container } = render(<ServiceAreaCTA hasServiceArea={false} />);

      // Assert - _container declared but not used, relying on screen queries instead
      const heading = screen.getByRole('heading', { name: /configura tu zona de operación/i });
      expect(heading).toHaveClass('text-blue-900');

      const description = screen.getByText(/define el área donde ofreces/i);
      expect(description).toHaveClass('text-blue-800');
    });

    it('location icon should have blue color', () => {
      // Arrange
      const { container: _container } = render(<ServiceAreaCTA hasServiceArea={false} />);

      // Assert
      const locationIcon = _container.querySelector('svg.text-blue-600');
      expect(locationIcon).toBeInTheDocument();
    });

    it('should have proper text size classes', () => {
      // Arrange & Act
      render(<ServiceAreaCTA hasServiceArea={false} />);

      // Assert
      const heading = screen.getByRole('heading');
      expect(heading).toHaveClass('text-base', 'font-semibold');

      const description = screen.getByText(/define el área donde ofreces/i);
      expect(description).toHaveClass('text-sm');
    });

    it('button should have primary variant and small size', () => {
      // Arrange & Act
      render(<ServiceAreaCTA hasServiceArea={false} />);

      // Assert
      const button = screen.getByText(/configurar/i).closest('button');
      expect(button).toHaveAttribute('data-variant', 'primary');
      expect(button).toHaveAttribute('data-size', 'sm');
    });
  });

  describe('Layout Structure', () => {
    it('should have flexbox layout with proper spacing', () => {
      // Arrange
      const { container: _container } = render(<ServiceAreaCTA hasServiceArea={false} />);

      // Assert
      const flexContainer = _container.querySelector('.flex.items-start.justify-between.gap-4');
      expect(flexContainer).toBeInTheDocument();
    });

    it('should have icon and heading grouped together', () => {
      // Arrange
      const { container: _container } = render(<ServiceAreaCTA hasServiceArea={false} />);

      // Assert
      const iconHeadingGroup = _container.querySelector('.flex.items-center.gap-2');
      expect(iconHeadingGroup).toBeInTheDocument();
    });

    it('text content should be in flex-1 container', () => {
      // Arrange
      const { container: _container } = render(<ServiceAreaCTA hasServiceArea={false} />);

      // Assert
      const textContainer = _container.querySelector('.flex-1');
      expect(textContainer).toBeInTheDocument();
      expect(textContainer).toContainElement(
        screen.getByRole('heading', { name: /configura tu zona de operación/i })
      );
    });

    it('button should be in flex-shrink-0 container', () => {
      // Arrange
      const { container: _container } = render(<ServiceAreaCTA hasServiceArea={false} />);

      // Assert
      const buttonContainer = _container.querySelector('.flex-shrink-0');
      expect(buttonContainer).toBeInTheDocument();
      expect(buttonContainer).toContainElement(screen.getByText(/configurar/i));
    });
  });

  describe('Icons', () => {
    it('should render location pin icon', () => {
      // Arrange
      const { container: _container } = render(<ServiceAreaCTA hasServiceArea={false} />);

      // Assert
      const svg = _container.querySelector('svg.text-blue-600');
      expect(svg).toBeInTheDocument();
      expect(svg?.querySelectorAll('path').length).toBe(2); // Location icon has 2 paths
    });

    it('should render arrow icon in button', () => {
      // Arrange
      const { container: _container } = render(<ServiceAreaCTA hasServiceArea={false} />);

      // Assert - _container declared but not used, relying on screen queries instead
      const button = screen.getByText(/configurar/i).closest('button');
      const svg = button?.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('w-4', 'h-4', 'ml-1.5', 'inline');
    });

    it('all icons should have proper accessibility attributes', () => {
      // Arrange
      const { container: _container } = render(<ServiceAreaCTA hasServiceArea={false} />);

      // Assert
      const svgs = _container.querySelectorAll('svg');
      svgs.forEach((svg) => {
        expect(svg).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });

  describe('State Transitions', () => {
    it('should toggle visibility based on prop change', () => {
      // Arrange
      const { rerender } = render(<ServiceAreaCTA hasServiceArea={false} />);

      // Assert initial state
      expect(screen.getByText(/configura tu zona de operación/i)).toBeInTheDocument();

      // Act - Update to hasServiceArea = true
      rerender(<ServiceAreaCTA hasServiceArea={true} />);

      // Assert new state
      expect(screen.queryByText(/configura tu zona de operación/i)).not.toBeInTheDocument();
    });

    it('should show CTA again when prop changes back to false', () => {
      // Arrange
      const { rerender } = render(<ServiceAreaCTA hasServiceArea={true} />);

      // Assert initial state - should be hidden
      expect(screen.queryByText(/configura tu zona de operación/i)).not.toBeInTheDocument();

      // Act - Update to hasServiceArea = false
      rerender(<ServiceAreaCTA hasServiceArea={false} />);

      // Assert new state - should be visible
      expect(screen.getByText(/configura tu zona de operación/i)).toBeInTheDocument();
    });
  });

  describe('Content Accuracy', () => {
    it('should have actionable call-to-action text', () => {
      // Arrange & Act
      render(<ServiceAreaCTA hasServiceArea={false} />);

      // Assert
      expect(screen.getByText(/configurar/i)).toBeInTheDocument();
      expect(screen.getByText(/configura tu zona de operación/i)).toBeInTheDocument();
    });

    it('should explain the benefit of configuring service area', () => {
      // Arrange & Act
      render(<ServiceAreaCTA hasServiceArea={false} />);

      // Assert
      expect(
        screen.getByText(/empezar a recibir solicitudes de clientes cercanos/i)
      ).toBeInTheDocument();
    });
  });
});
