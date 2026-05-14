import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const adminToken = cookieStore.get('adminToken')?.value
    const userToken = cookieStore.get('token')?.value

    if (!adminToken && !userToken) {
      return NextResponse.json({ permissions: {} }, { status: 200 })
    }

    // Get permissions from cookie
    const permissionsData = cookieStore.get('permissions')?.value
    if (!permissionsData) {
      return NextResponse.json({ permissions: {} }, { status: 200 })
    }

    try {
      // The permissions are now stored as JSON strings
      const permissions = JSON.parse(permissionsData)
      return NextResponse.json({ permissions }, { status: 200 })
    } catch (error) {
      console.error('Failed to parse permissions JSON:', error)
      return NextResponse.json({ permissions: {} }, { status: 200 })
    }
  } catch (error) {
    console.error('Error fetching permissions:', error)
    return NextResponse.json({ permissions: {} }, { status: 200 })
  }
}
