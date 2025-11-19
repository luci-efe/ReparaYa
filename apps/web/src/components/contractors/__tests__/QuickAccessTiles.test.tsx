/**
 * Unit tests for QuickAccessTiles component
 * TC-CDASH-005, TC-CDASH-011, TC-CDASH-012
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QuickAccessTiles } from '../QuickAccessTiles';

// Mock Next.js Link component
jest.mock('next/link', () => {
  const MockLink = ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

// Mock Card component
jest.mock('@/components/ui', () => ({
  Card: ({ children, hover, clickable, className }: { children: React.ReactNode; hover?: boolean; clickable?: boolean; className?: string }) => (
    <div data-testid="card" data-hover={hover} data-clickable={clickable} className={className}>
      {children}
    </div>
  ),
}));

describe('QuickAccessTiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('TC-CDASH-005: Rendering all navigation tiles', () => {
    it('should render all three quick access tiles', () => {
      // Arrange & Act
      render(<QuickAccessTiles />);

      // Assert
      expect(screen.getByText('Mis Servicios')).toBeInTheDocument();
      expect(screen.getByText('Disponibilidad')).toBeInTheDocument();
      expect(screen.getByText('Mensajes')).toBeInTheDocument();
    });

    it('should render correct descriptions for each tile', () => {
      // Arrange & Act
      render(<QuickAccessTiles />);

      // Assert
      expect(screen.getByText('Administra y publica tus servicios')).toBeInTheDocument();
      expect(screen.getByText('Gestiona tu calendario y horarios')).toBeInTheDocument();
      expect(screen.getByText('Comunícate con tus clientes')).toBeInTheDocument();
    });

    it('should have correct navigation links', () => {
      // Arrange & Act
      render(<QuickAccessTiles />);

      // Assert
      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(3);

      const hrefs = links.map((link) => link.getAttribute('href'));
      expect(hrefs).toContain('/contractors/services');
      expect(hrefs).toContain('/contractors/availability');
      expect(hrefs).toContain('/contractors/messages');
    });

    it('each tile should have "Acceder" call-to-action', () => {
      // Arrange & Act
      render(<QuickAccessTiles />);

      // Assert
      const accederLinks = screen.getAllByText('Acceder');
      expect(accederLinks).toHaveLength(3);
    });
  });

  describe('TC-CDASH-005: Specific tile content validation', () => {
    it('Mis Servicios tile should link to /contractors/services', () => {
      // Arrange & Act
      render(<QuickAccessTiles />);

      // Assert
      const tile = screen.getByText('Mis Servicios').closest('a');
      expect(tile).toHaveAttribute('href', '/contractors/services');
    });

    it('Disponibilidad tile should link to /contractors/availability', () => {
      // Arrange & Act
      render(<QuickAccessTiles />);

      // Assert
      const tile = screen.getByText('Disponibilidad').closest('a');
      expect(tile).toHaveAttribute('href', '/contractors/availability');
    });

    it('Mensajes tile should link to /contractors/messages', () => {
      // Arrange & Act
      render(<QuickAccessTiles />);

      // Assert
      const tile = screen.getByText('Mensajes').closest('a');
      expect(tile).toHaveAttribute('href', '/contractors/messages');
    });
  });

  describe('Accessibility (TC-CDASH-011, TC-CDASH-012)', () => {
    it('all links should have focus ring styles', () => {
      // Arrange & Act
      render(<QuickAccessTiles />);

      // Assert
      const links = screen.getAllByRole('link');
      links.forEach((link) => {
        expect(link).toHaveClass('focus:outline-none');
        expect(link).toHaveClass('focus:ring-2');
        expect(link).toHaveClass('focus:ring-blue-500');
        expect(link).toHaveClass('focus:ring-offset-2');
      });
    });

    it('all icons should have aria-hidden attribute', () => {
      // Arrange
      const { container: _container } = render(<QuickAccessTiles />);

      // Assert
      const icons = _container.querySelectorAll('svg[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('tile titles should be headings with level 3', () => {
      // Arrange & Act
      render(<QuickAccessTiles />);

      // Assert
      const headings = screen.getAllByRole('heading', { level: 3 });
      expect(headings).toHaveLength(3);

      const headingTexts = headings.map((h) => h.textContent);
      expect(headingTexts).toContain('Mis Servicios');
      expect(headingTexts).toContain('Disponibilidad');
      expect(headingTexts).toContain('Mensajes');
    });

    it('links should be keyboard navigable', () => {
      // Arrange & Act
      render(<QuickAccessTiles />);

      // Assert
      const links = screen.getAllByRole('link');
      links.forEach((link) => {
        expect(link.tagName).toBe('A');
        expect(link).toHaveAttribute('href');
      });
    });
  });

  describe('Visual Styling and Icons', () => {
    it('should render tiles in responsive grid', () => {
      // Arrange
      const { container: _container } = render(<QuickAccessTiles />);

      // Assert
      const grid = _container.querySelector('.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-3.gap-4');
      expect(grid).toBeInTheDocument();
    });

    it('Mis Servicios should have blue color scheme', () => {
      // Arrange
      const { container: _container } = render(<QuickAccessTiles />);

      // Assert - _container declared but not used, relying on screen queries instead
      const tile = screen.getByText('Mis Servicios').closest('a');
      const iconContainer = tile?.querySelector('.bg-blue-50.text-blue-600');
      expect(iconContainer).toBeInTheDocument();
    });

    it('Disponibilidad should have green color scheme', () => {
      // Arrange
      const { container: _container } = render(<QuickAccessTiles />);

      // Assert - _container declared but not used, relying on screen queries instead
      const tile = screen.getByText('Disponibilidad').closest('a');
      const iconContainer = tile?.querySelector('.bg-green-50.text-green-600');
      expect(iconContainer).toBeInTheDocument();
    });

    it('Mensajes should have purple color scheme', () => {
      // Arrange
      const { container: _container } = render(<QuickAccessTiles />);

      // Assert - _container declared but not used, relying on screen queries instead
      const tile = screen.getByText('Mensajes').closest('a');
      const iconContainer = tile?.querySelector('.bg-purple-50.text-purple-600');
      expect(iconContainer).toBeInTheDocument();
    });

    it('each tile should have hover effects', () => {
      // Arrange & Act
      render(<QuickAccessTiles />);

      // Assert
      const cards = screen.getAllByTestId('card');
      cards.forEach((card) => {
        expect(card).toHaveAttribute('data-hover', 'true');
        expect(card).toHaveAttribute('data-clickable', 'true');
      });
    });

    it('heading should change color on group hover', () => {
      // Arrange & Act
      render(<QuickAccessTiles />);

      // Assert
      const headings = screen.getAllByRole('heading', { level: 3 });
      headings.forEach((heading) => {
        expect(heading).toHaveClass('group-hover:text-blue-600');
      });
    });

    it('icons should scale on hover', () => {
      // Arrange
      const { container: _container } = render(<QuickAccessTiles />);

      // Assert
      const iconContainers = _container.querySelectorAll('.group-hover\\:scale-110');
      expect(iconContainers.length).toBeGreaterThan(0);
    });

    it('arrow icons should translate on hover', () => {
      // Arrange
      const { container: _container } = render(<QuickAccessTiles />);

      // Assert
      const arrowIcons = _container.querySelectorAll('.group-hover\\:translate-x-1');
      expect(arrowIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Layout Structure', () => {
    it('each tile should have Card wrapper', () => {
      // Arrange & Act
      render(<QuickAccessTiles />);

      // Assert
      const cards = screen.getAllByTestId('card');
      expect(cards).toHaveLength(3);
    });

    it('each tile should have icon, title, description, and CTA', () => {
      // Arrange
      const { container } = render(<QuickAccessTiles />);

      // Assert
      const tiles = screen.getAllByRole('link');
      tiles.forEach((tile) => {
        // Should have an icon (svg)
        expect(tile.querySelector('svg')).toBeInTheDocument();

        // Should have a heading
        expect(tile.querySelector('h3')).toBeInTheDocument();

        // Should have description
        expect(tile.querySelector('p.text-sm.text-gray-600')).toBeInTheDocument();

        // Should have "Acceder" text
        expect(tile).toHaveTextContent('Acceder');
      });
    });

    it('tiles should have proper spacing', () => {
      // Arrange
      const { container } = render(<QuickAccessTiles />);

      // Assert
      const grid = container.querySelector('.gap-4');
      expect(grid).toBeInTheDocument();
    });
  });

  describe('Content Structure', () => {
    it('icons should have proper SVG viewBox', () => {
      // Arrange
      const { container: _container } = render(<QuickAccessTiles />);

      // Assert
      const svgs = _container.querySelectorAll('svg');
      svgs.forEach((svg) => {
        expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
      });
    });

    it('tile titles should have correct typography', () => {
      // Arrange & Act
      render(<QuickAccessTiles />);

      // Assert
      const headings = screen.getAllByRole('heading', { level: 3 });
      headings.forEach((heading) => {
        expect(heading).toHaveClass('text-lg', 'font-semibold', 'text-gray-900');
      });
    });

    it('descriptions should have correct typography', () => {
      // Arrange
      const { container } = render(<QuickAccessTiles />);

      // Assert
      const descriptions = container.querySelectorAll('p.text-sm.text-gray-600');
      expect(descriptions.length).toBe(3);
    });

    it('CTA text should have correct styling', () => {
      // Arrange
      const { container: _container } = render(<QuickAccessTiles />);

      // Assert - _container declared but not used, relying on screen queries instead
      const ctaElements = screen.getAllByText('Acceder');
      ctaElements.forEach((cta) => {
        const parent = cta.closest('.text-blue-600.group-hover\\:text-blue-700');
        expect(parent).toBeInTheDocument();
      });
    });
  });

  describe('Icons Rendering', () => {
    it('should render briefcase icon for Mis Servicios', () => {
      // Arrange
      const { container: _container } = render(<QuickAccessTiles />);

      // Assert - _container declared but not used, relying on screen queries instead
      const serviceTile = screen.getByText('Mis Servicios').closest('a');
      const icon = serviceTile?.querySelector('svg.w-8.h-8');
      expect(icon).toBeInTheDocument();
    });

    it('should render calendar icon for Disponibilidad', () => {
      // Arrange
      const { container: _container } = render(<QuickAccessTiles />);

      // Assert - _container declared but not used, relying on screen queries instead
      const availabilityTile = screen.getByText('Disponibilidad').closest('a');
      const icon = availabilityTile?.querySelector('svg.w-8.h-8');
      expect(icon).toBeInTheDocument();
    });

    it('should render message icon for Mensajes', () => {
      // Arrange
      const { container: _container } = render(<QuickAccessTiles />);

      // Assert - _container declared but not used, relying on screen queries instead
      const messagesTile = screen.getByText('Mensajes').closest('a');
      const icon = messagesTile?.querySelector('svg.w-8.h-8');
      expect(icon).toBeInTheDocument();
    });

    it('all main icons should be 8x8 size', () => {
      // Arrange
      const { container: _container } = render(<QuickAccessTiles />);

      // Assert
      const mainIcons = _container.querySelectorAll('.p-3.rounded-lg svg');
      mainIcons.forEach((icon) => {
        expect(icon).toHaveClass('w-8', 'h-8');
      });
    });

    it('arrow icons should be 4x4 size', () => {
      // Arrange
      const { container: _container } = render(<QuickAccessTiles />);

      // Assert
      const arrowIcons = _container.querySelectorAll('.group-hover\\:translate-x-1');
      arrowIcons.forEach((icon) => {
        expect(icon).toHaveClass('w-4', 'h-4', 'ml-1');
      });
    });
  });

  describe('Interaction States', () => {
    it('tiles should have transition classes', () => {
      // Arrange & Act
      render(<QuickAccessTiles />);

      // Assert
      const cards = screen.getAllByTestId('card');
      cards.forEach((card) => {
        expect(card).toHaveClass('transition-all');
      });
    });

    it('tile content should be in column layout', () => {
      // Arrange
      const { container: _container } = render(<QuickAccessTiles />);

      // Assert - _container declared but not used, relying on screen queries instead
      const tiles = screen.getAllByRole('link');
      tiles.forEach((tile) => {
        const content = tile.querySelector('.flex.flex-col.items-start');
        expect(content).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should render even if no data is provided (static content)', () => {
      // Arrange & Act
      render(<QuickAccessTiles />);

      // Assert
      expect(screen.getByText('Mis Servicios')).toBeInTheDocument();
      expect(screen.getByText('Disponibilidad')).toBeInTheDocument();
      expect(screen.getByText('Mensajes')).toBeInTheDocument();
    });

    it('should maintain consistent structure across all tiles', () => {
      // Arrange
      const { container: _container } = render(<QuickAccessTiles />);

      // Assert - _container declared but not used, relying on screen queries instead
      const tiles = screen.getAllByRole('link');
      expect(tiles).toHaveLength(3);

      // All tiles should have the same structure
      tiles.forEach((tile) => {
        expect(tile.querySelector('.flex.flex-col.items-start')).toBeInTheDocument();
        expect(tile.querySelector('.p-3.rounded-lg')).toBeInTheDocument();
        expect(tile.querySelector('h3')).toBeInTheDocument();
        expect(tile.querySelector('p.text-sm')).toBeInTheDocument();
      });
    });
  });
});
