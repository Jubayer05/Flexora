/**
 * Manual Cookie Import Script
 * Save Binance cookies copied from browser to database
 * 
 * Usage: bun scripts/saveCookies.ts
 * 
 * Supports both Netscape cookie file format and manual cookie array
 */

import db from '../src/configs/db'
import { saveSession } from '../src/lib/binance'
import dotenv from 'dotenv'

dotenv.config()

// Parse Netscape cookie file format
// Format: domain	flag	path	secure	expiration	name	value
function parseNetscapeCookies(cookieText: string): Array<{
  name: string
  value: string
  domain: string
  path: string
  expires?: number
  httpOnly: boolean
  secure: boolean
  sameSite: 'Strict' | 'Lax' | 'None'
}> {
  const lines = cookieText.split('\n').filter((line: string) => {
    const trimmed = line.trim()
    return trimmed && !trimmed.startsWith('#') && trimmed.includes('\t')
  })

  const cookies: Array<{
    name: string
    value: string
    domain: string
    path: string
    expires?: number
    httpOnly: boolean
    secure: boolean
    sameSite: 'Strict' | 'Lax' | 'None'
  }> = []

  for (const line of lines) {
    const parts = line.split('\t')
    if (parts.length < 7) continue

    const domain = parts[0] || ''
    const flagStr = parts[1] || '' // TRUE/FALSE - indicates if domain applies to subdomains
    const path = parts[2] || ''
    const secureStr = parts[3] || '' // TRUE/FALSE - indicates if cookie is secure
    const expirationStr = parts[4] || '' // Unix timestamp (seconds) or 0 for session cookie
    const name = parts[5] || ''
    const value = parts[6] || ''

    // Skip if required fields are missing
    if (!domain || !path || !name || !value) continue

    const expires = expirationStr === '0' || !expirationStr ? undefined : parseInt(expirationStr, 10)
    const secure = secureStr === 'TRUE'
    const httpOnly = false // Netscape format doesn't indicate httpOnly, assume false for most cookies
    // Determine sameSite based on secure flag (most secure cookies use None)
    const sameSite: 'Strict' | 'Lax' | 'None' = secure ? 'None' : 'Lax'

    cookies.push({
      name: name.trim(),
      value: value.trim(),
      domain: domain.trim(),
      path: path.trim(),
      expires: expires && expires > 0 ? expires : undefined,
      httpOnly,
      secure,
      sameSite
    })
  }

  return cookies
}

