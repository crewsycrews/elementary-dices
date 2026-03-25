type SameSite = "strict" | "lax" | "none";

function normalizeUrl(raw?: string): URL | null {
  if (!raw) return null;
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

function getCookiePolicy(): { sameSite: SameSite; secure: boolean } {
  const clientUrl = normalizeUrl(process.env.CLIENT_URL);
  const serverUrl =
    normalizeUrl(process.env.SERVER_URL) ??
    normalizeUrl(`http://localhost:${process.env.PORT || "3000"}`);

  const isCrossSite =
    !!clientUrl && !!serverUrl && clientUrl.hostname !== serverUrl.hostname;
  const isHttps =
    (clientUrl?.protocol === "https:" || serverUrl?.protocol === "https:") &&
    process.env.NODE_ENV !== "development";

  if (isCrossSite && isHttps) {
    return { sameSite: "none", secure: true };
  }

  return { sameSite: "lax", secure: false };
}

const policy = getCookiePolicy();

const baseCookieOptions = {
  httpOnly: true,
  secure: policy.secure,
  sameSite: policy.sameSite,
  path: "/",
};

export function getAccessTokenCookieOptions(
  value: string,
){
  return {
    ...baseCookieOptions,
    value,
    maxAge: 15 * 60,
  };
}

export function getRefreshTokenCookieOptions(
  value: string,
){
  return {
    ...baseCookieOptions,
    value,
    maxAge: 7 * 24 * 60 * 60,
  };
}
