const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api/v1";

type ApiSuccessEnvelope<T> = {
  success: true;
  data: T;
};

type ApiErrorEnvelope = {
  success: false;
  error: {
    code: string;
    message: string;
  };
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

export async function webApiRequest<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    next: { revalidate: 60 },
  });

  const body = (await response.json()) as unknown;

  if (!response.ok) {
    if (isErrorEnvelope(body)) {
      throw new Error(`${body.error.code}: ${body.error.message}`);
    }
    throw new Error(`Request failed (${response.status})`);
  }

  if (isSuccessEnvelope<T>(body)) {
    return body.data;
  }

  return body as T;
}

export { API_BASE_URL };
