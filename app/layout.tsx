import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/firebase";
import { WebsiteProvider } from "@/lib/websiteContext";
import { ModalProvider } from "@/contexts/ModalContext";
import FloatingButtons from "@/components/FloatingButton";
import DynamicFavicon from "@/components/DynamicFavicon";

export const metadata: Metadata = {
  title: "Secret Room - No mercy cheating tools",
  description: "The premium cheating experience",
  icons: { icon: '/favicon.ico' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        {/* Preconnect to external resources for faster loading */}
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://cdn.discordapp.com" />
      </head>
      <body className="antialiased overflow-x-hidden">
        <AuthProvider>
          <WebsiteProvider>
            <ModalProvider>
              <DynamicFavicon />
              {children}
              <FloatingButtons />
            </ModalProvider>
          </WebsiteProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
