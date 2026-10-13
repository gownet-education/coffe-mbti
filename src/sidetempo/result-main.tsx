import { createRoot } from "react-dom/client";
import "./globals.css";
import ResultPage from "../shared/result-page";
import { types } from "./quiz";

createRoot(document.getElementById("root")!).render(
  <ResultPage brand="사이드템포" footer="SIDETEMPO COFFEE" wordmark={<span className="official-wordmark" aria-hidden="true"/>} types={types} cardVersion="20261012" />,
);
