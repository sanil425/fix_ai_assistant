/** quick note: main entry point for the React app. just renders App and loads styles. */
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles/design.css";

createRoot(document.getElementById("root")).render(<App />);
