import axios from 'axios';

export type Stack = "backend" | "frontend";
export type Level = "debug" | "info" | "warn" | "error" | "fatal";

export type BackendPackage = "cache" | "controller" | "cron_job" | "db" | "domain" | "handler" | "repository" | "route" | "service";
export type FrontendPackage = "api" | "component" | "hook" | "page" | "state" | "style";
export type CommonPackage = "auth" | "config" | "middleware" | "utils";

export type Package = BackendPackage | FrontendPackage | CommonPackage;

export interface AuthConfig {
  email: string;
  name: string;
  rollNo: string;
  accessCode: string;
  clientID: string;
  clientSecret: string;
}

let cachedToken: string | null = null;
let tokenExpiry: number | null = null;
let currentConfig: AuthConfig | null = null;

export const initLogger = (config: AuthConfig) => {
  currentConfig = config;
};

export const getAuthToken = async (): Promise<string> => {
  if (!currentConfig) {
    throw new Error("Logger not initialized. Call initLogger with your credentials first.");
  }

  // Check if we have a valid cached token (adding 60 seconds buffer)
  if (cachedToken && tokenExpiry && Date.now() / 1000 < tokenExpiry - 60) {
    return cachedToken;
  }

  try {
    const response = await axios.post("http://4.224.186.213/evaluation-service/auth", currentConfig);
    const { access_token, expires_in } = response.data;
    
    cachedToken = access_token;
    tokenExpiry = expires_in;
    
    return access_token;
  } catch (error: any) {
    // Authentication failed, fail silently to avoid console.log
    throw error;
  }
};

export const Log = async (stack: Stack, level: Level, pkg: Package, message: string) => {
  try {
    const token = await getAuthToken();
    const payload = {
      stack,
      level,
      package: pkg,
      message
    };

    const response = await axios.post(
      "http://4.224.186.213/evaluation-service/logs",
      payload,
      {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      }
    );

    return response.data;
  } catch (error: any) {
    // Logging failed, fail silently to avoid console.log
  }
};