// Netscape cookie file format (paste your cookies here)
const NETSCAPE_COOKIES = `www.binance.com	FALSE	/en	FALSE	0	monitor-uid	78196937
.binance.com	TRUE	/	FALSE	1804683274	bnc-uuid	9679f90e-284a-4645-9ec3-e20fdcb0614b
.binance.com	TRUE	/	FALSE	1802519847	BNC_FV_KEY	33964b58cbefa3efbae9ba1a5f5c3b2f6990811d
.binance.com	TRUE	/	FALSE	1802455853	lang	en
.binance.com	TRUE	/	FALSE	1804683286	se_gd	llREQTlgFRXGRYJEKFhJgZZUhEQQXBQVVYHRaWkFVFVUQBFNWV8R1
.binance.com	TRUE	/	FALSE	1804683287	se_gsd	dyklPyt9NjomDQUlJzU3Dg83WxMMAwcWVFtAUVdQVFFTDVNT1
.binance.com	TRUE	/	FALSE	1802455853	BNC-Location	PK
.binance.com	TRUE	/	FALSE	1801666471	userPreferredCurrency	USD_USD
.binance.com	TRUE	/	FALSE	1801680040	theme	light
.binance.com	TRUE	/	FALSE	1801680040	neo-theme	light
.binance.com	TRUE	/	FALSE	1802456166	changeBasisTimeZone	
.www.binance.com	TRUE	/	TRUE	1771265335	aws-waf-token	ee4885f8-8b9c-419a-a88e-8428d7944e58:BQoAf4F+ly9eAAAA:TIqsBLxw236PJ9oToaKd5hHT0q1G9+aFPW04hxjnSCutF7811EL75QdyTr2nktqziQ+xvMJhpYLa78xz8VrzGjO8yIatofwK/WizKWZCDiOFP3YQPTqoQ7HewiRjuSjmy8ld6ILbplWNynNNxD0OsQamyQ3XmwShlHltmFni+VrW8pZ1KM2sdhhpLoQHwA2LP8s=
www.binance.com	FALSE	/	FALSE	1786471738	g_state	{"i_l":0,"i_ll":1770919738674,"i_b":"UmZCb4XApjmyqp+TntlYyOW31ATx4HoYKlhJf/eMD6I","i_e":{"enable_itp_optimization":0}}
.binance.com	TRUE	/	FALSE	0	se_sd	hMFGQWlwTDbGxda0WWhdgZZUgAQQBEYW1AI5fVkVVFdUgAVNWVwX1
.binance.com	TRUE	/	FALSE	1771082935	_gid	GA1.2.782778739.1770919747
.binance.com	TRUE	/	FALSE	1777906285	_gcl_au	1.1.1595078598.1770130285.316617828.1770919756.1770919755
.binance.com	TRUE	/	TRUE	0	s9r1	A2F00AC8C4CD19C078C6B113FBBA9490
.binance.com	TRUE	/	TRUE	1771783853	r20t	web.46B4183D7BAE8260A1264E66CEFB608F
.binance.com	TRUE	/	TRUE	1771783853	r30t	1
.binance.com	TRUE	/	TRUE	1771351853	cr00	ECDD13716E570793E3F59026B55D24E5
.binance.com	TRUE	/	TRUE	1771351853	d1og	web.78196937.62086EAE291B4E31DA1A8FE7832D2DC0
.binance.com	TRUE	/	TRUE	1771351853	r2o1	web.78196937.02D723937113B39B84E65C2E34583347
.binance.com	TRUE	/	TRUE	1771351853	f30l	web.78196937.E7BB1A8B52E9226BB879973C3B7EC50A
.binance.com	TRUE	/	FALSE	1771524653	currentAccount	
.binance.com	TRUE	/	FALSE	1771524653	logined	y
www.binance.com	FALSE	/	TRUE	0	p20t	web.78196937.A9EEBC7B45C7390F161CC6F751A8012C
.binance.com	TRUE	/	FALSE	1771007439	_uetsid	ec325260083d11f1a3749d9fb1bbe428
.binance.com	TRUE	/	FALSE	1804617039	_uetvid	d143c660010f11f19ea5d1d0ef91b32f
.binance.com	TRUE	/	FALSE	1802457114	fiat-prefer-currency	USD
.binance.com	TRUE	/	FALSE	1802100534	sensorsdata2015jssdkcross	%7B%22distinct_id%22%3A%2278196937%22%2C%22first_id%22%3A%2219c2391bc487ae-0397fc11230bdea-26061d51-2073600-19c2391bc49dc3%22%2C%22props%22%3A%7B%22%24latest_traffic_source_type%22%3A%22%E7%9B%B4%E6%8E%A5%E6%B5%81%E9%87%8F%22%2C%22%24latest_search_keyword%22%3A%22%E6%9C%AA%E5%8F%96%E5%88%B0%E5%80%BC_%E7%9B%B4%E6%8E%A5%E6%89%93%E5%BC%80%22%2C%22%24latest_referrer%22%3A%22%22%7D%2C%22identities%22%3A%22eyIkaWRlbnRpdHlfY29va2llX2lkIjoiMTljMjM5MWJjNDg3YWUtMDM5N2ZjMTEyMzBiZGVhLTI2MDYxZDUxLTI2MDYxZDUxLTIwNzM2MDAtMTljMjM5MWJjNDlkYzMiLCIkaWRlbnRpdHlfbG9naW5faWQiOiI3ODE5NjkzNyJ9%22%2C%22history_login_id%22%3A%7B%22name%22%3A%22%24identity_login_id%22%2C%22value%22%3A%2278196937%22%7D%2C%22%24device_id%22%3A%2219c23fc8060577-0a44f8104b4a3c8-26061d51-2073600-19c23fc806150a%22%7D
.binance.com	TRUE	/	FALSE	1802519847	BNC_FV_KEY_T	101-Cep307mnslIWgY5Fw9lE5HfbYByHp5lgAysNXU3mDO7OYx2Jgit8%2Bx3GkG6STxPf4hIdL5mukDtwQXBpxAmC%2Bg%3D%3D-wAiyXupqDiHNzzBYPLJ2bw%3D%3D-73
.binance.com	TRUE	/	FALSE	1802519847	BNC_FV_KEY_EXPIRE	1771005446560
.binance.com	TRUE	/	FALSE	1805556530	_ga_3WP50LGEEC	GS2.1.s1770996529$o13$g0$t1770996529$j60$l0$h0
.binance.com	TRUE	/	FALSE	1802532533	OptanonConsent	isGpcEnabled=0&datestamp=Fri+Feb+13+2026+20%3A28%3A53+GMT%2B0500+(Pakistan+Standard+Time)&version=202506.1.0&browserGpcFlag=0&isIABGlobal=false&hosts=&consentId=161ef2db-ac9d-4c3a-ac37-061189db0e48&interactionCount=1&isAnonUser=1&landingPath=NotLandingPage&groups=C0001%3A1%2CC0003%3A1%2CC0004%3A1%2CC0002%3A1&AwaitingReconsent=false
.binance.com	TRUE	/	FALSE	1805556536	_ga	GA1.2.308793815.1770123281
.binance.com	TRUE	/	FALSE	1770996595	_gat_UA-162512367-1	1`

