# FIRMAMENT! (dříve Invaders 3D)

## Téma 2026-11-15 – PLATÍ
- Hráč = strážce kupole na placaté Zemi, vetřelci = kulatozemci (satelit, raketa, glóbus, sonda, astronaut),
  bonus = raketoplán NASA, kryty = ledové kry. Scéna `js/pozadi.js`: disk s mapou (canvas), ledová stěna,
  firmament (shader), malé Slunce a Měsíc obíhají nad diskem. Uživatel zvolil „hráč brání kupoli“.
- Vysílačka: hlášky českých plochozemců, česky (191 replik, `js/repliky.js`), hlasy jen cs-CZ Antonín a Vlasta,
  mluvčí odlišení výškou a tempem. Skutečná jména lidí nepoužívat. Toccata zůstává.

## Discord Activity (2026-11-15, připraveno, nenasazeno)
- Vše lokálně ve `vendor/` (`nastroje/stahni_knihovny.py`): Three.js 0.160.0 + doplňky, Discord Embedded App SDK 2
  (svázaný modul z esm.sh), písmo Press Start 2P. Discord v aktivitě cizí servery blokuje. Ověřeno: hra nevolá cizí server.
- `js/discord.js`: v Discordu (parametr `frame_id`) načte SDK a zavolá `ready()`, celá obrazovka se vypne.
  Client ID patří do `js/discord_nastaveni.js` (zatím prázdné, není tajné).
- `nastroje/build_discord.py` → `build/discord/` (229 souborů, 5,9 MB) k nahrání na hosting (doporučeno Cloudflare Pages).
- Hra je zatím jen pro jednoho hráče; každý v kanálu hraje svou hru. Multiplayer by potřeboval server.

Vlastní hra žánru „invaders“ ve 3D, v okně na PC. Vzhled: neonová synthwave scéna (mřížka, hvězdy, bloom),
barevné voxelové vetřelce v řadách, červené kryty, UFO nahoře. Ne kopie původní hry (vlastní modely, název, zvuky).

## Změna 2026-11-15 (limit 1 hodina) – PLATÍ
- Místo Unity: prohlížeč + **Three.js 0.160.0** (unpkg, importmap), bez instalace. Spuštění `START.bat`
  (http.server 8092; moduly JS z `file://` nejdou).
- Hudba: celá Toccata a fuga BWV 565 přesně podle MIDI z Mutopia Project (id 1780, Public Domain),
  `hudba/ToccataFugue.mid` → `nastroje/midi_na_js.py` → `js/toccata.js` (generované, ručně neupravovat).
  3651 not, 572 s, tempo z MIDI beze změn (uživatel chce absolutně autentickou, žádné bicí ani zrychlování).
  Změřeno: max 16 současně znějících tónů vč. doznívání 0,09 s → limit 16 hlasů nic nezahodí.
  Modely: voxely v kódu, Meshy nepoužit.
- Vysílačka: 188 replik (72 rozhovorů ≈ 32 min + události) předgenerovaných do `zvuky/vysilacka/*.mp3`
  skriptem `nastroje/generuj_vysilacku.py` (edge-tts 7.3.1 + ffmpeg `C:\ffmpeg\bin`). Texty `js/repliky.js`,
  mapa `js/vysilacka_soubory.js` (generovaná). Po změně textu skript spustit znovu (hotové přeskočí).
  Uživatel odmítl čistý hlas prohlížeče: chce zvuk dobové vysílačky (pásmo 380–2700 Hz, zkreslení, šum).
  edge-tts má jen 2 britské mužské hlasy → piloti i z NZ, AU, IE (Commonwealth v RAF), Češi = Antonín.
  Výpis edge-tts na Windows zahltí chyby `WinError 10054` při zavírání spojení; soubory jsou přesto v pořádku.
  Hudba je ztlumená (vstup 0.55) a během hovoru se ztiší na 0.45.
- Pohled (uživatel chce simulaci prostoru, logika hry zůstává ve 2D rovině z = 0): kamera za lodí (zorné pole 62°),
  klasický a kroužící, přepínání V (`POHLEDY` v `js/scena.js`). Vetřelci každé vlny přilétají z hloubky
  po Bézierových křivkách (`js/prilet.js`), během příletu nestřílí a nejdou zasáhnout.
- Vzhled: bez odlesků prostředí (RoomEnvironment vybělovala barvy), barvu nese jen emissive, základ tmavý.
  Mřížka a hrany hor plynule mění odstín, vetřelci pulzují. Uživatel: „potemnělé, ale dynamické barvy“.
- Ověřeno headless (Playwright, Edge, `--use-angle=swiftshader`): bez chyb v konzoli, střelba a skóre fungují.
  Zvuk headless ověřit nejde.
- Ladění vzhledu: bloom 0.75 / 0.4 / práh 0.55, emissive vetřelců 0.55. Vyšší hodnoty přepalují scénu do bíla.
  Uživatel chce tmavou scénu: expozice 0.75, hemisférické světlo 0.5, slunce ×0.5, pozadí `#020008`.
- Plán níže (Unity) je odložený.

## Rozhodnutí (2026-11-15, odloženo)
- Engine **Unity (C#)**. Zamítnuto: terminál/Python (nesplňuje vzhled), assembler (týdny práce, bez cesty na konzoli),
  Godot (PS5 jen přes placený port), Unreal (zbytečně těžký).
- Cíl: hotová hra, grafika a hudba na nejvyšší úrovni. Rychlost 60 FPS.
- PS5 zatím odložena. Unity ji ponechává otevřenou (modul po schválení Sony, PlayStation Partners).
- Hudba: Bach, Toccata a fuga d moll BWV 565 (volné dílo), vlastní 16kanálový tracker modul `.it`
  (Unity ho přehraje přímo). Zdroj not jen volný (vlastní přepis nebo PD/CC0 MIDI), ne cizí aranžmá.
- Zvuky výstřelů a výbuchů vlastní, syntetizované.
- Modely: vetřelci a kryty z voxelů generovaných skriptem; figurky z fotky přes `..\Meshy_home`
  (Hunyuan3D, GLB), nutná redukce z cca 555 tis. na cca 2 tis. trojúhelníků, import přes glTFast.

## Plán
1. Instalace Unity Hub + editor (LTS, URP), projekt, git.
2. Scéna: mřížka, hvězdy, bloom (URP post-processing), kamera zešikma.
3. Modely: generátor voxelových vetřelců (5 druhů, 2 snímky animace), kryty, loď, UFO.
4. Hratelnost: formace 5×11, střelba, kryty, UFO, životy, skóre, zrychlování, vlny.
5. Hudba a zvuky: modul `.it` s Toccatou, výstřely, výbuchy.
6. Efekty: částicové výbuchy, otřes kamery, záblesky.
7. Gamepad (DualSense) + klávesnice, menu, nejvyšší skóre, build exe.

Odhad 2026-11-15: 10 až 13 pracovních relací, tj. 2 až 3 týdny při práci po večerech. Úkoly v evidenci #24 až #30.

## Stav
- Unity zatím není nainstalované (ověřeno 2026-11-15). VS 2022 Community je.
