import { Suspense } from "react";
import App from "../../src/App.jsx";

export default function ProductsPage() {
  return (
    <Suspense fallback={null}>
      <App />
    </Suspense>
  );
}
