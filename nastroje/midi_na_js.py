"""Prevod MIDI na JS modul s notami pro hru.

Pouziti: python nastroje/midi_na_js.py hudba/ToccataFugue.mid js/toccata.js
Vystup: export const NOTY = [cas_s, midi, delka_s, stopa, ...] (plochy seznam po 4).
"""
import sys
from pathlib import Path

import mido


def nacti_noty(cesta):
    midi = mido.MidiFile(cesta)
    cas = 0.0
    zacatky = {}  # (stopa, kanal, ton) -> cas zacatku
    noty = []
    # iterace pres MidiFile vraci delty v sekundach vcetne zmen tempa
    for zprava in midi:
        cas += zprava.time
        if zprava.type not in ("note_on", "note_off"):
            continue
        klic = (getattr(zprava, "channel", 0), zprava.note)
        if zprava.type == "note_on" and zprava.velocity > 0:
            zacatky[klic] = cas
        elif klic in zacatky:
            od = zacatky.pop(klic)
            noty.append((od, zprava.note, cas - od, zprava.channel))
    noty.sort()
    return noty


def main():
    if len(sys.argv) != 3:
        sys.exit("Pouziti: midi_na_js.py vstup.mid vystup.js")
    noty = nacti_noty(sys.argv[1])
    hodnoty = ",".join(f"{t:.3f},{m},{d:.3f},{k}" for t, m, d, k in noty)
    Path(sys.argv[2]).write_text(
        f"// Vygenerovano z {Path(sys.argv[1]).name} skriptem nastroje/midi_na_js.py, neupravovat rucne.\n"
        f"// [cas_s, midi, delka_s, kanal] po 4\nexport const NOTY = [{hodnoty}];\n",
        encoding="utf-8",
    )
    print(f"{len(noty)} not, delka {noty[-1][0] + noty[-1][2]:.1f} s")


if __name__ == "__main__":
    main()
