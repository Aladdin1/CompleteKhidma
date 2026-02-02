/**
 * Test utilities – render with providers (Router, etc.).
 */

import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n.js';

/**
 * Render component with Router and i18n.
 */
export function renderWithProviders(ui, { route = '/', ...opts } = {}) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[route]}>
        <div data-testid="test-root">{ui}</div>
      </MemoryRouter>
    </I18nextProvider>,
    opts
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- re-export for tests
export * from '@testing-library/react';
