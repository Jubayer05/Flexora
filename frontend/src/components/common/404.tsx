import { motion } from 'motion/react'
import { usePathname } from 'next/navigation'
import CustomLink from './CustomLink'

type PageNotFoundProps = {
  variant?: 'default' | 'minimal'
}

export default function PageNotFound({ variant }: PageNotFoundProps) {
  const pathname = usePathname()

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className='space-y-6'
    >
      <motion.img
        src='/404.png'
        alt='404 Not Found'
        className='grayscale-75 mx-auto h-72'
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
      />

      <motion.h2
        className='font-semibold text-muted-foreground text-2xl md:text-3xl'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        Oops! Page not found.
      </motion.h2>

      <motion.p
        className='mx-auto max-w-md text-muted-foreground'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        The page you are looking for might have been removed, had its name changed, or is
        temporarily unavailable.
      </motion.p>

      {variant !== 'minimal' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
          <CustomLink href={pathname?.includes('/admin') ? '/admin/dashboard' : '/'}>
            Back to Home
          </CustomLink>
        </motion.div>
      )}
    </motion.div>
  )
}
