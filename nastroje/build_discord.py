"""Slozi hru do build/discord/ k nahrani na hosting (Cloudflare Pages apod.) pro Discord Activity.

Kopiruje jen to, co hra v prohlizeci potrebuje (bez nastroju, MIDI a dokumentace).
Pouziti: python nastroje/build_discord.py
"""
import shutil
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent
CIL = KOREN / "build" / "discord"
SOUBORY = ["index.html", "styl.css"]
SLOZKY = ["js", "vendor", "zvuky"]

if __name__ == "__main__":
    if not (KOREN / "vendor" / "three").exists():
        raise SystemExit("Chybi vendor/, nejdriv spust nastroje/stahni_knihovny.py")
    if CIL.exists():
        shutil.rmtree(CIL)
    CIL.mkdir(parents=True)
    for s in SOUBORY:
        shutil.copy2(KOREN / s, CIL / s)
    for s in SLOZKY:
        shutil.copytree(KOREN / s, CIL / s)
    soubory = [p for p in CIL.rglob("*") if p.is_file()]
    velikost_mb = sum(p.stat().st_size for p in soubory) / 1e6
    print(f"{CIL}: {len(soubory)} souboru, {velikost_mb:.1f} MB")
