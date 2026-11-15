"""Lokalni server hry bez mezipameti prohlizece (po zmene hlasek ci kodu se vzdy nacte nova verze).

Pouziti: python nastroje/server.py   (port 8093, jen 127.0.0.1)
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent
PORT = 8093


class BezMezipameti(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", PORT), partial(BezMezipameti, directory=str(KOREN)))
    print(f"Hra běží na http://127.0.0.1:{PORT}/ (Ctrl+C = konec)")
    server.serve_forever()
