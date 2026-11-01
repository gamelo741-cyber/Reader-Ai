import type { ApiError } from '../api'
import { API_URL } from '../config'

type ApiErrorNoticeProps = {
  error: ApiError
  onRetry: () => void
}

function getFriendlyMessage(kind: ApiError['kind']): string {
  switch (kind) {
    case 'network':
      return 'تعذّر الاتصال بالخادم. تحقق من الاتصال وإعدادات الخادم.'
    case 'http':
      return 'استجاب الخادم بخطأ. حاول مرة أخرى.'
    case 'timeout':
      return 'استغرق الاتصال وقتًا طويلًا. حاول مرة أخرى.'
    case 'parse':
      return 'تعذّر فهم استجابة الخادم. حاول مرة أخرى.'
  }
}

function ApiErrorNotice({ error, onRetry }: ApiErrorNoticeProps) {
  const result = error.status === undefined
    ? error.kind
    : `HTTP ${error.status}: ${error.message}`

  return (
    <div role="alert">
      <p>{getFriendlyMessage(error.kind)}</p>
      <small>
        {error.method} {error.url} | {result} | API_URL: {API_URL}
      </small>
      <div>
        <button type="button" onClick={onRetry}>إعادة المحاولة</button>
      </div>
    </div>
  )
}

export default ApiErrorNotice
