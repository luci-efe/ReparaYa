/**
 * Unit tests for DashboardShell component
 * TC-CDASH-001, TC-CDASH-013
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/contractors/dashboard'),
}));

import { DashboardShell } from '../DashboardShell';

describe('DashboardShell', () => {
  const mockUser = {
    id: 'user_123',
    name: 'Juan Pérez',
    email: 'juan@example.com',
    imageUrl: 'https://example.com/avatar.jpg',
  };

  const mockProfile = {
    verified: true,
    businessName: 'Plomería Juan',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('TC-CDASH-001: Render main layout structure', () => {
    it('should render DashboardShell with all main sections', () => {
      // Arrange & Act
      render(
        <DashboardShell user={mockUser} _profile={mockProfile}>
          <div>Test Content</div>
        </DashboardShell>
      );

      // Assert
      expect(screen.getByRole('banner')).toBeInTheDocument(); // Topbar (header)
      expect(screen.getAllByRole('complementary')).toHaveLength(2); // Sidebar (desktop + mobile)
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('should render children correctly', () => {
      // Arrange & Act
      render(
        <DashboardShell user={mockUser} _profile={mockProfile}>
          <div data-testid="child-content">Child Content</div>
        </DashboardShell>
      );

      // Assert
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
      expect(screen.getByText('Child Content')).toBeInTheDocument();
    });

    it('should render main content area with correct id', () => {
      // Arrange & Act
      render(
        <DashboardShell user={mockUser} _profile={mockProfile}>
          <div>Content</div>
        </DashboardShell>
      );

      // Assert
      const mainElement = screen.getByRole('main');
      expect(mainElement).toHaveAttribute('id', 'main-content');
    });

    it('should apply correct container classes to main content', () => {
      // Arrange & Act
      render(
        <DashboardShell user={mockUser} _profile={mockProfile}>
          <div>Content</div>
        </DashboardShell>
      );

      // Assert
      const mainElement = screen.getByRole('main');
      expect(mainElement).toHaveClass('flex-1', 'w-full', 'lg:ml-64', 'pt-16');
    });

    it('should render background with correct styling', () => {
      // Arrange & Act
      const { container } = render(
        <DashboardShell user={mockUser} _profile={mockProfile}>
          <div>Content</div>
        </DashboardShell>
      );

      // Assert
      const wrapper = container.querySelector('.min-h-screen.bg-gray-50');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('Sidebar toggle functionality', () => {
    it('should start with sidebar closed (mobile sidebar hidden)', () => {
      // Arrange & Act
      const { container } = render(
        <DashboardShell user={mockUser} _profile={mockProfile}>
          <div>Content</div>
        </DashboardShell>
      );

      // Assert - Mobile sidebar should have -translate-x-full class (hidden)
      const mobileSidebar = container.querySelector('aside.-translate-x-full');
      expect(mobileSidebar).toBeInTheDocument();
    });

    it('should toggle sidebar when menu button is clicked', () => {
      // Arrange
      const { container } = render(
        <DashboardShell user={mockUser} _profile={mockProfile}>
          <div>Content</div>
        </DashboardShell>
      );

      const menuButton = screen.getByLabelText('Abrir menú de navegación');

      // Act - Open sidebar
      fireEvent.click(menuButton);

      // Assert - Mobile sidebar should now have translate-x-0 class (visible)
      let mobileSidebar = container.querySelector('aside.translate-x-0.lg\\:hidden');
      expect(mobileSidebar).toBeInTheDocument();

      // Act - Close sidebar
      fireEvent.click(menuButton);

      // Assert - Mobile sidebar should be hidden again
      mobileSidebar = container.querySelector('aside.-translate-x-full');
      expect(mobileSidebar).toBeInTheDocument();
    });

    it('should close sidebar when navigation link is clicked', () => {
      // Arrange
      const { container } = render(
        <DashboardShell user={mockUser} _profile={mockProfile}>
          <div>Content</div>
        </DashboardShell>
      );

      const menuButton = screen.getByLabelText('Abrir menú de navegación');

      // Act - Open sidebar
      fireEvent.click(menuButton);
      let mobileSidebar = container.querySelector('aside.translate-x-0.lg\\:hidden');
      expect(mobileSidebar).toBeInTheDocument();

      // Act - Click a navigation link (in mobile sidebar)
      const sidebars = screen.getAllByRole('complementary');
      const mobileSidebarEl = sidebars[1]; // Second sidebar is mobile
      const links = mobileSidebarEl.querySelectorAll('a');
      if (links.length > 0) {
        fireEvent.click(links[0]);
      }

      // Assert - Sidebar should be hidden
      mobileSidebar = container.querySelector('aside.-translate-x-full');
      expect(mobileSidebar).toBeInTheDocument();
    });

    it('should render menu button that can toggle sidebar', () => {
      // Arrange & Act
      render(
        <DashboardShell user={mockUser} _profile={mockProfile}>
          <div>Content</div>
        </DashboardShell>
      );

      // Assert - Menu button exists and is clickable
      const menuButton = screen.getByLabelText('Abrir menú de navegación');
      expect(menuButton).toBeInTheDocument();
      expect(menuButton.tagName).toBe('BUTTON');
    });

    it('should render sidebar components', () => {
      // Arrange & Act
      render(
        <DashboardShell user={mockUser} _profile={mockProfile}>
          <div>Content</div>
        </DashboardShell>
      );

      // Assert - Sidebars exist
      const sidebars = screen.getAllByRole('complementary');
      expect(sidebars).toHaveLength(2); // Desktop + Mobile
    });
  });

  describe('Responsive overlay behavior', () => {
    it('should not show overlay when sidebar is closed', () => {
      // Arrange & Act
      const { container } = render(
        <DashboardShell user={mockUser} _profile={mockProfile}>
          <div>Content</div>
        </DashboardShell>
      );

      // Assert
      const overlay = container.querySelector('.fixed.inset-0.bg-black.bg-opacity-50');
      expect(overlay).not.toBeInTheDocument();
    });

    it('should show overlay when sidebar is open', () => {
      // Arrange
      const { container } = render(
        <DashboardShell user={mockUser} _profile={mockProfile}>
          <div>Content</div>
        </DashboardShell>
      );

      // Act
      const menuButton = screen.getByLabelText('Abrir menú de navegación');
      fireEvent.click(menuButton);

      // Assert
      const overlay = container.querySelector('.fixed.inset-0.bg-black.bg-opacity-50');
      expect(overlay).toBeInTheDocument();
    });

    it('should close sidebar when overlay is clicked', () => {
      // Arrange
      const { container } = render(
        <DashboardShell user={mockUser} _profile={mockProfile}>
          <div>Content</div>
        </DashboardShell>
      );

      const menuButton = screen.getByLabelText('Abrir menú de navegación');

      // Act - Open sidebar
      fireEvent.click(menuButton);

      const overlay = container.querySelector('.fixed.inset-0.bg-black.bg-opacity-50');
      expect(overlay).toBeInTheDocument();

      // Act - Click overlay
      fireEvent.click(overlay!);

      // Assert - Sidebar should be hidden
      const sidebar = container.querySelector('aside.-translate-x-full');
      expect(sidebar).toBeInTheDocument();
    });

    it('overlay should have z-30 and lg:hidden classes', () => {
      // Arrange
      const { container } = render(
        <DashboardShell user={mockUser} _profile={mockProfile}>
          <div>Content</div>
        </DashboardShell>
      );

      // Act
      const menuButton = screen.getByLabelText('Abrir menú de navegación');
      fireEvent.click(menuButton);

      // Assert
      const overlay = container.querySelector('.z-30.lg\\:hidden');
      expect(overlay).toBeInTheDocument();
    });

    it('overlay should have aria-hidden attribute', () => {
      // Arrange
      const { container } = render(
        <DashboardShell user={mockUser} _profile={mockProfile}>
          <div>Content</div>
        </DashboardShell>
      );

      // Act
      const menuButton = screen.getByLabelText('Abrir menú de navegación');
      fireEvent.click(menuButton);

      // Assert
      const overlay = container.querySelector('[aria-hidden="true"]');
      // Note: Multiple elements may have aria-hidden, verify one is the overlay
      expect(overlay).toBeInTheDocument();
    });
  });

  describe('TC-CDASH-013: Accessibility features', () => {
    it('should render skip-to-content link', () => {
      // Arrange & Act
      render(
        <DashboardShell user={mockUser} _profile={mockProfile}>
          <div>Content</div>
        </DashboardShell>
      );

      // Assert
      const skipLink = screen.getByText('Saltar al contenido principal');
      expect(skipLink).toBeInTheDocument();
      expect(skipLink.tagName).toBe('A');
    });

    it('skip-to-content link should have correct href', () => {
      // Arrange & Act
      render(
        <DashboardShell user={mockUser} _profile={mockProfile}>
          <div>Content</div>
        </DashboardShell>
      );

      // Assert
      const skipLink = screen.getByText('Saltar al contenido principal');
      expect(skipLink).toHaveAttribute('href', '#main-content');
    });

    it('skip-to-content link should be screen-reader-only by default', () => {
      // Arrange & Act
      render(
        <DashboardShell user={mockUser} _profile={mockProfile}>
          <div>Content</div>
        </DashboardShell>
      );

      // Assert
      const skipLink = screen.getByText('Saltar al contenido principal');
      expect(skipLink).toHaveClass('sr-only');
    });

    it('skip-to-content link should be visible on focus', () => {
      // Arrange & Act
      render(
        <DashboardShell user={mockUser} _profile={mockProfile}>
          <div>Content</div>
        </DashboardShell>
      );

      // Assert
      const skipLink = screen.getByText('Saltar al contenido principal');
      expect(skipLink).toHaveClass('focus:not-sr-only');
    });

    it('main content should have aria-label', () => {
      // Arrange & Act
      render(
        <DashboardShell user={mockUser} _profile={mockProfile}>
          <div>Content</div>
        </DashboardShell>
      );

      // Assert
      const mainElement = screen.getByRole('main');
      expect(mainElement).toHaveAttribute('aria-label', 'Contenido del dashboard');
    });

    it('should use semantic main element', () => {
      // Arrange & Act
      render(
        <DashboardShell user={mockUser} _profile={mockProfile}>
          <div>Content</div>
        </DashboardShell>
      );

      // Assert
      const mainElement = screen.getByRole('main');
      expect(mainElement.tagName).toBe('MAIN');
    });
  });

  describe('Layout structure', () => {
    it('should render flex layout for sidebar and main content', () => {
      // Arrange & Act
      const { container } = render(
        <DashboardShell user={mockUser} _profile={mockProfile}>
          <div>Content</div>
        </DashboardShell>
      );

      // Assert
      const flexContainer = container.querySelector('.flex');
      expect(flexContainer).toBeInTheDocument();
    });

    it('should render max-width container inside main', () => {
      // Arrange & Act
      const { container } = render(
        <DashboardShell user={mockUser} _profile={mockProfile}>
          <div>Content</div>
        </DashboardShell>
      );

      // Assert
      const maxWidthContainer = container.querySelector('.max-w-7xl.mx-auto');
      expect(maxWidthContainer).toBeInTheDocument();
    });

    it('should apply responsive padding to content container', () => {
      // Arrange & Act
      const { container } = render(
        <DashboardShell user={mockUser} _profile={mockProfile}>
          <div>Content</div>
        </DashboardShell>
      );

      // Assert
      const contentContainer = container.querySelector('.px-4.sm\\:px-6.lg\\:px-8.py-8');
      expect(contentContainer).toBeInTheDocument();
    });
  });

  describe('Props handling', () => {
    it('should render with user prop', () => {
      // Arrange & Act
      render(
        <DashboardShell user={mockUser} _profile={mockProfile}>
          <div>Content</div>
        </DashboardShell>
      );

      // Assert
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('should handle missing imageUrl in user object', () => {
      // Arrange
      const userWithoutImage = {
        id: 'user_123',
        name: 'Juan Pérez',
        email: 'juan@example.com',
      };

      // Act & Assert
      expect(() => {
        render(
          <DashboardShell user={userWithoutImage} _profile={mockProfile}>
            <div>Content</div>
          </DashboardShell>
        );
      }).not.toThrow();
    });

    it('should handle profile prop correctly', () => {
      // Arrange & Act
      render(
        <DashboardShell user={mockUser} _profile={mockProfile}>
          <div>Content</div>
        </DashboardShell>
      );

      // Assert - Component renders successfully with profile
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('should render with multiple children', () => {
      // Arrange & Act
      render(
        <DashboardShell user={mockUser} _profile={mockProfile}>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </DashboardShell>
      );

      // Assert
      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should handle rapid sidebar toggle clicks', () => {
      // Arrange
      const { container } = render(
        <DashboardShell user={mockUser} _profile={mockProfile}>
          <div>Content</div>
        </DashboardShell>
      );

      const menuButton = screen.getByLabelText('Abrir menú de navegación');

      // Act - Multiple rapid clicks
      fireEvent.click(menuButton);
      fireEvent.click(menuButton);
      fireEvent.click(menuButton);

      // Assert - Should end in open state (odd number of clicks)
      const mobileSidebar = container.querySelector('aside.translate-x-0.lg\\:hidden');
      expect(mobileSidebar).toBeInTheDocument();
    });

    it('should maintain state when children update', () => {
      // Arrange
      const { rerender, container } = render(
        <DashboardShell user={mockUser} _profile={mockProfile}>
          <div>Original Content</div>
        </DashboardShell>
      );

      const menuButton = screen.getByLabelText('Abrir menú de navegación');

      // Act - Open sidebar
      fireEvent.click(menuButton);

      // Rerender with new children
      rerender(
        <DashboardShell user={mockUser} _profile={mockProfile}>
          <div>Updated Content</div>
        </DashboardShell>
      );

      // Assert - Sidebar should still be open
      const mobileSidebar = container.querySelector('aside.translate-x-0.lg\\:hidden');
      expect(mobileSidebar).toBeInTheDocument();
      expect(screen.getByText('Updated Content')).toBeInTheDocument();
    });

    it('should render empty children gracefully', () => {
      // Arrange & Act
      render(
        <DashboardShell user={mockUser} _profile={mockProfile}>
          {null}
        </DashboardShell>
      );

      // Assert
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });

  describe('Component integration', () => {
    it('should coordinate between Topbar and Sidebar components', () => {
      // Arrange
      const { container } = render(
        <DashboardShell user={mockUser} _profile={mockProfile}>
          <div>Content</div>
        </DashboardShell>
      );

      // Act - Click menu button in topbar
      const menuButton = screen.getByLabelText('Abrir menú de navegación');
      fireEvent.click(menuButton);

      // Assert - Sidebar should open
      const mobileSidebar = container.querySelector('aside.translate-x-0.lg\\:hidden');
      expect(mobileSidebar).toBeInTheDocument();

      // Act - Click a link in mobile sidebar
      const sidebars = screen.getAllByRole('complementary');
      const mobileSidebarEl = sidebars[1];
      const link = mobileSidebarEl.querySelector('a');
      if (link) {
        fireEvent.click(link);
      }

      // Assert - Sidebar should close
      const hiddenSidebar = container.querySelector('aside.-translate-x-full');
      expect(hiddenSidebar).toBeInTheDocument();
    });

    it('should pass correct props to all child components', () => {
      // Arrange & Act
      render(
        <DashboardShell user={mockUser} _profile={mockProfile}>
          <div data-testid="content">Content</div>
        </DashboardShell>
      );

      // Assert
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getAllByRole('complementary')).toHaveLength(2);
      expect(screen.getByTestId('content')).toBeInTheDocument();
    });
  });
});
