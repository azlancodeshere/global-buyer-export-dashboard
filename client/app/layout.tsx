import './globals.css';

export const metadata = {
  title: 'Global Buyer Export Dashboard',
  description:
    'Buyer discovery and outbound email marketing dashboard for a singing bowls / home decor export business',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
