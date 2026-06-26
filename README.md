# GMSENS

# GMSENS Repository - Git Commands

## Clone the Repository

```bash
git clone https://github.com/Shwetam1919/SENS_AIBoat.git
```

## Navigate to Repository

```bash
cd SENS_AIBoat
```

## Update Files

Copy or replace your latest files in the repository.

## Check Status

```bash
git status
```

## Stage Changes

```bash
git add .
```

## Commit Changes

```bash
git commit -m "Updated files"
```

## Pull Latest Changes

```bash
git pull origin main
```

If you encounter merge conflicts, resolve them and continue.

## Push Changes

Normal push:

```bash
git push origin main
```

If the push is rejected because the remote history has diverged and you want to overwrite the remote branch:

```bash
git push --force-with-lease origin main
```

---

# Running the Proxy

### Windows PowerShell

```powershell
$env:BMF_API_KEY="your_key_here"; python bmf_proxy.py
```

### Anaconda Prompt / Git Bash

```bash
export BMF_API_KEY="your_key_here"
python bmf_proxy.py
```
