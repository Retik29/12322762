import { Log, initLogger, getAuthToken, Stack, Level, Package } from 'logging_middleware';

initLogger({
  email: import.meta.env.VITE_USER_EMAIL || '',
  name: import.meta.env.VITE_USER_NAME || '',
  rollNo: import.meta.env.VITE_USER_ROLLNO || '',
  accessCode: import.meta.env.VITE_USER_ACCESS_CODE || '',
  clientID: import.meta.env.VITE_USER_CLIENT_ID || '',
  clientSecret: import.meta.env.VITE_USER_CLIENT_SECRET || ''
});

export const frontendLog = async (level: Level, pkg: Package, message: string) => {
  try {
    await Log("frontend", level, pkg, message);
  } catch (err) {
    // Silent fail
  }
};

export { getAuthToken };
