import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import App from "./pages/App.tsx";
import LogInPage from "./pages/LogIn.tsx";
import BeerPage from "./pages/Beer.tsx";
import FallbackPage from "./pages/FallbackPage.tsx";
import { FilterContextProvider } from "./context/FilterContext.tsx";
import { ToastProvider } from "./components/ui/toast.tsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <FilterContextProvider>
      <ToastProvider>
        <BrowserRouter basename="/">
          <Routes>
            <Route path="/login" element={<LogInPage />} />
            <Route path="/" element={<App />} />
            <Route path="/beer/:id" element={<BeerPage />} />
            <Route path="*" element={<FallbackPage />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </FilterContextProvider>
  </React.StrictMode>
);
