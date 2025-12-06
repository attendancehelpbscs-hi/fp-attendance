import { config } from 'dotenv';

config();

interface EnvConfig {
  port: number;
  isDevelopment: boolean;
  isProduction: boolean;
  nodeEnv: string;
}

const envConfig: EnvConfig = {
  port: parseInt(process.env.PORT || '5005', 10),
  isDevelopment: process.env.NODE_ENV !== 'production',
  isProduction: process.env.NODE_ENV === 'production',
  nodeEnv: process.env.NODE_ENV || 'development',
};

export { envConfig };