async function saveCookies() {
  const email = process.env.BINANCE_EMAIL || 'shahzad572a@gmail.com'

  console.log('🍪 Saving Binance cookies to database...')
  console.log(`📧 Email: ${email}`)
  console.log('📋 Parsing Netscape cookie format...\n')

  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set in .env file')
    console.error('\n💡 Please add DATABASE_URL to your .env file:')
    console.error('   DATABASE_URL="postgresql://user:password@host:port/database"')
    process.exit(1)
  }

  // Check database connection
  console.log('🔌 Checking database connection...')
  try {
    await db.$connect()
    console.log('✅ Database connected\n')
  } catch (dbError: any) {
    console.error('❌ Database connection failed:')
    console.error(`   ${dbError.message}`)
    console.error('\n💡 Troubleshooting:')
    console.error('   1. Check your DATABASE_URL in .env file')
    console.error('   2. Make sure your database server is running')
    console.error('   3. Check network connectivity')
    console.error('   4. Verify database credentials are correct')
    process.exit(1)
  }

  try {
    // Parse Netscape cookie format
    const cookies = parseNetscapeCookies(NETSCAPE_COOKIES)
    console.log(`📊 Parsed ${cookies.length} cookies from Netscape format\n`)

    // Convert to Playwright format
    const playwrightCookies = cookies.map(cookie => {
      return {
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        expires: cookie.expires,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite
      }
    })

    // Save to database using the saveSession function
    console.log('💾 Saving cookies to database...')
    await saveSession(playwrightCookies, email)

    console.log('\n✅ Cookies saved successfully!')
    console.log('📝 You can now use automated Binance verification.')
    console.log('\n⚠️  Note: Cookies expire based on their expiration dates.')
    console.log('   If verification fails later, run this script again with fresh cookies.')
    console.log('\n🔄 Refresh the admin panel to see updated session status.\n')
  } catch (error: any) {
    console.error('❌ Failed to save cookies:')
    console.error(error.message)
    if (error.stack) {
      console.error('\nStack trace:')
      console.error(error.stack)
    }
    process.exit(1)
  } finally {
    await db.$disconnect()
  }
}

// Run the script
saveCookies().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
