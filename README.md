# PadelSplit

Mala web aplikacija (PWA) koja računa koliko svatko treba platiti za padel teren — uzimajući u obzir:

- cijenu terena koja ovisi o **doba dana** i **terenu** (zatvoreni/vanjski),
- trajanje termina (60/90/120 min),
- tko ima **PassSport** karticu (prvih 60 min njegovog udjela je besplatno).

Aplikacija je **potpuno statična** i deploya se besplatno na **GitHub Pages**. Cijene se ne dohvaćaju u runtime-u; **GitHub Action** ih povuče s javnog Playtomic endpointa i ubaci u `public/prices.json` tijekom builda/deploya (plus tjedni cron za osvježavanje).

## Deploy na GitHub Pages

1. Pushaj repo na GitHub.
2. U repo postavkama otvori **Settings → Pages** i pod **Source** odaberi **GitHub Actions**.
3. Workflow (`.github/workflows/deploy.yml`) se pokreće automatski na svaki push (i tjedno radi osvježavanja cijena) te objavi app na:
   `https://<tvoj-user>.github.io/<repo>/`

Nakon deploya otvori taj URL na mobitelu i dodaj „Add to Home Screen" (PWA).

## Lokalno

```bash
node server.js            # statički dev server (samo lokalno)
# ili
node scripts/fetch-prices.js   # ručno osvježi public/prices.json
```

Otvori http://localhost:8787. Za drugi klub promijeni `config.js` (tenant id, tereni, vremenska zona).

## Korištenje

App je zamišljen da se koristi **nakon odigranog termina** — sve je na jednom ekranu:

1. Odaberi **teren** i **trajanje** (60/90/120 min).
2. **Početak termina** se računa sam (`sada − trajanje`, zaokruženo na 30 min) — po potrebi ga podesiš tipkama `−30`/`+30` ili tapom na vrijeme.
3. Cijena se popuni sama (iz cjenika po satu); možeš je i ručno ispraviti.
4. U **Igrači** je po defaultu 4 igrača, od toga 2 s PassSportom — samo uključi/isključi PassSport prekidačem (i dodaj/ukloni igrača ako vas nije 4).

Rezultat „Koliko tko plaća" osvježava se odmah.

## Pravilo PassSport

Ako osoba ima PassSport karticu, **prvih 60 minuta njenog udjela je besplatno**. Primjer: termin 90 min, 4 igrača, teren 42 € → osnovni udio je 10,50 €; igrač s karticom plaća samo 3,50 € (preostalih 30 min), a prvih 60 min pokriva PassSport.

## Struktura

```
public/                  # statički PWA frontend (index.html, app.js, style.css, sw.js, manifest, ikone)
public/prices.json       # cjenik po terenu (generira ga GitHub Action)
scripts/fetch-prices.js  # dohvaća cijene s Playtomic-a i piše public/prices.json
scripts/make-icons.py    # generator ikona (stdlib, bez ovisnosti)
config.js                # podaci kluba (tenant, tereni, vremenska zona)
.github/workflows/deploy.yml  # CI: fetch cijena + deploy na GitHub Pages
server.js                # lokalni dev server (nije potreban u produkciji)
```

## Napomena

Koristi se javni, nedokumentirani Playtomic endpoint koji se može promijeniti bez najave. Ako cijene prestanu raditi, provjeri `scripts/fetch-prices.js` ili ručno upiši cijenu u appu.
