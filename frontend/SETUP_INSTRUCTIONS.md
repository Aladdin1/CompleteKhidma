# Frontend Setup Instructions

## ⚠️ Node.js Not Detected

Node.js is required to run the frontend. Follow these steps to install and set it up.

## Step 1: Install Node.js

### Option A: Download Installer (Recommended)

1. **Download Node.js LTS** (Long Term Support version):
   - Visit: https://nodejs.org/
   - Download the Windows Installer (.msi) for LTS version
   - Choose the 64-bit version if you have 64-bit Windows

2. **Run the installer:**
   - Double-click the downloaded `.msi` file
   - Follow the installation wizard
   - **Important:** Make sure "Add to PATH" is checked during installation
   - Click "Install" and wait for completion

3. **Verify installation:**
   - Open a **NEW** PowerShell or Command Prompt window
   - Run: `node --version` (should show v18.x.x or higher)
   - Run: `npm --version` (should show 9.x.x or higher)

### Option B: Using Chocolatey (If installed)

```powershell
choco install nodejs-lts
```

### Option C: Using Winget (Windows 10/11)

```powershell
winget install OpenJS.NodeJS.LTS
```

## Step 2: Verify Installation

Open a **NEW** terminal window and run:

```powershell
node --version
npm --version
```

Both commands should return version numbers.

## Step 3: Install Frontend Dependencies

Once Node.js is installed:

```powershell
cd c:\Work\Projects\lahlouba\frontend
npm install
```

This will install all required packages (React, Vite, etc.)

**Expected output:**
```
added 234 packages, and audited 235 packages in 2m
```

## Step 4: Start the Frontend

### Make sure backend is running first!

In one terminal:
```powershell
cd c:\Work\Projects\lahlouba\backend
npm run dev
```

In another terminal:
```powershell
cd c:\Work\Projects\lahlouba\frontend
npm run dev
```

Or use the batch file:
```powershell
cd c:\Work\Projects\lahlouba\frontend
.\run.bat
```

## Step 5: Open in Browser

Open: `http://localhost:5173`

## Troubleshooting

### "node is not recognized" after installation

1. **Close and reopen** your terminal/PowerShell window
2. If still not working, restart your computer
3. Verify Node.js is in PATH:
   ```powershell
   $env:Path -split ';' | Select-String nodejs
   ```

### "npm install" fails

1. **Clear npm cache:**
   ```powershell
   npm cache clean --force
   ```

2. **Delete node_modules and package-lock.json:**
   ```powershell
   Remove-Item -Recurse -Force node_modules
   Remove-Item package-lock.json
   npm install
   ```

### Port 5173 already in use

1. **Find and kill the process:**
   ```powershell
   netstat -ano | findstr :5173
   taskkill /PID <PID_NUMBER> /F
   ```

2. **Or change port** in `vite.config.js`:
   ```js
   server: {
     port: 5174,  // Change to different port
   }
   ```

### Permission errors

Run PowerShell as Administrator and try again.

## Quick Verification Checklist

- [ ] Node.js installed (`node --version` works)
- [ ] npm installed (`npm --version` works)
- [ ] Dependencies installed (`node_modules` folder exists)
- [ ] Backend is running on port 3000
- [ ] Frontend starts without errors
- [ ] Browser opens `http://localhost:5173` successfully

## Need Help?

If you encounter issues:
1. Check the error message carefully
2. Verify Node.js version is 18+ (`node --version`)
3. Make sure backend is running
4. Check browser console for errors (F12)
5. Check terminal for error messages
