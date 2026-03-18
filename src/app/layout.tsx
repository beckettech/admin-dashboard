import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FastFlow Admin',
  description: 'Admin dashboard for FastFlow',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
