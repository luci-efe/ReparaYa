/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { ClientQuickAccessTiles } from '../ClientQuickAccessTiles';

describe('ClientQuickAccessTiles', () => {
    it('renders all tiles', () => {
        render(<ClientQuickAccessTiles />);

        expect(screen.getByText('Mis Reservas')).toBeInTheDocument();
        expect(screen.getByText('Buscar Servicios')).toBeInTheDocument();
        expect(screen.getByText('Mensajes')).toBeInTheDocument();
    });

    it('renders correct descriptions', () => {
        render(<ClientQuickAccessTiles />);

        expect(screen.getByText('Ver historial y estado')).toBeInTheDocument();
        expect(screen.getByText('Encontrar profesionales')).toBeInTheDocument();
        expect(screen.getByText('Chat con contratistas')).toBeInTheDocument();
    });
});
