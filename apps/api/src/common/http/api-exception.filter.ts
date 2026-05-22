import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";

type ErrorEnvelope = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{ field?: string; message: string; code?: string }>;
  };
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<{
      status: (statusCode: number) => { json: (body: ErrorEnvelope) => void };
    }>();

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const payload = exception.getResponse();
      const envelope = normalizeHttpException(statusCode, payload);
      response.status(statusCode).json(envelope);
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Unexpected server error",
      },
    });
  }
}

function normalizeHttpException(
  statusCode: number,
  payload: string | object,
): ErrorEnvelope {
  if (typeof payload === "string") {
    return {
      success: false,
      error: {
        code: mapStatusToCode(statusCode),
        message: payload,
      },
    };
  }

  const body = payload as {
    message?: string | string[];
    error?: string;
    details?: Array<{ field?: string; message: string; code?: string }>;
  };

  const message = Array.isArray(body.message)
    ? body.message.join("; ")
    : (body.message ?? body.error ?? "Request failed");

  return {
    success: false,
    error: {
      code: mapStatusToCode(statusCode),
      message,
      details: body.details,
    },
  };
}

function mapStatusToCode(statusCode: number): string {
  switch (statusCode) {
    case HttpStatus.BAD_REQUEST:
      return "BAD_REQUEST";
    case HttpStatus.UNAUTHORIZED:
      return "UNAUTHORIZED";
    case HttpStatus.FORBIDDEN:
      return "FORBIDDEN";
    case HttpStatus.NOT_FOUND:
      return "NOT_FOUND";
    case HttpStatus.CONFLICT:
      return "CONFLICT";
    default:
      return "HTTP_ERROR";
  }
}
