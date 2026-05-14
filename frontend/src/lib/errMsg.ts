import { toast } from 'sonner'
import { capitalize, formatKey } from './utils'

export const showError = (err: any) => {
  const normalizeMessage = (msg: any) => ({
    title: msg?.path ? capitalize(formatKey(msg.path)) : 'Please check this',
    description: msg?.message || String(msg) || "We couldn't complete that action. Please try again."
  })

  let messages: { title: string; description?: string }[] = []

  if (typeof err === 'string') {
    messages = [{ title: 'Please check this', description: err }]
  } else if (Array.isArray(err)) {
    messages = err.map(normalizeMessage)
  } else {
    const errData = err?.response?.data

    if (Array.isArray(errData?.errors)) {
      messages = errData.errors.map(normalizeMessage)
    } else if (errData?.message) {
      messages = [{ title: 'Please check this', description: errData.message }]
    } else if (errData?.error) {
      messages = [{ title: 'Please check this', description: errData.error }]
    } else if (err?.message) {
      messages = [{ title: 'Please check this', description: err.message }]
    }
  }

  if (!messages.length) {
    messages = [{ title: 'Please try again', description: "We couldn't complete that action right now." }]
  }

  // ✅ Deduplicate by description to avoid spamming the same error
  const seen = new Set<string>()
  messages.forEach((msg) => {
    if (!msg.description || seen.has(msg.description)) return
    seen.add(msg.description)
    toast.error(msg.title, { description: msg.description })
  })
}
