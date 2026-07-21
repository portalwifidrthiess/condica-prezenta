# Condică de prezență

Aplicație web tip kiosk pentru pontajul angajaților, cu semnătură digitală la
sosire și buton de "Ieșire din tură" la plecare. Datele se salvează automat
într-un Google Sheet.

## Structura
```
index.html       - pagina aplicației (ecranele)
style.css        - stilul vizual (temă "registru de condică")
app.js           - logica: navigare, semnătură, trimitere date
config.js        - AICI editezi firmele + angajații + URL-ul Apps Script
apps-script.gs   - codul de lipit în Google Apps Script (backend)
```

## Pas 1 — Google Sheet + Apps Script
1. Creează un Google Sheet nou (ex. „Prezență clinică").
2. În el: **Extensii → Apps Script**.
3. Șterge codul implicit și lipește tot conținutul din `apps-script.gs`.
4. Din editor, selectează funcția `setup` din dropdown-ul de sus și apasă
   **Run** (o singură dată) — creează antetul de coloane. Acceptă permisiunile cerute.
5. **Deploy → New deployment**:
   - Tip: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Copiază URL-ul generat (se termină în `/exec`).

## Pas 2 — Configurare
Deschide `config.js` și completează:
- `APPS_SCRIPT_URL` = URL-ul copiat mai sus
- `COMPANIES` = numele celor două firme + lista angajaților fiecăreia

## Pas 3 — Hosting pe GitHub Pages
1. Creează un repo nou pe GitHub și încarcă cele 4 fișiere (`index.html`,
   `style.css`, `app.js`, `config.js`) — `apps-script.gs` nu trebuie urcat pe
   GitHub, e cod care trăiește doar în Google Apps Script.
2. **Settings → Pages** → Source: `main` branch, folder `/ (root)`.
3. Aplicația va fi disponibilă la
   `https://<user-github>.github.io/<nume-repo>/`.
4. Deschide acel link pe tableta din recepție/clinică, în Chrome, ca pagină
   de start (eventual în modul kiosk, ca la portalul de wifi).

## Cum funcționează pontajul
- Angajatul alege firma → alege „Sosire" sau „Ieșire din tură" → alege numele lui din listă.
- La **Sosire**: semnează pe ecran → apasă „Confirmă sosirea" → se trimite ora curentă (calculată pe server, în Apps Script, nu pe ceasul tabletei) ca oră de venire.
- La **Ieșire din tură**: confirmă → se caută rândul de azi al angajatului fără oră de plecare completată și se completează cu ora curentă.
- Foaia „Prezenta" din Sheet capătă coloanele: `Data | Firmă | Nume angajat | Ora venire | Ora plecare`.

## De reținut
- **Semnătura se salvează.** Desenul de pe ecran e trimis ca imagine (PNG) la
  Apps Script, care îl salvează într-un folder din Google Drive numit
  `Semnaturi_Condica` și îl afișează în coloana „Semnătură" ca un thumbnail
  mic (40×110 px), ca să nu ocupe spațiu în tabel. Util ca dovadă vizuală în
  caz de control — poți oricând deschide folderul din Drive pentru varianta
  la rezoluție completă.
- La prima rulare (setup sau primul checkin cu semnătură), Apps Script va
  cere permisiune suplimentară pentru Google Drive — accept-o.
- **Excepție de orar — Thiess Elena-Delia.** Fiindcă lucrează 4 ore la fiecare
  firmă, pentru ea orele NU se iau după momentul real al semnăturii/butonului,
  ci sunt fixe:
  - Beautyque Med SRL: sosire 10:00, plecare 14:00
  - Beautyque Med Aegeless: sosire 14:00, plecare 18:00
  (Ea tot trebuie să semneze/apese butoanele ca oricare angajat — doar ora
  salvată în tabel e cea fixă, nu ora reală a apăsării.) Regula e definită în
  `apps-script.gs`, în obiectul `FIXED_SCHEDULES` — poți adăuga acolo și alți
  angajați cu orar fix, după același model.
