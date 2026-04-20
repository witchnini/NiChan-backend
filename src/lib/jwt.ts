import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

export interface TokenPayload {
  userId: string;
  role: string;
}

export const signToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  } as SignOptions);
};

export const verifyToken = (token: string): TokenPayload => {
  const decoded = jwt.verify(token, env.jwtSecret) as JwtPayload & TokenPayload;
  return { userId: decoded.userId, role: decoded.role };
};
