import { NextResponse } from 'next/server';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    details?: any;
  };
}

/**
 * Returns a standardized success response
 */
export function successResponse<T>(data: T, message: string = 'Success', status: number = 200) {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
  };
  return NextResponse.json(response, { status });
}

/**
 * Returns a standardized error response
 */
export function errorResponse(
  message: string,
  code: string = 'INTERNAL_ERROR',
  details?: any,
  status: number = 500
) {
  const response: ApiResponse = {
    success: false,
    message,
    error: {
      code,
      details,
    },
  };
  return NextResponse.json(response, { status });
}
