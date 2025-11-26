/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProfileForm } from "../ProfileForm";
import { useProfile } from "@/hooks/useProfile";

// Mock the useProfile hook
jest.mock("@/hooks/useProfile");

const mockUpdateProfile = jest.fn();
const mockRefetch = jest.fn();

const mockUser = {
    id: "user_123",
    email: "test@example.com",
    firstName: "Juan",
    lastName: "Perez",
    phone: "1234567890",
    imageUrl: "https://example.com/avatar.jpg",
};

describe("ProfileForm", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (useProfile as jest.Mock).mockReturnValue({
            user: mockUser,
            isLoading: false,
            error: null,
            updateProfile: mockUpdateProfile,
            refetch: mockRefetch,
        });
    });

    it("renders the form with user data", () => {
        render(<ProfileForm />);

        expect(screen.getByLabelText(/nombre/i)).toHaveValue("Juan");
        expect(screen.getByLabelText(/apellido/i)).toHaveValue("Perez");
        expect(screen.getByLabelText(/teléfono/i)).toHaveValue("1234567890");
        expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });

    it("shows loading state", () => {
        (useProfile as jest.Mock).mockReturnValue({
            user: null,
            isLoading: true,
            error: null,
            updateProfile: mockUpdateProfile,
            refetch: mockRefetch,
        });

        render(<ProfileForm />);
        // Check for skeleton loaders or just absence of form
        expect(screen.queryByLabelText(/nombre/i)).not.toBeInTheDocument();
    });

    it("shows error state", () => {
        (useProfile as jest.Mock).mockReturnValue({
            user: null,
            isLoading: false,
            error: "Error de conexión",
            updateProfile: mockUpdateProfile,
            refetch: mockRefetch,
        });

        render(<ProfileForm />);
        expect(screen.getByText(/error al cargar el perfil: error de conexión/i)).toBeInTheDocument();
    });

    it("validates input fields", async () => {
        render(<ProfileForm />);

        const phoneInput = screen.getByLabelText(/teléfono/i);
        fireEvent.change(phoneInput, { target: { value: "123" } }); // Invalid phone

        const submitButton = screen.getByRole("button", { name: /guardar cambios/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/el teléfono debe tener 10 dígitos/i)).toBeInTheDocument();
        });

        expect(mockUpdateProfile).not.toHaveBeenCalled();
    });

    it("submits valid data", async () => {
        mockUpdateProfile.mockResolvedValue({ ...mockUser, firstName: "Pedro" });

        render(<ProfileForm />);

        const nameInput = screen.getByLabelText(/nombre/i);
        fireEvent.change(nameInput, { target: { value: "Pedro" } });

        const submitButton = screen.getByRole("button", { name: /guardar cambios/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(mockUpdateProfile).toHaveBeenCalledWith(expect.objectContaining({
                firstName: "Pedro",
                lastName: "Perez",
                phone: "1234567890",
            }));
        });

        expect(screen.getByText(/perfil actualizado correctamente/i)).toBeInTheDocument();
    });

    it("handles submission error", async () => {
        mockUpdateProfile.mockRejectedValue(new Error("Error al guardar"));

        render(<ProfileForm />);

        const submitButton = screen.getByRole("button", { name: /guardar cambios/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/error al guardar/i)).toBeInTheDocument();
        });
    });
});
