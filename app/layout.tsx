import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/firebase";
import { WebsiteProvider } from "@/lib/websiteContext";
import { ModalProvider } from "@/contexts/ModalContext";
import FloatingButtons from "@/components/FloatingButton";

export const metadata: Metadata = {
  title: "Anonymous - The Premium Cheating Experience",
  description: "The premium cheating experience",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        {/* Preconnect to CDN for faster image loading */}
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <style>{`
          /* Custom Scrollbar */
          ::-webkit-scrollbar {
            width: 10px;
          }

          ::-webkit-scrollbar-track {
            background: #000;
          }

          ::-webkit-scrollbar-thumb {
            background: linear-gradient(to bottom, #ec4899, #a855f7);
            border-radius: 5px;
          }

          ::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(to bottom, #db2777, #9333ea);
          }

          /* Smooth transitions */
          * {
            scroll-behavior: smooth;
          }
        `}</style>
      </head>
      <body className="antialiased overflow-x-hidden">
        <AuthProvider>
          <WebsiteProvider>
            <ModalProvider>
              {children}
              <FloatingButtons />
            </ModalProvider>
          </WebsiteProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
