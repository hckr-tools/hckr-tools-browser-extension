import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import TabSwitcherApp from './TabSwitcherApp';
import './styles/theme.css';
import './styles/shared.css';

const root = document.getElementById('root');
const standaloneSwitcher = new URLSearchParams(window.location.search).get('switcher') === '1';
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      {standaloneSwitcher ? <TabSwitcherApp /> : <App />}
    </React.StrictMode>
  );
}
