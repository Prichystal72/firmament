"""Stahne knihovny a pismo do vendor/, aby hra nepotrebovala cizi servery (Discord je v aktivite blokuje).

- Three.js 0.160.0: build a pouzite doplnky vcetne jejich relativnich importu (rekurzivne).
- Discord Embedded App SDK: jeden svazany ES modul z esm.sh.
- Pismo Press Start 2P (SIL OFL) z Google Fonts.
Pouziti: python nastroje/stahni_knihovny.py
"""
import re
import urllib.request
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent
VENDOR = KOREN / "vendor"
THREE_URL = "https://unpkg.com/three@0.160.0/"
DOPLNKY = [
    "examples/jsm/postprocessing/EffectComposer.js",
    "examples/jsm/postprocessing/RenderPass.js",
    "examples/jsm/postprocessing/UnrealBloomPass.js",
    "examples/jsm/postprocessing/OutputPass.js",
    "examples/jsm/postprocessing/ShaderPass.js",
    "examples/jsm/utils/BufferGeometryUtils.js",
    "examples/jsm/geometries/RoundedBoxGeometry.js",
]
SDK_URL = "https://esm.sh/@discord/embedded-app-sdk@2?bundle&target=es2020"
PISMO_CSS = "https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
# Google Fonts vraci woff2 jen prohlizecum; jinak stary format
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
RE_RELATIVNI = re.compile(r"""from\s+['"](\.{1,2}/[^'"]+)['"]""")


def stahni(url):
    pozadavek = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(pozadavek, timeout=30) as odpoved:
        return odpoved.read()


def stahni_three():
    fronta = ["build/three.module.js", *DOPLNKY]
    hotove = set()
    while fronta:
        cesta = fronta.pop()
        if cesta in hotove:
            continue
        hotove.add(cesta)
        data = stahni(THREE_URL + cesta)
        cil = VENDOR / "three" / cesta
        cil.parent.mkdir(parents=True, exist_ok=True)
        cil.write_bytes(data)
        # relativni importy doplnku (napr. ./Pass.js, ../shaders/CopyShader.js)
        for rel in RE_RELATIVNI.findall(data.decode("utf-8")):
            fronta.append((Path(cesta).parent / rel).as_posix().replace("examples/jsm/postprocessing/../", "examples/jsm/"))
    return len(hotove)


def stahni_sdk():
    # esm.sh vraci kratky modul s odkazem na skutecny svazany soubor
    uvod = stahni(SDK_URL).decode("utf-8")
    odkaz = re.search(r"""from\s+["'](/[^"']+\.mjs)["']""", uvod) or re.search(r"""export \* from ["'](/[^"']+)["']""", uvod)
    if not odkaz:
        raise RuntimeError(f"Neznamy tvar odpovedi esm.sh:\n{uvod[:500]}")
    data = stahni("https://esm.sh" + odkaz.group(1))
    if re.search(rb"""from\s*["']/""", data) or re.search(rb"""import\s*["']/""", data):
        raise RuntimeError("SDK neni svazane do jednoho souboru (obsahuje importy z esm.sh)")
    cil = VENDOR / "discord" / "embedded-app-sdk.mjs"
    cil.parent.mkdir(parents=True, exist_ok=True)
    cil.write_bytes(data)


def stahni_pismo():
    css = stahni(PISMO_CSS).decode("utf-8")
    # posledni blok = zakladni latinka; vezmeme vsechny woff2 a ulozime je pod jednim nazvem podle poradi
    adresy = re.findall(r"url\((https://[^)]+\.woff2)\)", css)
    if not adresy:
        raise RuntimeError("V CSS pisma neni woff2")
    slozka = VENDOR / "pismo"
    slozka.mkdir(parents=True, exist_ok=True)
    for i, url in enumerate(adresy):
        (slozka / f"press-start-2p-{i}.woff2").write_bytes(stahni(url))
        css = css.replace(url, f"press-start-2p-{i}.woff2")
    (slozka / "pismo.css").write_text(css, encoding="utf-8")
    return len(adresy)


if __name__ == "__main__":
    print("three.js souboru:", stahni_three())
    stahni_sdk()
    print("Discord SDK: ok")
    print("pismo souboru:", stahni_pismo())
