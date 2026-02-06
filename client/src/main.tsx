import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { App } from './App';
import { generateUUID } from './utils/uuid';
import './index.css';

// Redirect component to avoid evaluating UUID at module load time
function RedirectToNewWorkspace() {
  return <Navigate to={`/${generateUUID()}`} replace />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/:workspaceId" element={<App />} />
          <Route path="/" element={<RedirectToNewWorkspace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
