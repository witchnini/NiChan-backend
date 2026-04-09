import dotenv from "dotenv";

dotenv.config();

const parsePort = (value: string | undefined): number => {
  const parsed = Number(value);

  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }

  return 3000;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parsePort(process.env.PORT),
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
};
