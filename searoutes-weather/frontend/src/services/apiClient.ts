import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'
});

export const getVoyageRoute = async (requestData: any) => {
  const response = await api.post('/voyage', requestData);
  return response.data;
};
