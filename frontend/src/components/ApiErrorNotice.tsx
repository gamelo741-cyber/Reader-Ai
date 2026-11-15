import type { ApiError } from '../api'
import { API_URL } from '../config'
import { strings } from '../strings'

type ApiErrorNoticeProps = {
  error: ApiError
  onRetry: () => void
}

function getFriendlyMessage(kind: ApiError['kind']): string {
  switch (kind) {
    case 'network':
      return strings.errors.network
    case 'http':
      return strings.errors.http
    case 'timeout':
      return strings.errors.timeout
    case 'parse':
      return strings.errors.parse
  }
}

function ApiErrorNotice({ error, onRetry }: ApiErrorNoticeProps) {
  const result = error.status === undefined
    ? error.kind
    : `${strings.errors.httpPrefix} ${error.status}: ${error.message}`

  return (
    <div role="alert">
      <p>{getFriendlyMessage(error.kind)}</p>
      <small>
        {error.method} {error.url}{strings.errors.detailSeparator}{result}
        {strings.errors.detailSeparator}{strings.errors.apiUrlLabel} {API_URL}
      </small>
      <div>
        <button type="button" onClick={onRetry}>{strings.errors.retry}</button>
      </div>
    </div>
  )
}

export default ApiErrorNotice
