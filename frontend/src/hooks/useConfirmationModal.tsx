'use client'

import ConfirmationModal from '@/components/common/ConfirmationModal'
import { LucideIcon } from 'lucide-react'
import { useState } from 'react'

interface UseConfirmationModalProps {
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
  icon?: LucideIcon
  showInput?: boolean
  contentClassName?: string
  inputConfig?: {
    name: string
    label: string
    placeholder: string
    type?: 'text' | 'textarea'
    required?: boolean
  }
}

export function useConfirmationModal({
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  icon,
  showInput = false,
  inputConfig,
  contentClassName
}: UseConfirmationModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [onConfirmCallback, setOnConfirmCallback] = useState<
    ((inputData?: Record<string, any>) => Promise<void>) | null
  >(null)

  const openModal = (callback: (inputData?: Record<string, any>) => Promise<void>) => {
    setOnConfirmCallback(() => callback)
    setIsOpen(true)
  }

  const closeModal = () => {
    setIsOpen(false)
    setIsLoading(false)
    setOnConfirmCallback(null)
  }

  const handleConfirm = async (inputData?: Record<string, any>) => {
    if (onConfirmCallback) {
      setIsLoading(true)
      try {
        await onConfirmCallback(inputData)
        closeModal()
      } catch {
        setIsLoading(false)
        // Don't close modal on error, let user try again
      }
    }
  }

  const ModalComponent = () => {
    return (
      <ConfirmationModal
        isOpen={isOpen}
        onClose={closeModal}
        onConfirm={handleConfirm}
        title={title}
        description={description}
        confirmText={confirmText}
        cancelText={cancelText}
        variant={variant}
        isLoading={isLoading}
        icon={icon}
        showInput={showInput}
        inputConfig={inputConfig}
        contentClassName={contentClassName}
      />
    )
  }

  return {
    openModal,
    closeModal,
    ModalComponent,
    isOpen,
    isLoading
  }
}
