# Install Node.js - Quick Guide

## ⚡ Quick Install (5 minutes)

### Step 1: Download Node.js

1. Go to: **https://nodejs.org/**
2. Click the big green **"Download Node.js (LTS)"** button
3. This downloads the Windows installer

### Step 2: Install

1. **Double-click** the downloaded `.msi` file
2. Click **"Next"** through the installation wizard
3. **Important:** Make sure "Add to PATH" checkbox is checked ✅
4. Click **"Install"**
5. Wait for installation to complete (~2 minutes)
6. Click **"Finish"**

### Step 3: Verify

1. **Close** your current terminal/PowerShell window
2. **Open a NEW** PowerShell or Command Prompt
3. Run these commands:

```powershell
node --version
npm --version
```

You should see version numbers like:
```
v20.10.0
10.2.3
```

### Step 4: Install Frontend Dependencies

```powershell
cd c:\Work\Projects\lahlouba\frontend
npm install
```

Wait for installation to complete (~2-3 minutes)

### Step 5: Run Verification Script

```powershell
.\verify-setup.ps1
```

This will check if everything is ready.

### Step 6: Start Frontend

```powershell
npm run dev
```

Or use the batch file:
```powershell
.\run.bat
```

## ✅ Done!

Open `http://localhost:5173` in your browser.

## Troubleshooting

### "node is not recognized" after installation

**Solution:** Close and reopen your terminal window. If still not working, restart your computer.

### Installation fails

1. Run PowerShell as **Administrator**
2. Try installing again
3. Check Windows Event Viewer for errors

### Still having issues?

See [SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md) for detailed troubleshooting.
