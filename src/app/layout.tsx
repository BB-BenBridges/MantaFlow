import type { Metadata } from "next";
import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from "@mantine/core";
import "@mantine/core/styles.css";
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
  title: "Tempo — IT Delivery",
  description: "Gantt planning for IT delivery teams",
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
