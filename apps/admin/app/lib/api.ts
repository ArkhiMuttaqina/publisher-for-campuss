const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api/v1";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
};

type ApiErrorEnvelope = {
  success: false;
  error: {
    code: string;
    message: string;
  };
};

type ApiSuccessEnvelope<T> = {
  success: true;
  data: T;
};

function isSuccessEnvelope<T>(value: unknown): value is ApiSuccessEnvelope<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    (value as { success: boolean }).success === true
  );
}

function isErrorEnvelope(value: unknown): value is ApiErrorEnvelope {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    (value as { success: boolean }).success === false
  );
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  const json = (await response.json()) as unknown;

  if (!response.ok) {
    if (isErrorEnvelope(json)) {
      throw new Error(`${json.error.code}: ${json.error.message}`);
    }

    throw new Error(`Request failed (${response.status})`);
  }

  if (isSuccessEnvelope<T>(json)) {
    return json.data;
  }

  return json as T;
}

export { API_BASE_URL };
