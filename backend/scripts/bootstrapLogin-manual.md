# Manual Binance Bootstrap Login (Alternative Method)

If Playwright browser launch is timing out due to Windows Defender/antivirus, use this manual method:

## Steps:

1. **Open Binance in your regular browser** (Chrome/Firefox/Edge)
   - Go to: https://accounts.binance.com/en/login
   - Log in manually with your credentials

2. **Open Browser Developer Tools**
   - Press `F12` or Right-click → Inspect
   - Go to **Application** tab (Chrome) or **Storage** tab (Firefox)

3. **Copy Cookies**
   - In Application/Storage tab, click **Cookies** → `https://accounts.binance.com`
   - Copy all cookie values (name, value, domain, path, etc.)

4. **Save Cookies to Database**
   - Use the admin panel API endpoint or run this script:

```bash
# Create a temporary script to save cookies manually
```

5. **Alternative: Use Browser Extension**
   - Install a cookie export extension
   - Export cookies as JSON
   - Import into database

## Quick Fix for Playwright Issues:

**The real solution is to disable Windows Defender temporarily:**

1. Open **Windows Security**
2. Go to **Virus & threat protection**
3. Click **Manage settings**
4. **Turn OFF** "Real-time protection" temporarily
5. Run: `bun run bootstrap:binance`
6. **Turn ON** "Real-time protection" after

**OR** add exception:
- Add folder: `C:\Users\Orcalo\AppData\Local\ms-playwright\`

