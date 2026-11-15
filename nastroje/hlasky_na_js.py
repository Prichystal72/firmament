"""Prevede hlasky.txt (texty od uzivatele) na js/repliky.js.

Pak spustit nastroje/generuj_vysilacku.py (hlasy + efekt vysilacky).
Pouziti: python nastroje/hlasky_na_js.py
"""
import sys
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent
VSTUP = KOREN / "hlasky.txt"
VYSTUP = KOREN / "js" / "repliky.js"
MLUVCI = {"VEL", "HL", "RAD", "PRU", "STR", "TEC"}  # musi odpovidat HLASY v generuj_vysilacku.py
SEKCE = {
    "nová vlna": "vlna", "raketoplán": "ufo", "zásah": "zasah", "posledních pár": "malo",
    "vlna zničena": "znicena", "konec hry": "konec", "rozhovory": "rozhovory",
}


def nacti_jednoduse(radky):
    """Jen hlasky po radcich, bez mluvcich a casti: mluvci se pridelí po rade,
    vsechny hlasky slouzi pro udalosti i jako samostatne rozhovory."""
    poradi = sorted(MLUVCI)
    hlasky = [(poradi[i % len(poradi)], t) for i, t in enumerate(radky)]
    udalosti = {k: list(hlasky) for k in SEKCE.values() if k != "rozhovory"}
    return udalosti, [[h] for h in hlasky], [] if hlasky else ["hlasky.txt je prázdný"]


def nacti(cesta):
    obsah = [r.strip() for r in cesta.read_text(encoding="utf-8").splitlines()]
    obsah = [r for r in obsah if r and not r.startswith("#")]
    if not any(r.startswith("[") and r.endswith("]") for r in obsah):
        return nacti_jednoduse(obsah)
    udalosti = {k: [] for k in SEKCE.values() if k != "rozhovory"}
    rozhovory, rozhovor = [], []
    sekce = None
    chyby = []
    for cislo, radek in enumerate(cesta.read_text(encoding="utf-8").splitlines(), 1):
        radek = radek.strip()
        if radek.startswith("#"):
            continue
        if not radek:
            if rozhovor:
                rozhovory.append(rozhovor)
                rozhovor = []
            continue
        if radek.startswith("[") and radek.endswith("]"):
            nazev = radek[1:-1].strip().lower()
            if nazev not in SEKCE:
                chyby.append(f"řádek {cislo}: neznámá část [{nazev}]")
            sekce = SEKCE.get(nazev)
            continue
        mluvci, _, text = radek.partition(":")
        mluvci, text = mluvci.strip().upper(), text.strip()
        if mluvci not in MLUVCI or not text:
            chyby.append(f"řádek {cislo}: čekám „MLUVČÍ: text“ s mluvčím {', '.join(sorted(MLUVCI))}")
            continue
        if sekce is None:
            chyby.append(f"řádek {cislo}: hláška mimo část [..]")
        elif sekce == "rozhovory":
            rozhovor.append((mluvci, text))
        else:
            udalosti[sekce].append((mluvci, text))
    if rozhovor:
        rozhovory.append(rozhovor)
    for klic, hlasky in udalosti.items():
        if not hlasky:
            nazev = next(k for k, v in SEKCE.items() if v == klic)
            chyby.append(f"část [{nazev}] nemá žádnou hlášku")
    if not rozhovory:
        chyby.append("část [rozhovory] nemá žádný rozhovor")
    return udalosti, rozhovory, chyby


def js(retezec):
    # jednoduche uvozovky: generuj_vysilacku.py cte repliky v tomto tvaru
    return "'" + retezec.replace("\\", "\\\\").replace("'", "\\'") + "'"


def replika(m, t):
    return f"[{js(m)}, {js(t)}]"


def main():
    udalosti, rozhovory, chyby = nacti(VSTUP)
    if chyby:
        sys.exit("Chyby v hlasky.txt:\n" + "\n".join(chyby))
    radky = [
        "// Vygenerovano z hlasky.txt skriptem nastroje/hlasky_na_js.py, neupravovat rucne.",
        "export const UDALOSTI = {",
    ]
    for klic, hlasky in udalosti.items():
        radky.append(f"  {klic}: [")
        radky += [f"    {replika(m, t)}," for m, t in hlasky]
        radky.append("  ],")
    radky += ["};", "", "export const ROZHOVORY = ["]
    radky += ["  [" + ", ".join(replika(m, t) for m, t in r) + "]," for r in rozhovory]
    radky.append("];")
    VYSTUP.write_text("\n".join(radky) + "\n", encoding="utf-8")
    pocet = sum(len(h) for h in udalosti.values()) + sum(len(r) for r in rozhovory)
    print(f"hlášek {pocet}, rozhovorů {len(rozhovory)}")


if __name__ == "__main__":
    main()
