/**
 * LoginPage tests – US-C-001 (client registration with phone).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/utils.jsx';
import LoginPage from '../LoginPage.jsx';
import useAuthStore from '../../store/authStore.js';
import { authAPI } from '../../services/api.js';

vi.mock('../../services/api.js', () => ({
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

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuthStore.getState().logout();
  });

  const phoneInput = (r) => r.getByPlaceholderText('+201234567890');
  const otpInput = (r) => r.getByPlaceholderText('123456');
  const sendBtn = (r) => r.getByRole('button', { name: /send verification code/i });
  const verifyBtn = (r) => r.getByRole('button', { name: /^verify$/i });

  it('renders phone form and request OTP button', async () => {
    authAPI.requestOTP.mockResolvedValue({ message: 'OTP sent' });

    renderWithProviders(<LoginPage />);
    const root = within(getRoot());

    expect(phoneInput(root)).toBeInTheDocument();
    expect(sendBtn(root)).toBeInTheDocument();
  });

  it('calls requestOTP on submit with phone', async () => {
    authAPI.requestOTP.mockResolvedValue({ message: 'OTP sent' });

    renderWithProviders(<LoginPage />);
    const root = within(getRoot());

    await userEvent.type(phoneInput(root), '+201234567890');
    await userEvent.click(sendBtn(root));

    await waitFor(() => {
      expect(authAPI.requestOTP).toHaveBeenCalledWith('+201234567890', expect.any(String));
    });
  });

  it('shows OTP form after successful request', async () => {
    authAPI.requestOTP.mockResolvedValue({ message: 'OTP sent' });

    renderWithProviders(<LoginPage />);
    const root = within(getRoot());

    await userEvent.type(phoneInput(root), '+201234567890');
    await userEvent.click(sendBtn(root));

    await waitFor(() => {
      expect(otpInput(root)).toBeInTheDocument();
    });
    expect(verifyBtn(root)).toBeInTheDocument();
  });

  it('calls verifyOTP when submitting OTP', async () => {
    authAPI.requestOTP.mockResolvedValue({ message: 'OTP sent' });
    authAPI.verifyOTP.mockResolvedValue({
      user: { id: '1', phone: '+201234567890' },
      access_token: 'tok',
      refresh_token: 'ref',
    });

    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);
    const root = within(getRoot());

    await user.type(phoneInput(root), '+201234567890');
    await user.click(sendBtn(root));

    await waitFor(() => {
      expect(otpInput(root)).toBeInTheDocument();
    });

    await user.type(otpInput(root), '123456');
    await user.click(verifyBtn(root));

    await waitFor(() => {
      expect(authAPI.verifyOTP).toHaveBeenCalledWith(
        '+201234567890',
        '123456',
        expect.any(String)
      );
    });
  });

  it('shows error when requestOTP fails', async () => {
    authAPI.requestOTP.mockRejectedValue(new Error('Network error'));

    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);
    const root = within(getRoot());

    await user.type(phoneInput(root), '+201234567890');
    await user.click(sendBtn(root));

    await waitFor(() => {
      expect(root.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it('shows error when verifyOTP fails', async () => {
    authAPI.requestOTP.mockResolvedValue({ message: 'OTP sent' });
    authAPI.verifyOTP.mockRejectedValue({
      response: { data: { error: { message: 'Invalid or expired OTP' } } },
    });

    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);
    const root = within(getRoot());

    await user.type(phoneInput(root), '+201234567890');
    await user.click(sendBtn(root));

    await waitFor(() => {
      expect(otpInput(root)).toBeInTheDocument();
    });

    await user.type(otpInput(root), '999999');
    await user.click(verifyBtn(root));

    await waitFor(() => {
      expect(root.getByText(/invalid or expired otp/i)).toBeInTheDocument();
    });
  });
});
