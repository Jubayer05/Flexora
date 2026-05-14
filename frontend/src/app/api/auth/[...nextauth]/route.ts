import { getAuthOptions } from '@/utils/auth'
import NextAuth from 'next-auth'
import type { NextRequest } from 'next/server'

// Create async handler that resolves options first, then creates NextAuth handler
const handler = async (req: NextRequest, context: { params: Promise<{ nextauth: string[] }> }) => {
  try {
    const authOptions = await getAuthOptions()
    return NextAuth(authOptions)(req as any, context as any)
  } catch (error) {
    console.error('Error getting auth options:', error)
    // Return fallback options if backend is unavailable
    const fallbackOptions = {
      secret: process.env.AUTH_SECRET || 'fallback-secret',
      session: { strategy: 'jwt' as const },
      pages: {
        signIn: '/login',
        error: '/login?error=Configuration'
      },
      providers: []
    }
    return NextAuth(fallbackOptions)(req as any, context as any)
  }
}

export { handler as GET, handler as POST }
