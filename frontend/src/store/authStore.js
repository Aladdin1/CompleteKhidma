import { create } from 'zustand';

const useAuthStore = create((set) => {
  // Initialize from localStorage if available
  const storedUser = localStorage.getItem('user');
  const storedAccessToken = localStorage.getItem('access_token');
  const storedRefreshToken = localStorage.getItem('refresh_token');

  return {
    user: storedUser ? JSON.parse(storedUser) : null,
    accessToken: storedAccessToken,
    refreshToken: storedRefreshToken,
    isAuthenticated: !!storedAccessToken,

    setAuth: (user, accessToken, refreshToken) => {
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      set({
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
      });
    },

    logout: () => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
      });
    },

          updateUser: (userData) => {
            const currentState = useAuthStore.getState();
            const updatedUser = { ...currentState.user, ...userData };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            set({ user: updatedUser });
          },
          refreshUser: async () => {
            try {
              const response = await fetch('/api/v1/users/me', {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
              });
              if (response.ok) {
                const userData = await response.json();
                localStorage.setItem('user', JSON.stringify(userData));
                set({ user: userData });
              }
            } catch (error) {
              console.error('Failed to refresh user:', error);
            }
          },
  };
});

export default useAuthStore;
