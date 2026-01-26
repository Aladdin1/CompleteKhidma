/**
 * Frontend Test Template for User Story Verification
 *
 * Copy to e.g. frontend/src/pages/__tests__/MyPage.test.jsx and customize.
 * Use renderWithProviders, getRoot(), and placeholder/role queries.
 * See LoginPage.test.jsx for a working example.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/utils.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import { authAPI } from '../services/api.js';

vi.mock('../services/api.js', () => ({
  authAPI: {
    requestOTP: vi.fn(),
    verifyOTP: vi.fn(),
    refreshToken: vi.fn(),
  },
}));


function getRoot() {
  const roots = screen.getAllByTestId('test-root');
  return roots[roots.length - 1];
}

describe('TEMPLATE: User Story Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders and interacts', async () => {
    authAPI.requestOTP.mockResolvedValue({ message: 'OTP sent' });

    renderWithProviders(<LoginPage />);
    const root = within(getRoot());

    await userEvent.type(root.getByPlaceholderText('+201234567890'), '+201234567890');
    await userEvent.click(root.getByRole('button', { name: /send verification code/i }));

    await waitFor(() => {
      expect(authAPI.requestOTP).toHaveBeenCalledWith('+201234567890', expect.any(String));
    });
  });
});
