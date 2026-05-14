import { NextResponse } from 'next/server'

const noCache = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
  Expires: '0'
}

const DEFAULT_MESSAGE =
  "We're currently performing maintenance. Please check back later."

export async function GET() {
  try {
    const baseURL = (process.env.NEXT_PUBLIC_APP_ROOT_API || '').trim()
    const apiUrl = baseURL.endsWith('/') ? baseURL : `${baseURL}/`
    const url = `${apiUrl}settings/key/maintenance_mode`

    const res = await fetch(url, {
      cache: 'no-store',
      headers: { ...noCache }
    })

    if (!res.ok) {
      return NextResponse.json(
        { isMaintenanceMode: false, maintenanceMessage: DEFAULT_MESSAGE },
        { headers: noCache }
      )
    }

    const json = await res.json()
    const value = json?.data?.value

    if (!value || typeof value !== 'object') {
      return NextResponse.json(
        { isMaintenanceMode: false, maintenanceMessage: DEFAULT_MESSAGE },
        { headers: noCache }
      )
    }

    const isMaintenanceMode = Boolean(value.isMaintenanceMode)
    const maintenanceMessage =
      typeof value.maintenanceMessage === 'string' && value.maintenanceMessage.trim()
        ? value.maintenanceMessage.trim()
        : DEFAULT_MESSAGE

    return NextResponse.json(
      { isMaintenanceMode, maintenanceMessage },
      { headers: noCache }
    )
  } catch {
    return NextResponse.json(
      { isMaintenanceMode: false, maintenanceMessage: DEFAULT_MESSAGE },
      { headers: noCache }
    )
  }
}
