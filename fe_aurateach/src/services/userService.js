import apiClient from './apiClient';

export const userService = {
  getUsers: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/users${queryString ? `?${queryString}` : ''}`;
    return await apiClient.get(endpoint);
  },
};