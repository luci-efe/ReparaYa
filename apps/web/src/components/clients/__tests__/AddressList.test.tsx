/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AddressList } from "../AddressList";
import { useAddresses } from "@/hooks/useAddresses";

// Mock the useAddresses hook
jest.mock("@/hooks/useAddresses");

const mockCreateAddress = jest.fn();
const mockUpdateAddress = jest.fn();
const mockDeleteAddress = jest.fn();
const mockSetDefaultAddress = jest.fn();
const mockRefetch = jest.fn();

const mockAddresses = [
    {
        id: "1",
        addressLine1: "Calle 1",
        city: "City 1",
        state: "State 1",
        postalCode: "11111",
        isDefault: true,
    },
    {
        id: "2",
        addressLine1: "Calle 2",
        city: "City 2",
        state: "State 2",
        postalCode: "22222",
        isDefault: false,
    },
];

describe("AddressList", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (useAddresses as jest.Mock).mockReturnValue({
            addresses: mockAddresses,
            isLoading: false,
            error: null,
            createAddress: mockCreateAddress,
            updateAddress: mockUpdateAddress,
            deleteAddress: mockDeleteAddress,
            setDefaultAddress: mockSetDefaultAddress,
            refetch: mockRefetch,
        });
    });

    it("renders list of addresses", () => {
        render(<AddressList />);

        expect(screen.getByText("Calle 1")).toBeInTheDocument();
        expect(screen.getByText("Calle 2")).toBeInTheDocument();
        expect(screen.getByText("Predeterminada")).toBeInTheDocument();
    });

    it("shows empty state when no addresses", () => {
        (useAddresses as jest.Mock).mockReturnValue({
            addresses: [],
            isLoading: false,
            error: null,
            createAddress: mockCreateAddress,
            updateAddress: mockUpdateAddress,
            deleteAddress: mockDeleteAddress,
            setDefaultAddress: mockSetDefaultAddress,
            refetch: mockRefetch,
        });

        render(<AddressList />);

        expect(screen.getByText("No tienes direcciones guardadas")).toBeInTheDocument();
    });

    it("opens modal to add address", () => {
        render(<AddressList />);

        const addButton = screen.getAllByText(/agregar dirección/i)[0]; // There might be two if empty state, but here we have addresses so one in header
        fireEvent.click(addButton);

        expect(screen.getByText("Agregar nueva dirección")).toBeInTheDocument();
    });

    it("opens modal to edit address", () => {
        render(<AddressList />);

        const editButtons = screen.getAllByLabelText(/editar dirección/i);
        fireEvent.click(editButtons[0]);

        expect(screen.getByText("Editar dirección")).toBeInTheDocument();
        expect(screen.getByDisplayValue("Calle 1")).toBeInTheDocument();
    });

    it("opens delete confirmation dialog", () => {
        render(<AddressList />);

        const deleteButtons = screen.getAllByLabelText(/eliminar dirección/i);
        // First address is default, so delete button might be disabled if logic handles it, but let's try second one
        fireEvent.click(deleteButtons[1]);

        expect(screen.getByText(/¿estás seguro que deseas eliminar la dirección/i)).toBeInTheDocument();
    });

    it("calls setDefaultAddress when clicked", async () => {
        render(<AddressList />);

        const setDefaultButton = screen.getByText(/establecer como predeterminada/i);
        fireEvent.click(setDefaultButton);

        await waitFor(() => {
            expect(mockSetDefaultAddress).toHaveBeenCalledWith("2");
        });
    });
});
