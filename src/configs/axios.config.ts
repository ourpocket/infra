import axios, { AxiosInstance } from 'axios';

const createAxiosInstance = (
  baseURL?: string,
  apiKey?: string,
  extraHeaders?: Record<string, string>,
): AxiosInstance => {
  return axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      ...extraHeaders,
    },
    timeout: 15000,
  });
};

export default createAxiosInstance;
