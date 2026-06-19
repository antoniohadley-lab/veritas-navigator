import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Veritas Navigator',
  description: 'Michigan civil dispute navigation — not legal advice',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
