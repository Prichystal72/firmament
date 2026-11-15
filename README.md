# FIRMAMENT!

Vlastní 3D hra žánru „invaders“ v prohlížeči: strážce kupole brání placatou Zemi před kulatozemci, bloom,
částicové výbuchy, varhanní hudba (Bach, Toccata d moll, 16 hlasů) a syntetizované zvuky.

## Spuštění
`START.bat` (spustí `python -m http.server 8092` a otevře http://127.0.0.1:8092/). Knihovny a písmo jsou ve `vendor/`
(stáhne je `python nastroje/stahni_knihovny.py`).

## Discord
1. Discord Developer Portal: nová aplikace, Activities → zapnout, URL Mappings `/` → adresa hostingu.
2. Application ID zapsat do `js/discord_nastaveni.js`.
3. `python nastroje/build_discord.py` a složku `build/discord/` nahrát na hosting (např. Cloudflare Pages).
4. V hlasovém kanálu: ikona rakety (Aktivity) → aplikace.

## Ovládání
- ← → / A D: pohyb, MEZERNÍK / ↑: střelba
- ENTER: start, P / Esc: pauza, M: hudba zap/vyp
- Gamepad: páčka/křížek, A nebo R2 střelba, Start

## Soubory
- `index.html`, `styl.css`: stránka, HUD, titulek
- `js/scena.js`: renderer, kamera, pozadí, bloom, otřes
- `js/modely.js`: voxelové modely
- `js/hra.js`: herní logika a kolize
- `js/efekty.js`: částice výbuchů
- `js/zvuk.js`: varhany (16 hlasů), dozvuk, efekty
- `js/hudba.js`: noty Toccaty a herní smyčky
- `js/main.js`: vstup, stavy, hlavní smyčka
