export interface ApiErrorBody {
  statusCode: number
  errorCode: string
  message: string
  details?: unknown
}
