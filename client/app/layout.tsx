import './globals.css';

export const metadata = {
  title: 'Global Buyer Export Dashboard',
  description:
    'Buyer discovery and outbound email marketing dashboard for a singing bowls / home decor export business',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
