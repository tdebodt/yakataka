import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { App } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/:workspaceId" element={<App />} />
        <Route path="/" element={<Navigate to={`/${crypto.randomUUID()}`} replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
