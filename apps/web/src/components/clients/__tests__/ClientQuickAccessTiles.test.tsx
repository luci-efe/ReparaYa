/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { ClientQuickAccessTiles } from '../ClientQuickAccessTiles';

describe('ClientQuickAccessTiles', () => {
    it('renders all tiles', () => {
        render(<ClientQuickAccessTiles />);

        expect(screen.getByText('Mis Reservas')).toBeInTheDocument();
        expect(screen.getByText('Buscar Servicios')).toBeInTheDocument();
        expect(screen.getByText('Mensajes')).toBeInTheDocument();
        expect(screen.getByText('Mi Perfil')).toBeInTheDocument();
    });

    it('renders correct descriptions', () => {
        render(<ClientQuickAccessTiles />);

        expect(screen.getByText('Ver historial y estado')).toBeInTheDocument();
        expect(screen.getByText('Encuentra profesionales calificados para tu hogar')).toBeInTheDocument();
        expect(screen.getByText('Chat con contratistas')).toBeInTheDocument();
        expect(screen.getByText('Gestionar información personal')).toBeInTheDocument();
    });
});
