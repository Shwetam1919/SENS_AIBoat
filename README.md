# GMSENS

# GMSENS Repository - Git Commands

## Clone the Repository

```bash
git -c http.proxy=http://rb-proxy-de.bosch.com:8080 clone https://github.boschdevcloud.com/GSO3KOR/GMSENS.git
```

## Navigate to Repository

```bash
cd GMSENS
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
git commit -m "Updated chatbot and proxy files"
```

## Pull Latest Changes

```bash
git -c http.proxy=http://rb-proxy-de.bosch.com:8080 pull origin main
```

If you encounter merge conflicts, resolve them and continue.

## Push Changes

Normal push:

```bash
git -c http.proxy=http://rb-proxy-de.bosch.com:8080 -c https.proxy=http://rb-proxy-de.bosch.com:8080 push origin main
```

If the push is rejected because the remote history has diverged and you want to overwrite the remote branch:

```bash
git -c http.proxy=http://rb-proxy-de.bosch.com:8080 -c https.proxy=http://rb-proxy-de.bosch.com:8080 push --force-with-lease origin main
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
