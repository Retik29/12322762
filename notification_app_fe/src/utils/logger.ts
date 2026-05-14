/**
 * Frontend logger — mirrors the logging_middleware API but implemented
 * directly with axios to avoid the CJS/ESM incompatibility in the browser.
 */
import axios from 'axios';

const LOG_URL = '/evaluation-service/logs';
const AUTH_URL = '/evaluation-service/auth';

const config = {
  email: import.meta.env.VITE_USER_EMAIL || '',
  name: import.meta.env.VITE_USER_NAME || '',
  rollNo: import.meta.env.VITE_USER_ROLLNO || '',
  accessCode: import.meta.env.VITE_USER_ACCESS_CODE || '',
  clientID: import.meta.env.VITE_USER_CLIENT_ID || '',
  clientSecret: import.meta.env.VITE_USER_CLIENT_SECRET || ''
};

let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

export const getAuthToken = async (): Promise<string> => {
  if (cachedToken && tokenExpiry && Date.now() / 1000 < tokenExpiry - 60) {
    return cachedToken;
  }
  const res = await axios.post(AUTH_URL, config);
  cachedToken = res.data.access_token;
  tokenExpiry = res.data.expires_in;
  return cachedToken!;
};

export const frontendLog = async (
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal',
  pkg: string,
  message: string
): Promise<void> => {
  try {
    const token = await getAuthToken();
    await axios.post(
      LOG_URL,
      { stack: 'frontend', level, package: pkg, message },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  } catch {
    // Silent fail — never surface logger errors to UI
  }
};
