/** EstateFlow live integration: all operations use the NestJS / PostgreSQL backend. */
import { liveApi } from './live';
export const api = liveApi;
export const IS_MOCK = false;
export * from './types';
export * from './live';
export { ApiError, getToken, setToken } from './http';
