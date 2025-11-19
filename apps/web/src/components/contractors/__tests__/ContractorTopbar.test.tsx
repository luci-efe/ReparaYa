/**
 * Unit tests for ContractorTopbar component
 * TC-CDASH-003, TC-CDASH-013
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ContractorTopbar } from '../ContractorTopbar';

describe('ContractorTopbar', () => {
  const mockUser = {
    id: 'user_123',
    name: 'Juan Pérez',
    email: 'juan@example.com',
    imageUrl: 'https://example.com/avatar.jpg',
  };

  const mockOnMenuClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('TC-CDASH-003: Render topbar structure', () => {
    it('should render header element', () => {
      // Arrange & Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const header = screen.getByRole('banner');
      expect(header).toBeInTheDocument();
      expect(header.tagName).toBe('HEADER');
    });

    it('should have fixed positioning classes', () => {
      // Arrange & Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const header = screen.getByRole('banner');
      expect(header).toHaveClass('fixed', 'top-0', 'left-0', 'right-0', 'z-30');
    });

    it('should have correct height', () => {
      // Arrange & Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const header = screen.getByRole('banner');
      expect(header).toHaveClass('h-16');
    });

    it('should have white background with border', () => {
      // Arrange & Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const header = screen.getByRole('banner');
      expect(header).toHaveClass('bg-white', 'border-b', 'border-gray-200');
    });

    it('should render flex container with correct spacing', () => {
      // Arrange & Act
      const { container } = render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const flexContainer = container.querySelector('.flex.items-center.justify-between.h-full');
      expect(flexContainer).toBeInTheDocument();
    });

    it('should have responsive padding', () => {
      // Arrange & Act
      const { container } = render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const flexContainer = container.querySelector('.px-4.sm\\:px-6.lg\\:px-8');
      expect(flexContainer).toBeInTheDocument();
    });
  });

  describe('Hamburger menu button', () => {
    it('should render menu button', () => {
      // Arrange & Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const menuButton = screen.getByLabelText('Abrir menú de navegación');
      expect(menuButton).toBeInTheDocument();
      expect(menuButton.tagName).toBe('BUTTON');
    });

    it('should call onMenuClick when button is clicked', () => {
      // Arrange
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Act
      const menuButton = screen.getByLabelText('Abrir menú de navegación');
      fireEvent.click(menuButton);

      // Assert
      expect(mockOnMenuClick).toHaveBeenCalledTimes(1);
    });

    it('should call onMenuClick multiple times for multiple clicks', () => {
      // Arrange
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Act
      const menuButton = screen.getByLabelText('Abrir menú de navegación');
      fireEvent.click(menuButton);
      fireEvent.click(menuButton);
      fireEvent.click(menuButton);

      // Assert
      expect(mockOnMenuClick).toHaveBeenCalledTimes(3);
    });

    it('should have type="button" attribute', () => {
      // Arrange & Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const menuButton = screen.getByLabelText('Abrir menú de navegación');
      expect(menuButton).toHaveAttribute('type', 'button');
    });

    it('should have proper ARIA label', () => {
      // Arrange & Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const menuButton = screen.getByLabelText('Abrir menú de navegación');
      expect(menuButton).toHaveAttribute('aria-label', 'Abrir menú de navegación');
    });

    it('should be hidden on large screens', () => {
      // Arrange & Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const menuButton = screen.getByLabelText('Abrir menú de navegación');
      expect(menuButton).toHaveClass('lg:hidden');
    });

    it('should have focus ring styles', () => {
      // Arrange & Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const menuButton = screen.getByLabelText('Abrir menú de navegación');
      expect(menuButton).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500');
    });

    it('should have hover styles', () => {
      // Arrange & Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const menuButton = screen.getByLabelText('Abrir menú de navegación');
      expect(menuButton).toHaveClass('hover:text-gray-900', 'hover:bg-gray-100');
    });

    it('should render hamburger icon', () => {
      // Arrange & Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const menuButton = screen.getByLabelText('Abrir menú de navegación');
      const icon = menuButton.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('w-6', 'h-6');
    });

    it('hamburger icon should be decorative', () => {
      // Arrange & Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const menuButton = screen.getByLabelText('Abrir menú de navegación');
      const icon = menuButton.querySelector('svg');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Logo rendering', () => {
    it('should render ReparaYa logo link', () => {
      // Arrange & Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const logoLink = screen.getByRole('link', { name: /reparaya/i });
      expect(logoLink).toBeInTheDocument();
    });

    it('should link to dashboard', () => {
      // Arrange & Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const logoLink = screen.getByRole('link', { name: /reparaya/i });
      expect(logoLink).toHaveAttribute('href', '/contractors/dashboard');
    });

    it('should render logo icon', () => {
      // Arrange & Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const logoLink = screen.getByRole('link', { name: /reparaya/i });
      const icon = logoLink.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('w-8', 'h-8');
    });

    it('logo icon should be decorative', () => {
      // Arrange & Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const logoLink = screen.getByRole('link', { name: /reparaya/i });
      const icon = logoLink.querySelector('svg');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    it('should render logo text', () => {
      // Arrange & Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      expect(screen.getByText('ReparaYa')).toBeInTheDocument();
    });

    it('logo text should be hidden on small screens', () => {
      // Arrange & Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const logoText = screen.getByText('ReparaYa');
      expect(logoText).toHaveClass('hidden', 'sm:inline');
    });

    it('logo should have focus ring styles', () => {
      // Arrange & Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const logoLink = screen.getByRole('link', { name: /reparaya/i });
      expect(logoLink).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500');
    });

    it('logo should have blue color scheme', () => {
      // Arrange & Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const logoLink = screen.getByRole('link', { name: /reparaya/i });
      expect(logoLink).toHaveClass('text-blue-600', 'hover:text-blue-700');
    });
  });

  describe('Notifications button', () => {
    it('should render notifications button', () => {
      // Arrange & Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const notificationsButton = screen.getByLabelText('Notificaciones');
      expect(notificationsButton).toBeInTheDocument();
      expect(notificationsButton.tagName).toBe('BUTTON');
    });

    it('should have type="button" attribute', () => {
      // Arrange & Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const notificationsButton = screen.getByLabelText('Notificaciones');
      expect(notificationsButton).toHaveAttribute('type', 'button');
    });

    it('should have title attribute for tooltip', () => {
      // Arrange & Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const notificationsButton = screen.getByLabelText('Notificaciones');
      expect(notificationsButton).toHaveAttribute('title', 'Notificaciones (próximamente)');
    });

    it('should have focus ring styles', () => {
      // Arrange & Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const notificationsButton = screen.getByLabelText('Notificaciones');
      expect(notificationsButton).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500');
    });

    it('should have hover styles', () => {
      // Arrange & Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const notificationsButton = screen.getByLabelText('Notificaciones');
      expect(notificationsButton).toHaveClass('hover:text-gray-900', 'hover:bg-gray-100');
    });

    it('should render bell icon', () => {
      // Arrange & Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const notificationsButton = screen.getByLabelText('Notificaciones');
      const icon = notificationsButton.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('w-6', 'h-6');
    });

    it('bell icon should be decorative', () => {
      // Arrange & Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const notificationsButton = screen.getByLabelText('Notificaciones');
      const icon = notificationsButton.querySelector('svg');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    it('should have relative positioning for badge', () => {
      // Arrange & Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const notificationsButton = screen.getByLabelText('Notificaciones');
      expect(notificationsButton).toHaveClass('relative');
    });
  });

  describe('UserButton rendering', () => {
    it('should render Clerk UserButton', () => {
      // Arrange & Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const userButton = screen.getByTestId('user-button');
      expect(userButton).toBeInTheDocument();
    });

    it('should be in a flex container', () => {
      // Arrange & Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const userButton = screen.getByTestId('user-button');
      const parent = userButton.parentElement;
      expect(parent).toHaveClass('flex', 'items-center');
    });
  });

  describe('TC-CDASH-013: Accessibility', () => {
    it('should use semantic header element', () => {
      // Arrange & Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const header = screen.getByRole('banner');
      expect(header.tagName).toBe('HEADER');
    });

    it('menu button should have aria-label', () => {
      // Arrange & Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const menuButton = screen.getByLabelText('Abrir menú de navegación');
      expect(menuButton).toHaveAttribute('aria-label');
    });

    it('notifications button should have aria-label', () => {
      // Arrange & Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const notificationsButton = screen.getByLabelText('Notificaciones');
      expect(notificationsButton).toHaveAttribute('aria-label');
    });

    it('all icons should have aria-hidden', () => {
      // Arrange & Act
      const { container } = render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const icons = container.querySelectorAll('svg[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThanOrEqual(3); // Menu, Logo, Notifications
    });

    it('interactive elements should have focus styles', () => {
      // Arrange & Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const menuButton = screen.getByLabelText('Abrir menú de navegación');
      const logoLink = screen.getByRole('link', { name: /reparaya/i });
      const notificationsButton = screen.getByLabelText('Notificaciones');

      expect(menuButton).toHaveClass('focus:outline-none', 'focus:ring-2');
      expect(logoLink).toHaveClass('focus:outline-none', 'focus:ring-2');
      expect(notificationsButton).toHaveClass('focus:outline-none', 'focus:ring-2');
    });
  });

  describe('Layout structure', () => {
    it('should have left and right sections', () => {
      // Arrange & Act
      const { container } = render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const leftSection = container.querySelector('.flex.items-center.gap-4');
      const rightSection = container.querySelectorAll('.flex.items-center.gap-4');

      expect(leftSection).toBeInTheDocument();
      expect(rightSection.length).toBeGreaterThan(0);
    });

    it('left section should contain menu button and logo', () => {
      // Arrange & Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const menuButton = screen.getByLabelText('Abrir menú de navegación');
      const logoLink = screen.getByRole('link', { name: /reparaya/i });

      expect(menuButton).toBeInTheDocument();
      expect(logoLink).toBeInTheDocument();
    });

    it('right section should contain notifications and user button', () => {
      // Arrange & Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const notificationsButton = screen.getByLabelText('Notificaciones');
      const userButton = screen.getByTestId('user-button');

      expect(notificationsButton).toBeInTheDocument();
      expect(userButton).toBeInTheDocument();
    });
  });

  describe('Props handling', () => {
    it('should handle user prop', () => {
      // Arrange & Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('should handle user without imageUrl', () => {
      // Arrange
      const userWithoutImage = {
        id: 'user_123',
        name: 'Juan Pérez',
        email: 'juan@example.com',
      };

      // Act & Assert
      expect(() => {
        render(<ContractorTopbar _user={userWithoutImage} onMenuClick={mockOnMenuClick} />);
      }).not.toThrow();
    });

    it('should work with different onMenuClick handlers', () => {
      // Arrange
      const customHandler = jest.fn();

      // Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={customHandler} />);
      const menuButton = screen.getByLabelText('Abrir menú de navegación');
      fireEvent.click(menuButton);

      // Assert
      expect(customHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Styling and visual appearance', () => {
    it('all buttons should have transition classes', () => {
      // Arrange & Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const menuButton = screen.getByLabelText('Abrir menú de navegación');
      const notificationsButton = screen.getByLabelText('Notificaciones');

      expect(menuButton).toHaveClass('transition-colors');
      expect(notificationsButton).toHaveClass('transition-colors');
    });

    it('all buttons should have rounded corners', () => {
      // Arrange & Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const menuButton = screen.getByLabelText('Abrir menú de navegación');
      const notificationsButton = screen.getByLabelText('Notificaciones');

      expect(menuButton).toHaveClass('rounded-lg');
      expect(notificationsButton).toHaveClass('rounded-lg');
    });

    it('all buttons should have padding', () => {
      // Arrange & Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const menuButton = screen.getByLabelText('Abrir menú de navegación');
      const notificationsButton = screen.getByLabelText('Notificaciones');

      expect(menuButton).toHaveClass('p-2');
      expect(notificationsButton).toHaveClass('p-2');
    });

    it('logo should be bold and blue', () => {
      // Arrange & Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const logoLink = screen.getByRole('link', { name: /reparaya/i });
      expect(logoLink).toHaveClass('font-bold', 'text-blue-600');
    });
  });

  describe('Edge cases', () => {
    it('should handle rapid menu button clicks', () => {
      // Arrange
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);
      const menuButton = screen.getByLabelText('Abrir menú de navegación');

      // Act
      fireEvent.click(menuButton);
      fireEvent.click(menuButton);
      fireEvent.click(menuButton);
      fireEvent.click(menuButton);
      fireEvent.click(menuButton);

      // Assert
      expect(mockOnMenuClick).toHaveBeenCalledTimes(5);
    });

    it('should render consistently with minimal props', () => {
      // Arrange & Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByLabelText('Abrir menú de navegación')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /reparaya/i })).toBeInTheDocument();
      expect(screen.getByLabelText('Notificaciones')).toBeInTheDocument();
      expect(screen.getByTestId('user-button')).toBeInTheDocument();
    });

    it('should maintain structure when re-rendered', () => {
      // Arrange
      const { rerender } = render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Act
      rerender(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getAllByRole('button')).toHaveLength(2); // Menu + Notifications
    });
  });

  describe('Z-index layering', () => {
    it('header should have z-30 for proper layering', () => {
      // Arrange & Act
      render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const header = screen.getByRole('banner');
      expect(header).toHaveClass('z-30');
    });
  });

  describe('Icon specifications', () => {
    it('all SVG icons should have proper stroke settings', () => {
      // Arrange & Act
      const { container } = render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const icons = container.querySelectorAll('svg');
      icons.forEach((icon) => {
        if (icon.hasAttribute('fill')) {
          // Menu and notifications icons should have these attributes
          const fill = icon.getAttribute('fill');
          const stroke = icon.getAttribute('stroke');
          if (fill === 'none') {
            expect(stroke).toBe('currentColor');
          }
        }
      });
    });

    it('all SVG icons should have viewBox', () => {
      // Arrange & Act
      const { container } = render(<ContractorTopbar _user={mockUser} onMenuClick={mockOnMenuClick} />);

      // Assert
      const icons = container.querySelectorAll('svg');
      icons.forEach((icon) => {
        expect(icon).toHaveAttribute('viewBox');
      });
    });
  });
});
