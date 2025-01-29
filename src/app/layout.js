import "./globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Título da aba */}
        <title>Gabriel Dias - Portfólio</title>

        <link rel="icon" href="/icon.png" type="image/x-icon" />

        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-poppins">
        {children}
      </body>
    </html>
  );
}