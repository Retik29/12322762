// Types re-defined locally — middleware types are erased at runtime (CJS dist)
type Stack = "backend" | "frontend";
type Level = "debug" | "info" | "warn" | "error" | "fatal";
type Package = "api" | "component" | "hook" | "page" | "state" | "style" | "auth" | "config" | "middleware" | "utils";

// Dynamically require the middleware at runtime to avoid Vite ESM/CJS issues
import { Log as _Log, initLogger, getAuthToken } from 'logging_middleware';

initLogger({
  email: import.meta.env.VITE_USER_EMAIL || '',
  name: import.meta.env.VITE_USER_NAME || '',
  rollNo: import.meta.env.VITE_USER_ROLLNO || '',
  accessCode: import.meta.env.VITE_USER_ACCESS_CODE || '',
  clientID: import.meta.env.VITE_USER_CLIENT_ID || '',
  clientSecret: import.meta.env.VITE_USER_CLIENT_SECRET || ''
});

export const frontendLog = async (level: Level, pkg: Package, message: string): Promise<void> => {
  try {
    await _Log("frontend", level, pkg, message);
  } catch {
    // Silent fail
  }
};

export { getAuthToken };
