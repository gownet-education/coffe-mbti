import { createRoot } from "react-dom/client";
import "./globals.css";
import ResultPage from "../shared/result-page";
import { types } from "./quiz";

createRoot(document.getElementById("root")!).render(
  <ResultPage brand="모리티아" footer="MAURITIA COFFEE" wordmark={<span className="brand-logo" role="img" aria-label="모리티아"/>} types={types} cardVersion="20261007-clear" />,
);
