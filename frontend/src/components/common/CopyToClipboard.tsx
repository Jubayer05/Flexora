import { copyToClipboard } from '@/lib/clipboard'
import { Check, Copy } from 'lucide-react'
import { useState } from 'react'

type CopyToClipboardProps = {
  text: string
  successMessage?: string
  duration?: number // icon switch duration in ms
}

export const CopyToClipboard = ({
  text,
  // successMessage = 'Copied to clipboard!',
  duration = 2000
}: CopyToClipboardProps) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const success = await copyToClipboard(text)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), duration)
    }
  }

  return (
    <span
      onClick={handleCopy}
      className='text-muted-foreground hover:text-primary text-base transition-colors cursor-pointer'
    >
      {copied ? <Check /> : <Copy />}
    </span>
  )
}
