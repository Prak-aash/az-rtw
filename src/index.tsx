import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { app } from '@microsoft/teams-js';
import { FluentProvider, teamsLightTheme } from '@fluentui/react-components';
import App from './App';
import './index.css';

// Check if we're running in Teams
const isTeamsEnvironment = window.parent !== window.self;

if (isTeamsEnvironment) {
  // Initialize the Teams SDK only if we're in Teams
  app.initialize().then(() => {
    app.getContext().then(() => {
      renderApp();
    });
  });
} else {
  // Render directly if not in Teams
  renderApp();
}

function renderApp() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <FluentProvider theme={teamsLightTheme}>
        <App />
      </FluentProvider>
    </StrictMode>
  );
}