How to export localStorage from the client and import into SQLite

1) Export localStorage from the browser console
- Open the app in the browser where your local data lives.
- Run the following in DevTools Console to create a file you can download:

```javascript
(function(){
  const keys = ['cheffs.users.db.v1','cheffs.entities.db.v1','cheffs.lieux.db.v1'];
  const out = {};
  keys.forEach(k => { const v = localStorage.getItem(k); if (v) out[k] = JSON.parse(v); });
  const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'localstorage-export.json'; document.body.appendChild(a); a.click(); a.remove();
})();
```

2) Move `localstorage-export.json` to the server folder (or any accessible path).

3) Run the importer (ensure the server has been installed and `server/data.db` exists or will be created):

```bash
# from project root
cd server
# ensure dependencies are installed (Node 18 recommended)
npm ci
# run import (file path optional)
node importLocalStorage.js ../localstorage-export.json
```

Notes
- User passwords are preserved by storing the client-side `password_salt` and `password_hash`. On first successful login the server will verify the legacy SHA-256(salt+password) and migrate the password to bcrypt automatically.
- Imported records are created using server helpers; IDs will be assigned by SQLite and may not match original client IDs. Referential fields (e.g., spray_wall_id) are carried over as-is; verify relations after import.
- Review the imported data before making the server public and back up `server/data.db`.
