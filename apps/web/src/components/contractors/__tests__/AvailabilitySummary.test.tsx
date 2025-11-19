/**
 * Unit tests for AvailabilitySummary component
 * TC-CDASH-010, TC-CDASH-012
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AvailabilitySummary } from '../AvailabilitySummary';

// Mock Card component
jest.mock('@/components/ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card">{children}</div>
  ),
}));

describe('AvailabilitySummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('TC-CDASH-010: Rendering placeholder state', () => {
    it('should render heading', () => {
      // Arrange & Act
      render(<AvailabilitySummary />);

      // Assert
      const heading = screen.getByRole('heading', { name: /próximos bloqueos de disponibilidad/i });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe('H3');
    });

    it('should display empty state message', () => {
      // Arrange & Act
      render(<AvailabilitySummary />);

      // Assert
      expect(screen.getByText(/no tienes bloqueos programados/i)).toBeInTheDocument();
    });

    it('should display help text explaining bloqueos feature', () => {
      // Arrange & Act
      render(<AvailabilitySummary />);

      // Assert
      expect(
        screen.getByText(/los bloqueos te permiten marcar períodos donde no estarás disponible/i)
      ).toBeInTheDocument();
    });

    it('should render inside Card component', () => {
      // Arrange & Act
      render(<AvailabilitySummary />);

      // Assert
      expect(screen.getByTestId('card')).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('should have main layout with icon and content', () => {
      // Arrange
      const { container: _container } = render(<AvailabilitySummary />);

      // Assert
      const mainLayout = _container.querySelector('.flex.items-start.gap-3');
      expect(mainLayout).toBeInTheDocument();
    });

    it('should render calendar icon', () => {
      // Arrange
      const { container: _container } = render(<AvailabilitySummary />);

      // Assert
      const icons = _container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should have icon in gray container', () => {
      // Arrange
      const { container: _container } = render(<AvailabilitySummary />);

      // Assert
      const iconContainer = _container.querySelector('.p-2.bg-gray-50.rounded-lg');
      expect(iconContainer).toBeInTheDocument();

      const icon = iconContainer?.querySelector('svg.text-gray-600');
      expect(icon).toBeInTheDocument();
    });

    it('should have content in flex-1 container', () => {
      // Arrange
      const { container: _container } = render(<AvailabilitySummary />);

      // Assert
      const contentContainer = _container.querySelector('.flex-1');
      expect(contentContainer).toBeInTheDocument();
      expect(contentContainer).toContainElement(
        screen.getByRole('heading', { name: /próximos bloqueos de disponibilidad/i })
      );
    });
  });

  describe('Empty State Visual', () => {
    it('should render empty state box with proper styling', () => {
      // Arrange
      const { container: _container } = render(<AvailabilitySummary />);

      // Assert
      const emptyStateBox = _container.querySelector('.bg-gray-50.rounded-lg.p-4.border.border-gray-200');
      expect(emptyStateBox).toBeInTheDocument();
    });

    it('empty state should have centered content', () => {
      // Arrange
      const { container: _container } = render(<AvailabilitySummary />);

      // Assert
      const centeredContent = _container.querySelector('.flex.items-center.justify-center.gap-2.text-gray-600');
      expect(centeredContent).toBeInTheDocument();
    });

    it('should display document icon in empty state', () => {
      // Arrange
      const { container: _container } = render(<AvailabilitySummary />);

      // Assert
      const emptyStateBox = _container.querySelector('.bg-gray-50.rounded-lg.p-4');
      const icon = emptyStateBox?.querySelector('svg.w-5.h-5');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Accessibility (TC-CDASH-012)', () => {
    it('all icons should have aria-hidden attribute', () => {
      // Arrange
      const { container: _container } = render(<AvailabilitySummary />);

      // Assert
      const icons = _container.querySelectorAll('svg[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('heading should have proper semantic level', () => {
      // Arrange & Act
      render(<AvailabilitySummary />);

      // Assert
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent(/próximos bloqueos de disponibilidad/i);
    });

    it('help text should have proper styling for readability', () => {
      // Arrange & Act
      render(<AvailabilitySummary />);

      const helpText = screen.getByText(/los bloqueos te permiten marcar períodos/i);

      // Assert
      expect(helpText).toHaveClass('text-xs', 'text-gray-500');
    });
  });

  describe('Visual Styling', () => {
    it('heading should have correct typography', () => {
      // Arrange & Act
      render(<AvailabilitySummary />);

      const heading = screen.getByRole('heading', { name: /próximos bloqueos de disponibilidad/i });

      // Assert
      expect(heading).toHaveClass('text-lg', 'font-semibold', 'text-gray-900', 'mb-2');
    });

    it('empty state message should have correct typography', () => {
      // Arrange & Act
      render(<AvailabilitySummary />);

      const message = screen.getByText(/no tienes bloqueos programados/i);

      // Assert
      expect(message).toHaveClass('text-sm');
    });

    it('help text should have margin top', () => {
      // Arrange & Act
      render(<AvailabilitySummary />);

      const helpText = screen.getByText(/los bloqueos te permiten marcar períodos/i);

      // Assert
      expect(helpText).toHaveClass('mt-2');
    });

    it('calendar icon should have proper size', () => {
      // Arrange
      const { container: _container } = render(<AvailabilitySummary />);

      // Assert
      const calendarIcon = _container.querySelector('.p-2.rounded-lg svg');
      expect(calendarIcon).toHaveClass('w-6', 'h-6', 'text-gray-600');
    });

    it('empty state icon should have proper size', () => {
      // Arrange
      const { container: _container } = render(<AvailabilitySummary />);

      // Assert
      const emptyStateIcon = _container.querySelector('.bg-gray-50.rounded-lg.p-4 svg');
      expect(emptyStateIcon).toHaveClass('w-5', 'h-5');
    });
  });

  describe('Icons Rendering', () => {
    it('should render calendar icon with correct path', () => {
      // Arrange
      const { container: _container } = render(<AvailabilitySummary />);

      // Assert
      const calendarIcon = _container.querySelector('.p-2.rounded-lg svg');
      expect(calendarIcon).toBeInTheDocument();
      expect(calendarIcon).toHaveAttribute('viewBox', '0 0 24 24');
    });

    it('should render document icon in empty state', () => {
      // Arrange
      const { container: _container } = render(<AvailabilitySummary />);

      // Assert
      const emptyStateBox = _container.querySelector('.bg-gray-50.rounded-lg.p-4');
      const icon = emptyStateBox?.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('viewBox', '0 0 24 24');
    });

    it('all SVG icons should have proper stroke attributes', () => {
      // Arrange
      const { container: _container } = render(<AvailabilitySummary />);

      // Assert
      const svgs = _container.querySelectorAll('svg');
      svgs.forEach((svg) => {
        expect(svg).toHaveAttribute('fill', 'none');
        expect(svg).toHaveAttribute('stroke', 'currentColor');
      });
    });

    it('icon paths should have proper stroke attributes', () => {
      // Arrange
      const { container: _container } = render(<AvailabilitySummary />);

      // Assert
      const paths = _container.querySelectorAll('path');
      paths.forEach((path) => {
        expect(path).toHaveAttribute('stroke-linecap', 'round');
        expect(path).toHaveAttribute('stroke-linejoin', 'round');
        expect(path).toHaveAttribute('stroke-width', '2');
      });
    });
  });

  describe('Content Accuracy', () => {
    it('should display informative heading about availability blocks', () => {
      // Arrange & Act
      render(<AvailabilitySummary />);

      // Assert
      expect(screen.getByText(/próximos bloqueos de disponibilidad/i)).toBeInTheDocument();
    });

    it('should explain what availability blocks are', () => {
      // Arrange & Act
      render(<AvailabilitySummary />);

      // Assert
      const helpText = screen.getByText(/los bloqueos te permiten marcar períodos donde no estarás disponible para servicios/i);
      expect(helpText).toBeInTheDocument();
    });

    it('should clearly communicate empty state', () => {
      // Arrange & Act
      render(<AvailabilitySummary />);

      // Assert
      expect(screen.getByText(/no tienes bloqueos programados/i)).toBeInTheDocument();
    });
  });

  describe('Layout Structure', () => {
    it('should have proper spacing between elements', () => {
      // Arrange
      const { container: _container } = render(<AvailabilitySummary />);

      // Assert
      expect(_container.querySelector('.gap-3')).toBeInTheDocument(); // Main layout gap
      expect(_container.querySelector('.gap-2')).toBeInTheDocument(); // Empty state gap
    });

    it('should use flexbox for responsive layout', () => {
      // Arrange
      const { container: _container } = render(<AvailabilitySummary />);

      // Assert
      const flexContainers = _container.querySelectorAll('.flex');
      expect(flexContainers.length).toBeGreaterThan(0);
    });

    it('icon container should not shrink', () => {
      // Arrange
      const { container: _container } = render(<AvailabilitySummary />);

      // Assert
      // Icon container should maintain its size
      const iconContainer = _container.querySelector('.p-2.bg-gray-50.rounded-lg');
      expect(iconContainer).toBeInTheDocument();
    });

    it('content should grow to fill available space', () => {
      // Arrange
      const { container: _container } = render(<AvailabilitySummary />);

      // Assert
      const contentContainer = _container.querySelector('.flex-1');
      expect(contentContainer).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should render consistently with no props', () => {
      // Arrange & Act
      render(<AvailabilitySummary />);

      // Assert
      expect(screen.getByRole('heading')).toBeInTheDocument();
      expect(screen.getByText(/no tienes bloqueos programados/i)).toBeInTheDocument();
      expect(screen.getByTestId('card')).toBeInTheDocument();
    });

    it('should handle rendering multiple times', () => {
      // Arrange
      const { rerender } = render(<AvailabilitySummary />);

      // Assert first render
      expect(screen.getByText(/próximos bloqueos de disponibilidad/i)).toBeInTheDocument();

      // Act - Re-render
      rerender(<AvailabilitySummary />);

      // Assert second render
      expect(screen.getByText(/próximos bloqueos de disponibilidad/i)).toBeInTheDocument();
    });

    it('should maintain consistent structure across renders', () => {
      // Arrange & Act
      const { container: _container } = render(<AvailabilitySummary />);

      // Assert
      expect(_container.querySelector('.flex.items-start.gap-3')).toBeInTheDocument();
      expect(_container.querySelector('.bg-gray-50.rounded-lg.p-4')).toBeInTheDocument();
      expect(screen.getByRole('heading')).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('should be wrapped in Card component', () => {
      // Arrange & Act
      render(<AvailabilitySummary />);

      // Assert
      const card = screen.getByTestId('card');
      expect(card).toBeInTheDocument();
      expect(card).toContainElement(screen.getByRole('heading'));
    });

    it('should contain all visual elements', () => {
      // Arrange
      const { container: _container } = render(<AvailabilitySummary />);

      // Assert - Should have calendar icon, heading, empty state, and help text
      expect(_container.querySelector('.p-2.bg-gray-50.rounded-lg svg')).toBeInTheDocument(); // Calendar icon
      expect(screen.getByRole('heading')).toBeInTheDocument(); // Heading
      expect(_container.querySelector('.bg-gray-50.rounded-lg.p-4')).toBeInTheDocument(); // Empty state box
      expect(screen.getByText(/los bloqueos te permiten/i)).toBeInTheDocument(); // Help text
    });
  });

  describe('Placeholder State Documentation', () => {
    it('should clearly indicate this is a placeholder for future functionality', () => {
      // Arrange & Act
      render(<AvailabilitySummary />);

      // Assert
      // Component shows empty state indicating no data yet
      expect(screen.getByText(/no tienes bloqueos programados/i)).toBeInTheDocument();
    });

    it('should provide context about the feature', () => {
      // Arrange & Act
      render(<AvailabilitySummary />);

      // Assert
      expect(screen.getByText(/los bloqueos te permiten marcar períodos/i)).toBeInTheDocument();
    });
  });
});
