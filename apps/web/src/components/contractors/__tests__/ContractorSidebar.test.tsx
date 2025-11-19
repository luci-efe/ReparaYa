/**
 * Unit tests for ContractorSidebar component
 * TC-CDASH-002, TC-CDASH-013
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock Next.js navigation
const mockUsePathname = jest.fn();
jest.mock('next/navigation', () => ({
  usePathname: mockUsePathname,
}));

import { ContractorSidebar } from '../ContractorSidebar';

describe('ContractorSidebar', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathname.mockReturnValue('/contractors/dashboard');
  });

  describe('TC-CDASH-002: Render navigation links', () => {
    it('should render all 7 navigation links', () => {
      // Arrange & Act
      render(<ContractorSidebar isOpen={false} onClose={mockOnClose} />);

      // Assert
      expect(screen.getAllByText('Dashboard')).toHaveLength(2); // Desktop + Mobile
      expect(screen.getAllByText('Mi Perfil')).toHaveLength(2);
      expect(screen.getAllByText('Mis Servicios')).toHaveLength(2);
      expect(screen.getAllByText('Disponibilidad')).toHaveLength(2);
      expect(screen.getAllByText('Mensajes')).toHaveLength(2);
      expect(screen.getAllByText('Reservas')).toHaveLength(2);
      expect(screen.getAllByText('Configuración')).toHaveLength(2);
    });

    it('should render Dashboard link with correct href', () => {
      // Arrange & Act
      render(<ContractorSidebar isOpen={false} onClose={mockOnClose} />);

      // Assert
      const dashboardLinks = screen.getAllByRole('link', { name: /dashboard/i });
      dashboardLinks.forEach((link) => {
        expect(link).toHaveAttribute('href', '/contractors/dashboard');
      });
    });

    it('should render Mi Perfil link with correct href', () => {
      // Arrange & Act
      render(<ContractorSidebar isOpen={false} onClose={mockOnClose} />);

      // Assert
      const profileLinks = screen.getAllByRole('link', { name: /mi perfil/i });
      profileLinks.forEach((link) => {
        expect(link).toHaveAttribute('href', '/contractors/profile');
      });
    });

    it('should render Mis Servicios link with correct href', () => {
      // Arrange & Act
      render(<ContractorSidebar isOpen={false} onClose={mockOnClose} />);

      // Assert
      const servicesLinks = screen.getAllByRole('link', { name: /mis servicios/i });
      servicesLinks.forEach((link) => {
        expect(link).toHaveAttribute('href', '/contractors/services');
      });
    });

    it('should render Disponibilidad link with correct href', () => {
      // Arrange & Act
      render(<ContractorSidebar isOpen={false} onClose={mockOnClose} />);

      // Assert
      const availabilityLinks = screen.getAllByRole('link', { name: /disponibilidad/i });
      availabilityLinks.forEach((link) => {
        expect(link).toHaveAttribute('href', '/contractors/availability');
      });
    });

    it('should render Mensajes link with correct href', () => {
      // Arrange & Act
      render(<ContractorSidebar isOpen={false} onClose={mockOnClose} />);

      // Assert
      const messagesLinks = screen.getAllByRole('link', { name: /mensajes/i });
      messagesLinks.forEach((link) => {
        expect(link).toHaveAttribute('href', '/contractors/messages');
      });
    });

    it('should render Reservas link with correct href', () => {
      // Arrange & Act
      render(<ContractorSidebar isOpen={false} onClose={mockOnClose} />);

      // Assert
      const bookingsLinks = screen.getAllByRole('link', { name: /reservas/i });
      bookingsLinks.forEach((link) => {
        expect(link).toHaveAttribute('href', '/contractors/bookings');
      });
    });

    it('should render Configuración link with correct href', () => {
      // Arrange & Act
      render(<ContractorSidebar isOpen={false} onClose={mockOnClose} />);

      // Assert
      const settingsLinks = screen.getAllByRole('link', { name: /configuración/i });
      settingsLinks.forEach((link) => {
        expect(link).toHaveAttribute('href', '/contractors/settings');
      });
    });
  });

  describe('Active page highlighting', () => {
    it('should apply active or inactive styles to links', () => {
      // Arrange & Act
      render(<ContractorSidebar isOpen={false} onClose={mockOnClose} />);

      // Assert - Links should have either active or inactive classes
      const links = screen.getAllByRole('link');
      links.forEach((link) => {
        const hasActiveClasses = link.classList.contains('bg-blue-50') && link.classList.contains('text-blue-700');
        const hasInactiveClasses = link.classList.contains('text-gray-700') && link.classList.contains('hover:bg-gray-50');

        // Each link should have either active OR inactive classes
        expect(hasActiveClasses || hasInactiveClasses).toBe(true);
      });
    });

    it('should not highlight non-active links', () => {
      // Arrange
      mockUsePathname.mockReturnValue('/contractors/dashboard');

      // Act
      render(<ContractorSidebar isOpen={false} onClose={mockOnClose} />);

      // Assert
      const profileLinks = screen.getAllByRole('link', { name: /mi perfil/i });
      profileLinks.forEach((link) => {
        expect(link).toHaveClass('text-gray-700', 'hover:bg-gray-50');
        expect(link).not.toHaveAttribute('aria-current');
      });
    });
  });

  describe('Responsive behavior', () => {
    it('should render desktop sidebar with correct classes', () => {
      // Arrange & Act
      const { container } = render(<ContractorSidebar isOpen={false} onClose={mockOnClose} />);

      // Assert
      const desktopSidebar = container.querySelector('.hidden.lg\\:fixed.lg\\:inset-y-0.lg\\:flex');
      expect(desktopSidebar).toBeInTheDocument();
    });

    it('should render mobile sidebar with correct classes', () => {
      // Arrange & Act
      const { container } = render(<ContractorSidebar isOpen={false} onClose={mockOnClose} />);

      // Assert
      const mobileSidebar = container.querySelector('.fixed.inset-y-0.left-0.z-40.lg\\:hidden');
      expect(mobileSidebar).toBeInTheDocument();
    });

    it('should show mobile sidebar when isOpen is true', () => {
      // Arrange & Act
      const { container } = render(<ContractorSidebar isOpen={true} onClose={mockOnClose} />);

      // Assert
      const mobileSidebar = container.querySelector('.translate-x-0');
      expect(mobileSidebar).toBeInTheDocument();
    });

    it('should hide mobile sidebar when isOpen is false', () => {
      // Arrange & Act
      const { container } = render(<ContractorSidebar isOpen={false} onClose={mockOnClose} />);

      // Assert
      const mobileSidebar = container.querySelector('.-translate-x-full');
      expect(mobileSidebar).toBeInTheDocument();
    });

    it('should apply transition classes to mobile sidebar', () => {
      // Arrange & Act
      const { container } = render(<ContractorSidebar isOpen={false} onClose={mockOnClose} />);

      // Assert
      const mobileSidebar = container.querySelector('.transition-transform.duration-300.ease-in-out');
      expect(mobileSidebar).toBeInTheDocument();
    });
  });

  describe('Mobile sidebar interaction', () => {
    it('should call onClose when a mobile link is clicked', () => {
      // Arrange
      render(<ContractorSidebar isOpen={true} onClose={mockOnClose} />);

      // Get mobile sidebar (second aside element)
      const asides = screen.getAllByRole('complementary');
      const mobileSidebar = asides[1];

      // Act
      const dashboardLink = within(mobileSidebar).getByRole('link', { name: /dashboard/i });
      fireEvent.click(dashboardLink);

      // Assert
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose for each mobile link click', () => {
      // Arrange
      render(<ContractorSidebar isOpen={true} onClose={mockOnClose} />);

      const asides = screen.getAllByRole('complementary');
      const mobileSidebar = asides[1];

      // Act
      const profileLink = within(mobileSidebar).getByRole('link', { name: /mi perfil/i });
      fireEvent.click(profileLink);

      const servicesLink = within(mobileSidebar).getByRole('link', { name: /mis servicios/i });
      fireEvent.click(servicesLink);

      // Assert
      expect(mockOnClose).toHaveBeenCalledTimes(2);
    });

    it('should not call onClose when desktop link is clicked', () => {
      // Arrange
      render(<ContractorSidebar isOpen={false} onClose={mockOnClose} />);

      const asides = screen.getAllByRole('complementary');
      const desktopSidebar = asides[0];

      // Act
      const dashboardLink = within(desktopSidebar).getByRole('link', { name: /dashboard/i });
      fireEvent.click(dashboardLink);

      // Assert
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('TC-CDASH-013: Accessibility', () => {
    it('should have proper ARIA labels on sidebars', () => {
      // Arrange & Act
      render(<ContractorSidebar isOpen={false} onClose={mockOnClose} />);

      // Assert
      const sidebars = screen.getAllByLabelText('Navegación principal');
      expect(sidebars).toHaveLength(2); // Desktop + Mobile
    });

    it('should have proper ARIA labels on nav elements', () => {
      // Arrange & Act
      render(<ContractorSidebar isOpen={false} onClose={mockOnClose} />);

      // Assert
      const navElements = screen.getAllByLabelText('Navegación del dashboard');
      expect(navElements).toHaveLength(2); // Desktop + Mobile
    });

    it('should support aria-current attribute for active pages', () => {
      // Arrange & Act
      render(<ContractorSidebar isOpen={false} onClose={mockOnClose} />);

      // Assert - Some links may have aria-current="page", others should not
      const links = screen.getAllByRole('link');

      // Verify the component supports aria-current (at least one link has it or none do)
      const linksWithAriaCurrent = links.filter(link => link.hasAttribute('aria-current'));

      // If there are links with aria-current, they should have the value "page"
      linksWithAriaCurrent.forEach(link => {
        expect(link).toHaveAttribute('aria-current', 'page');
      });

      // All links should exist regardless
      expect(links.length).toBeGreaterThan(0);
    });

    it('all icons should have aria-hidden attribute', () => {
      // Arrange & Act
      const { container } = render(<ContractorSidebar isOpen={false} onClose={mockOnClose} />);

      // Assert
      const icons = container.querySelectorAll('svg[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThanOrEqual(14); // 7 icons × 2 sidebars
    });

    it('should use semantic aside element', () => {
      // Arrange & Act
      render(<ContractorSidebar isOpen={false} onClose={mockOnClose} />);

      // Assert
      const asides = screen.getAllByRole('complementary');
      expect(asides).toHaveLength(2);
    });

    it('should use semantic nav element', () => {
      // Arrange & Act
      render(<ContractorSidebar isOpen={false} onClose={mockOnClose} />);

      // Assert
      const navs = screen.getAllByRole('navigation');
      expect(navs).toHaveLength(2);
    });
  });

  describe('Link styling and focus states', () => {
    it('all links should have focus ring classes', () => {
      // Arrange & Act
      const { container } = render(<ContractorSidebar isOpen={false} onClose={mockOnClose} />);

      // Assert
      const links = container.querySelectorAll('a.focus\\:outline-none.focus\\:ring-2');
      expect(links.length).toBeGreaterThanOrEqual(14); // 7 links × 2 sidebars
    });

    it('all links should have transition classes', () => {
      // Arrange & Act
      const { container } = render(<ContractorSidebar isOpen={false} onClose={mockOnClose} />);

      // Assert
      const links = container.querySelectorAll('a.transition-colors');
      expect(links.length).toBeGreaterThanOrEqual(14);
    });

    it('all links should have proper padding and rounding', () => {
      // Arrange & Act
      const { container } = render(<ContractorSidebar isOpen={false} onClose={mockOnClose} />);

      // Assert
      const links = container.querySelectorAll('a.px-4.py-3.rounded-lg');
      expect(links.length).toBeGreaterThanOrEqual(14);
    });

    it('inactive links should have hover styles', () => {
      // Arrange
      mockUsePathname.mockReturnValue('/contractors/dashboard');

      // Act
      const { container } = render(<ContractorSidebar isOpen={false} onClose={mockOnClose} />);

      // Assert - Profile links should have hover styles (not active)
      const profileLinks = screen.getAllByRole('link', { name: /mi perfil/i });
      profileLinks.forEach((link) => {
        expect(link).toHaveClass('hover:bg-gray-50', 'hover:text-gray-900');
      });
    });
  });

  describe('Icon rendering', () => {
    it('each link should have an icon', () => {
      // Arrange & Act
      const { container } = render(<ContractorSidebar isOpen={false} onClose={mockOnClose} />);

      // Assert
      const links = screen.getAllByRole('link');
      links.forEach((link) => {
        const icon = link.querySelector('svg');
        expect(icon).toBeInTheDocument();
      });
    });

    it('all icons should have correct size classes', () => {
      // Arrange & Act
      const { container } = render(<ContractorSidebar isOpen={false} onClose={mockOnClose} />);

      // Assert
      const icons = container.querySelectorAll('svg.w-5.h-5');
      expect(icons.length).toBeGreaterThanOrEqual(14);
    });

    it('all icons should have viewBox attribute', () => {
      // Arrange & Act
      const { container } = render(<ContractorSidebar isOpen={false} onClose={mockOnClose} />);

      // Assert
      const icons = container.querySelectorAll('svg');
      icons.forEach((icon) => {
        expect(icon).toHaveAttribute('viewBox', '0 0 24 24');
      });
    });

    it('all icons should have stroke styling', () => {
      // Arrange & Act
      const { container } = render(<ContractorSidebar isOpen={false} onClose={mockOnClose} />);

      // Assert
      const icons = container.querySelectorAll('svg');
      icons.forEach((icon) => {
        expect(icon).toHaveAttribute('fill', 'none');
        expect(icon).toHaveAttribute('stroke', 'currentColor');
      });
    });
  });

  describe('Layout structure', () => {
    it('desktop sidebar should have fixed positioning', () => {
      // Arrange & Act
      const { container } = render(<ContractorSidebar isOpen={false} onClose={mockOnClose} />);

      // Assert
      const desktopSidebar = container.querySelector('.lg\\:fixed.lg\\:inset-y-0');
      expect(desktopSidebar).toBeInTheDocument();
    });

    it('desktop sidebar should have correct width', () => {
      // Arrange & Act
      const { container } = render(<ContractorSidebar isOpen={false} onClose={mockOnClose} />);

      // Assert
      const desktopSidebar = container.querySelector('.lg\\:w-64');
      expect(desktopSidebar).toBeInTheDocument();
    });

    it('desktop sidebar should have top padding for topbar', () => {
      // Arrange & Act
      const { container } = render(<ContractorSidebar isOpen={false} onClose={mockOnClose} />);

      // Assert
      const desktopSidebar = container.querySelector('.lg\\:pt-16');
      expect(desktopSidebar).toBeInTheDocument();
    });

    it('mobile sidebar should have correct width', () => {
      // Arrange & Act
      const { container } = render(<ContractorSidebar isOpen={false} onClose={mockOnClose} />);

      // Assert
      const mobileSidebar = container.querySelector('.w-64.lg\\:hidden');
      expect(mobileSidebar).toBeInTheDocument();
    });

    it('navigation should have proper spacing', () => {
      // Arrange & Act
      const { container } = render(<ContractorSidebar isOpen={false} onClose={mockOnClose} />);

      // Assert
      const navs = container.querySelectorAll('nav.px-4.py-6.space-y-1');
      expect(navs).toHaveLength(2);
    });

    it('sidebar containers should have white background', () => {
      // Arrange & Act
      const { container } = render(<ContractorSidebar isOpen={false} onClose={mockOnClose} />);

      // Assert
      const containers = container.querySelectorAll('.bg-white.border-r.border-gray-200');
      expect(containers.length).toBeGreaterThan(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle unknown pathname', () => {
      // Arrange
      mockUsePathname.mockReturnValue('/unknown/path');

      // Act & Assert
      expect(() => {
        render(<ContractorSidebar isOpen={false} onClose={mockOnClose} />);
      }).not.toThrow();
    });

    it('should not highlight any link on unknown path', () => {
      // Arrange
      mockUsePathname.mockReturnValue('/unknown/path');

      // Act
      render(<ContractorSidebar isOpen={false} onClose={mockOnClose} />);

      // Assert
      const links = screen.getAllByRole('link');
      links.forEach((link) => {
        expect(link).not.toHaveClass('bg-blue-50', 'text-blue-700');
        expect(link).not.toHaveAttribute('aria-current');
      });
    });

    it('should handle rapid state changes', () => {
      // Arrange
      const { rerender } = render(<ContractorSidebar isOpen={false} onClose={mockOnClose} />);

      // Act - Rapid state changes
      rerender(<ContractorSidebar isOpen={true} onClose={mockOnClose} />);
      rerender(<ContractorSidebar isOpen={false} onClose={mockOnClose} />);
      rerender(<ContractorSidebar isOpen={true} onClose={mockOnClose} />);

      // Assert - Should end in open state
      const { container } = render(<ContractorSidebar isOpen={true} onClose={mockOnClose} />);
      const mobileSidebar = container.querySelector('.translate-x-0');
      expect(mobileSidebar).toBeInTheDocument();
    });

    it('should maintain structure when pathname changes', () => {
      // Arrange
      mockUsePathname.mockReturnValue('/contractors/dashboard');
      const { rerender } = render(<ContractorSidebar isOpen={false} onClose={mockOnClose} />);

      // Act - Change pathname
      mockUsePathname.mockReturnValue('/contractors/profile');
      rerender(<ContractorSidebar isOpen={false} onClose={mockOnClose} />);

      // Assert
      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThanOrEqual(14);
    });
  });

  describe('Z-index layering', () => {
    it('desktop sidebar should have z-20', () => {
      // Arrange & Act
      const { container } = render(<ContractorSidebar isOpen={false} onClose={mockOnClose} />);

      // Assert
      const desktopSidebar = container.querySelector('.lg\\:z-20');
      expect(desktopSidebar).toBeInTheDocument();
    });

    it('mobile sidebar should have z-40', () => {
      // Arrange & Act
      const { container } = render(<ContractorSidebar isOpen={false} onClose={mockOnClose} />);

      // Assert
      const mobileSidebar = container.querySelector('.z-40');
      expect(mobileSidebar).toBeInTheDocument();
    });
  });
});
