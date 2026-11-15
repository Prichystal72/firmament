"""Predgeneruje repliky vysilacky do MP3 se zvukem dobove vysilacky.

Texty: js/repliky.js. Hlasy: edge-tts (neuronove hlasy Microsoftu, potrebuje internet).
Efekt vysilacky: ffmpeg (uzke pasmo, zkresleni, zrnitost, sum).
Vystup: zvuky/vysilacka/<hash>.mp3 (stare nepouzite se smazou) a js/vysilacka_soubory.js (mapa "mluvci|text" -> soubor).
Hotove soubory se znovu negeneruji. Pouziti: python nastroje/generuj_vysilacku.py
"""
import asyncio
import hashlib
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import edge_tts

KOREN = Path(__file__).resolve().parent.parent
REPLIKY_JS = KOREN / "js" / "repliky.js"
SLOZKA = KOREN / "zvuky" / "vysilacka"
MAPA_JS = KOREN / "js" / "vysilacka_soubory.js"
SOUBEZNE = 4

# Cesti plochozemci: v cestine jsou jen 2 neuronove hlasy (Antonin, Vlasta).
# Uzivatel chce pomalejsi rec; velky posun vysky kazi zvuk, proto jen do +-6 Hz.
HLASY = {
    "VEL": ("cs-CZ-AntoninNeural", "-8%", "-4Hz"),
    "HL": ("cs-CZ-AntoninNeural", "-4%", "+4Hz"),
    "RAD": ("cs-CZ-VlastaNeural", "-6%", "+0Hz"),
    "PRU": ("cs-CZ-AntoninNeural", "-2%", "+6Hz"),
    "STR": ("cs-CZ-AntoninNeural", "-12%", "-6Hz"),
    "TEC": ("cs-CZ-VlastaNeural", "-4%", "+4Hz"),
}

# Vysilacka: pasmo 300-3400 Hz (srozumitelne), presah ve stredech, jemne zkresleni a sum.
FILTR = (
    "[0:a]aresample=24000,highpass=f=300,highpass=f=300,lowpass=f=3400,lowpass=f=3400,"
    "equalizer=f=1800:t=q:w=1:g=4,volume=1.3,aeval=exprs=tanh(1.8*val(0))/tanh(1.8),"
    "acrusher=bits=11:mode=log:mix=0.12[hlas];"
    "[1:a]highpass=f=600,lowpass=f=3200[sum];"
    "[hlas][sum]amix=inputs=2:duration=first:weights=1 0.18:normalize=0,apad=pad_dur=0.12"
)

RE_REPLIKA = re.compile(r"\['(" + "|".join(HLASY) + r")', '((?:[^'\\]|\\.)*)'\]")


def nacti_repliky():
    text = REPLIKY_JS.read_text(encoding="utf-8")
    vysledek = []
    for mluvci, retezec in RE_REPLIKA.findall(text):
        vysledek.append((mluvci, retezec.replace("\\'", "'")))
    return list(dict.fromkeys(vysledek))


def jmeno_souboru(mluvci, text):
    klic = f"{mluvci}|{text}|{HLASY[mluvci]}|{FILTR}"
    return hashlib.sha1(klic.encode("utf-8")).hexdigest()[:12] + ".mp3"


def efekt_vysilacky(vstup, vystup):
    prikaz = [
        "ffmpeg", "-y", "-loglevel", "error", "-i", str(vstup),
        "-f", "lavfi", "-i", "anoisesrc=color=pink:amplitude=0.05:sample_rate=24000",
        "-filter_complex", FILTR, "-ac", "1", "-b:a", "48k", str(vystup),
    ]
    vysledek = subprocess.run(prikaz, capture_output=True, text=True)
    if vysledek.returncode != 0:
        raise RuntimeError(f"ffmpeg selhal pro {vystup.name}: {vysledek.stderr.strip()}")


async def vygeneruj(mluvci, text, semafor, docasna):
    cil = SLOZKA / jmeno_souboru(mluvci, text)
    if cil.exists():
        return False
    hlas, rychlost, vyska = HLASY[mluvci]
    async with semafor:
        cisty = Path(docasna) / ("cisty_" + cil.name)
        await edge_tts.Communicate(text, hlas, rate=rychlost, pitch=vyska).save(str(cisty))
        await asyncio.to_thread(efekt_vysilacky, cisty, cil)
    return True


async def main():
    SLOZKA.mkdir(parents=True, exist_ok=True)
    repliky = nacti_repliky()
    semafor = asyncio.Semaphore(SOUBEZNE)
    with tempfile.TemporaryDirectory() as docasna:
        vysledky = await asyncio.gather(*(vygeneruj(m, t, semafor, docasna) for m, t in repliky))
    mapa = {f"{m}|{t}": f"zvuky/vysilacka/{jmeno_souboru(m, t)}" for m, t in repliky}
    pouzite = {jmeno_souboru(m, t) for m, t in repliky}
    for stary in SLOZKA.glob("*.mp3"):
        if stary.name not in pouzite:
            stary.unlink()
    MAPA_JS.write_text(
        "// Vygenerovano skriptem nastroje/generuj_vysilacku.py, neupravovat rucne.\n"
        f"export const SOUBORY = {json.dumps(mapa, ensure_ascii=False, indent=0)};\n",
        encoding="utf-8",
    )
    print(f"replik {len(repliky)}, nove vygenerovano {sum(vysledky)}")


if __name__ == "__main__":
    if not REPLIKY_JS.exists():
        sys.exit(f"Chybi {REPLIKY_JS}")
    asyncio.run(main())
