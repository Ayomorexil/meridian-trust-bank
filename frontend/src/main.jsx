import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';

// HashRouter (instead of BrowserRouter) so navigation and hard refreshes work
// correctly no matter how the build is served — no server-side rewrite rules
// (e.g. Nginx `try_files`) required for client-side routes to resolve.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
