
import axios from 'axios';

const api = axios.create({
  baseURL: "https://eventora-a-event-booking-platform-1n7j.onrender.com/api"
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

export default api;
