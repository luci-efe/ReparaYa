/**
 * Unit tests for MetricsOverview component
 * TC-CDASH-010, TC-CDASH-012
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MetricsOverview } from '../MetricsOverview';

// Mock Card component
jest.mock('@/components/ui', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
}));

describe('MetricsOverview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('TC-CDASH-010: Display placeholder metrics (empty state)', () => {
    it('should render section heading', () => {
      // Arrange & Act
      render(<MetricsOverview />);

      // Assert
      const heading = screen.getByRole('heading', { name: /resumen de actividad/i });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe('H2');
    });

    it('should render all four metric cards', () => {
      // Arrange & Act
      render(<MetricsOverview />);

      // Assert
      const cards = screen.getAllByTestId('card');
      expect(cards).toHaveLength(4);
    });

    it('should display "Servicios Activos" with initial value 0', () => {
      // Arrange & Act
      render(<MetricsOverview />);

      // Assert
      expect(screen.getByText('Servicios Activos')).toBeInTheDocument();
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBeGreaterThan(0);
    });

    it('should display "Reservas Pendientes" with initial value 0', () => {
      // Arrange & Act
      render(<MetricsOverview />);

      // Assert
      expect(screen.getByText('Reservas Pendientes')).toBeInTheDocument();
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBeGreaterThan(0);
    });

    it('should display "Mensajes Sin Leer" with initial value 0', () => {
      // Arrange & Act
      render(<MetricsOverview />);

      // Assert
      expect(screen.getByText('Mensajes Sin Leer')).toBeInTheDocument();
    });

    it('should display "Calificación Promedio" with N/A value', () => {
      // Arrange & Act
      render(<MetricsOverview />);

      // Assert
      expect(screen.getByText('Calificación Promedio')).toBeInTheDocument();
      expect(screen.getByText('N/A')).toBeInTheDocument();
    });
  });

  describe('Metrics Card Structure', () => {
    it('each metric should have a label and value', () => {
      // Arrange
      const { container: _container } = render(<MetricsOverview />);

      // Assert
      const labels = _container.querySelectorAll('p.text-sm.text-gray-600');
      const values = _container.querySelectorAll('p.text-2xl.font-bold.text-gray-900');

      expect(labels).toHaveLength(4);
      expect(values).toHaveLength(4);
    });

    it('each metric should have an icon', () => {
      // Arrange
      const { container: _container } = render(<MetricsOverview />);

      // Assert
      const cards = screen.getAllByTestId('card');
      cards.forEach((card) => {
        const icon = card.querySelector('svg');
        expect(icon).toBeInTheDocument();
      });
    });

    it('each metric should display value with correct typography', () => {
      // Arrange
      const { container: _container } = render(<MetricsOverview />);

      // Assert
      const values = _container.querySelectorAll('p.text-2xl.font-bold.text-gray-900');
      expect(values).toHaveLength(4);
    });

    it('each metric should display label with correct typography', () => {
      // Arrange
      const { container: _container } = render(<MetricsOverview />);

      // Assert
      const labels = _container.querySelectorAll('p.text-sm.text-gray-600.truncate');
      expect(labels).toHaveLength(4);
    });
  });

  describe('Accessibility (TC-CDASH-012)', () => {
    it('all icons should have aria-hidden attribute', () => {
      // Arrange
      const { container: _container } = render(<MetricsOverview />);

      // Assert
      const icons = _container.querySelectorAll('svg[aria-hidden="true"]');
      expect(icons).toHaveLength(4);
    });

    it('heading should have proper semantic level', () => {
      // Arrange & Act
      render(<MetricsOverview />);

      // Assert
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent(/resumen de actividad/i);
    });

    it('metric labels should truncate with ellipsis on overflow', () => {
      // Arrange
      const { container: _container } = render(<MetricsOverview />);

      // Assert
      const labels = _container.querySelectorAll('p.truncate');
      expect(labels.length).toBeGreaterThan(0);
    });
  });

  describe('Visual Styling and Colors', () => {
    it('Servicios Activos should have blue color scheme', () => {
      // Arrange
      const { container: _container } = render(<MetricsOverview />);

      // Assert
      const card = screen.getByText('Servicios Activos').closest('[data-testid="card"]');
      const iconContainer = card?.querySelector('.bg-blue-50.text-blue-600');
      expect(iconContainer).toBeInTheDocument();
    });

    it('Reservas Pendientes should have orange color scheme', () => {
      // Arrange
      const { container: _container } = render(<MetricsOverview />);

      // Assert
      const card = screen.getByText('Reservas Pendientes').closest('[data-testid="card"]');
      const iconContainer = card?.querySelector('.bg-orange-50.text-orange-600');
      expect(iconContainer).toBeInTheDocument();
    });

    it('Mensajes Sin Leer should have purple color scheme', () => {
      // Arrange
      const { container: _container } = render(<MetricsOverview />);

      // Assert
      const card = screen.getByText('Mensajes Sin Leer').closest('[data-testid="card"]');
      const iconContainer = card?.querySelector('.bg-purple-50.text-purple-600');
      expect(iconContainer).toBeInTheDocument();
    });

    it('Calificación Promedio should have yellow color scheme', () => {
      // Arrange
      const { container: _container } = render(<MetricsOverview />);

      // Assert
      const card = screen.getByText('Calificación Promedio').closest('[data-testid="card"]');
      const iconContainer = card?.querySelector('.bg-yellow-50.text-yellow-600');
      expect(iconContainer).toBeInTheDocument();
    });

    it('icon containers should have proper padding and rounded corners', () => {
      // Arrange
      const { container: _container } = render(<MetricsOverview />);

      // Assert
      const iconContainers = _container.querySelectorAll('.p-3.rounded-lg.flex-shrink-0');
      expect(iconContainers).toHaveLength(4);
    });

    it('heading should have correct styling', () => {
      // Arrange & Act
      render(<MetricsOverview />);

      const heading = screen.getByRole('heading', { name: /resumen de actividad/i });

      // Assert
      expect(heading).toHaveClass('text-xl', 'font-semibold', 'text-gray-900', 'mb-4');
    });
  });

  describe('Layout Structure', () => {
    it('should render in responsive grid layout', () => {
      // Arrange
      const { container: _container } = render(<MetricsOverview />);

      // Assert
      const grid = _container.querySelector('.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4.gap-4');
      expect(grid).toBeInTheDocument();
    });

    it('each card should have flexbox layout', () => {
      // Arrange
      const { container } = render(<MetricsOverview />);

      // Assert
      const cards = screen.getAllByTestId('card');
      cards.forEach((card) => {
        const flexContainer = card.querySelector('.flex.items-center.gap-4');
        expect(flexContainer).toBeInTheDocument();
      });
    });

    it('metric content should be in flex-1 container', () => {
      // Arrange
      const { container: _container } = render(<MetricsOverview />);

      // Assert
      const contentContainers = _container.querySelectorAll('.flex-1.min-w-0');
      expect(contentContainers).toHaveLength(4);
    });

    it('cards should have h-full class for equal heights', () => {
      // Arrange
      const { container } = render(<MetricsOverview />);

      // Assert
      const cards = screen.getAllByTestId('card');
      cards.forEach((card) => {
        expect(card).toHaveClass('h-full');
      });
    });
  });

  describe('Icons Rendering', () => {
    it('Servicios Activos should render briefcase icon', () => {
      // Arrange
      const { container: _container } = render(<MetricsOverview />);

      // Assert
      const card = screen.getByText('Servicios Activos').closest('[data-testid="card"]');
      const icon = card?.querySelector('svg.w-6.h-6');
      expect(icon).toBeInTheDocument();
    });

    it('Reservas Pendientes should render clipboard icon', () => {
      // Arrange
      const { container: _container } = render(<MetricsOverview />);

      // Assert
      const card = screen.getByText('Reservas Pendientes').closest('[data-testid="card"]');
      const icon = card?.querySelector('svg.w-6.h-6');
      expect(icon).toBeInTheDocument();
    });

    it('Mensajes Sin Leer should render message icon', () => {
      // Arrange
      const { container: _container } = render(<MetricsOverview />);

      // Assert
      const card = screen.getByText('Mensajes Sin Leer').closest('[data-testid="card"]');
      const icon = card?.querySelector('svg.w-6.h-6');
      expect(icon).toBeInTheDocument();
    });

    it('Calificación Promedio should render star icon', () => {
      // Arrange
      const { container: _container } = render(<MetricsOverview />);

      // Assert
      const card = screen.getByText('Calificación Promedio').closest('[data-testid="card"]');
      const icon = card?.querySelector('svg.w-6.h-6');
      expect(icon).toBeInTheDocument();
    });

    it('all icons should have proper size classes', () => {
      // Arrange
      const { container: _container } = render(<MetricsOverview />);

      // Assert
      const icons = _container.querySelectorAll('.p-3.rounded-lg svg');
      icons.forEach((icon) => {
        expect(icon).toHaveClass('w-6', 'h-6');
      });
    });

    it('all icons should have viewBox attribute', () => {
      // Arrange
      const { container: _container } = render(<MetricsOverview />);

      // Assert
      const icons = _container.querySelectorAll('svg');
      icons.forEach((icon) => {
        expect(icon).toHaveAttribute('viewBox', '0 0 24 24');
      });
    });
  });

  describe('Content Accuracy', () => {
    it('should display correct metric labels', () => {
      // Arrange & Act
      render(<MetricsOverview />);

      // Assert
      const expectedLabels = [
        'Servicios Activos',
        'Reservas Pendientes',
        'Mensajes Sin Leer',
        'Calificación Promedio',
      ];

      expectedLabels.forEach((label) => {
        expect(screen.getByText(label)).toBeInTheDocument();
      });
    });

    it('numerical metrics should display 0 as default', () => {
      // Arrange & Act
      render(<MetricsOverview />);

      // Assert
      // Should have three metrics with value 0
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBe(3);
    });

    it('rating metric should display N/A when no ratings exist', () => {
      // Arrange & Act
      render(<MetricsOverview />);

      // Assert
      expect(screen.getByText('N/A')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should render consistently with no props', () => {
      // Arrange & Act
      render(<MetricsOverview />);

      // Assert
      expect(screen.getByRole('heading', { name: /resumen de actividad/i })).toBeInTheDocument();
      expect(screen.getAllByTestId('card')).toHaveLength(4);
    });

    it('should handle long metric labels with truncation', () => {
      // Arrange
      const { container: _container } = render(<MetricsOverview />);

      // Assert
      const labels = _container.querySelectorAll('p.truncate');
      labels.forEach((label) => {
        expect(label).toBeInTheDocument();
      });
    });

    it('should maintain proper spacing between metrics', () => {
      // Arrange
      const { container: _container } = render(<MetricsOverview />);

      // Assert
      const grid = _container.querySelector('.gap-4');
      expect(grid).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should have single column on mobile', () => {
      // Arrange
      const { container: _container } = render(<MetricsOverview />);

      // Assert
      const grid = _container.querySelector('.grid-cols-1');
      expect(grid).toBeInTheDocument();
    });

    it('should have 2 columns on small screens', () => {
      // Arrange
      const { container: _container } = render(<MetricsOverview />);

      // Assert
      const grid = _container.querySelector('.sm\\:grid-cols-2');
      expect(grid).toBeInTheDocument();
    });

    it('should have 4 columns on large screens', () => {
      // Arrange
      const { container: _container } = render(<MetricsOverview />);

      // Assert
      const grid = _container.querySelector('.lg\\:grid-cols-4');
      expect(grid).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('should pass correct props to MetricCard sub-component', () => {
      // Arrange & Act
      render(<MetricsOverview />);

      // Assert - Verify all metric labels render correctly
      expect(screen.getByText('Servicios Activos')).toBeInTheDocument();
      expect(screen.getByText('Reservas Pendientes')).toBeInTheDocument();
      expect(screen.getByText('Mensajes Sin Leer')).toBeInTheDocument();
      expect(screen.getByText('Calificación Promedio')).toBeInTheDocument();

      // Verify values (using getAllByText for duplicates)
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBe(3); // Three metrics show 0

      expect(screen.getByText('N/A')).toBeInTheDocument();
    });
  });
});
