export interface JwtPayload {
  sub: string;
  email: string;
  role?: string | null;
  status?: string | null;
  iat?: number;
  exp?: number;
}

export interface JwtUser {
  userId: string;
  email: string;
  role?: string | null;
  status?: string | null;
}
