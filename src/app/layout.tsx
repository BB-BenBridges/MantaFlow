import type { Metadata } from "next";
import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from "@mantine/core";
import "@mantine/core/styles.css";
import "@mantine/tiptap/styles.css";
import "./globals.css";
import { theme } from "@/theme";

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "MantaFlow — IT Delivery",
  description: "Gantt planning for IT delivery teams",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/mantaflow-icon.svg", type: "image/svg+xml" },
      { url: "/mantaflow-icon-256.png", sizes: "256x256", type: "image/png" },
      { url: "/mantaflow-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/mantaflow-icon-512.png", sizes: "512x512", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" {...mantineHtmlProps} className={`${hankenGrotesk.variable} ${jetbrainsMono.variable}`}>
        <head>
          <ColorSchemeScript defaultColorScheme="auto" />
        </head>
        <body>
          <MantineProvider theme={theme} defaultColorScheme="auto">
            {children}
          </MantineProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
