import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// LocatorJS setup for development
if (process.env.NODE_ENV === "development") {
  import("@locator/runtime").then((locator) => {
    if (locator.setupLocatorUI && typeof locator.setupLocatorUI === 'function') {
      locator.setupLocatorUI();
    } else if (locator.default && typeof locator.default === 'function') {
      locator.default();
    }
  }).catch((error) => {
    console.warn('LocatorJS setup failed:', error);
  });
}

createRoot(document.getElementById("root")).render(<App />);
