import "./globals.css";
import "sweetalert2/dist/sweetalert2.min.css";

export const metadata = {
  title: "SIOMs Store",
  description: "Customer storefront for Smart Inventory Order Management System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
