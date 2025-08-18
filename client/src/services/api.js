import axios from 'axios';

// Create single axios instance with default config
const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
    timeout: 30000, // Default 30 seconds
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Include cookies for session management
});

// API endpoints
export const API_ENDPOINTS = {
    TIMEZONES: '/api/reports/timezones',

    MULTI_REPORTS: accountIds => `/api/reports/multi/${accountIds}`,
    ACCOUNTS: '/api/reports/accounts',
    EXPORT_CSV: accountId => `/api/export/csv/${accountId}`,
    EXPORT_XLS: accountId => `/api/export/xls/${accountId}`,
    EXPORT_EMAIL: accountId => `/api/export/email/${accountId}`,
    EXPORT_GOOGLE_SHEETS: accountId => `/api/export/sheets/${accountId}`,
};

// API functions
export const apiService = {
    // Timezone functions
    getTimezones: async () => {
        const response = await api.get(API_ENDPOINTS.TIMEZONES);
        return response.data;
    },

    // Account functions
    getAccounts: async headers => {
        const response = await api.get(API_ENDPOINTS.ACCOUNTS, { headers });
        return response.data;
    },

    // Report functions (use longer timeout for potentially heavy queries)
    getMultiAccountReport: async (accountIds, params) => {
        const response = await api.get(API_ENDPOINTS.MULTI_REPORTS(accountIds), {
            params,
            timeout: 600000, // 10 minutes for multi-account report generation
        });
        return response.data;
    },

    // Export functions (use longer timeout for export operations)
    exportToCSV: async (accountId, data) => {
        const response = await api.post(API_ENDPOINTS.EXPORT_CSV(accountId), data, {
            timeout: 300000, // 5 minutes for export operations
        });
        return response.data;
    },

    exportToXLS: async (accountId, data) => {
        const response = await api.post(API_ENDPOINTS.EXPORT_XLS(accountId), data, {
            timeout: 300000, // 5 minutes for export operations
        });
        return response.data;
    },

    exportToEmail: async (accountId, data) => {
        const response = await api.post(API_ENDPOINTS.EXPORT_EMAIL(accountId), data, {
            timeout: 300000, // 5 minutes for export operations
        });
        return response.data;
    },

    exportToGoogleSheets: async (accountId, data) => {
        const response = await api.post(API_ENDPOINTS.EXPORT_GOOGLE_SHEETS(accountId), data, {
            timeout: 300000, // 5 minutes for export operations
        });
        return response.data;
    },
};

export default api;
