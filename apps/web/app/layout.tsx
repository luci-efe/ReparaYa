import type { Metadata } from "next";
// import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

// const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ReparaYa - Servicios de Reparación y Mantenimiento",
  description: "Conectamos clientes con contratistas de servicios de reparación y mantenimiento del hogar",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#2563eb", // blue-600 - Color primario de ReparaYa
          colorBackground: "#ffffff",
          colorText: "#1f2937", // gray-800
        },
        elements: {
          formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white",
          card: "shadow-md",
        },
      }}
    >
      <html lang="es">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
