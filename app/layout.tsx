import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Student Support Assistant",
  description: "AI-powered assistant builder for student support teams",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}