import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Publisher Admin",
  description: "Content operations for books, authors, blog, and media.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
