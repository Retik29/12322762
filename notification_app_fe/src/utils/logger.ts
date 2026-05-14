import { Log, initLogger, getAuthToken, Stack, Level, Package } from 'logging_middleware';

initLogger({
  email: process.env.NEXT_PUBLIC_USER_EMAIL || '',
  name: process.env.NEXT_PUBLIC_USER_NAME || '',
  rollNo: process.env.NEXT_PUBLIC_USER_ROLLNO || '',
  accessCode: process.env.NEXT_PUBLIC_USER_ACCESS_CODE || '',
  clientID: process.env.NEXT_PUBLIC_USER_CLIENT_ID || '',
  clientSecret: process.env.NEXT_PUBLIC_USER_CLIENT_SECRET || ''
});

export const frontendLog = async (level: Level, pkg: Package, message: string) => {
  try {
    await Log("frontend", level, pkg, message);
  } catch (err) {
    // If the logger itself fails, do not crash the app, but fail silently or use a safe fallback.
  }
};

export { getAuthToken };
