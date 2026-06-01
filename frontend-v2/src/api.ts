import axios from 'axios';

const detectDefaultApiBase = () => {
  const { origin } = window.location;
  if (origin.includes('5173') || origin.includes('localhost')) {
    return 'http://localhost:3001';
  }
  return origin;
};

const API_BASE = detectDefaultApiBase();

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

export default api;
export { API_BASE };
