# -*- coding: utf-8 -*-
"""
Genera mapeo_sbn.js (mapeo compacto denominacion -> codigo/grupo/clase SBN)
a partir de data.js (denominaciones) y catalogo_sbn.js (catalogo SBN).

El mapeo enriquece cada bien con su codigo oficial SBN y permite categorizar
usando la clase/grupo oficial en lugar de solo palabras clave.

Uso:  python generar_mapeo_sbn.py
Salida: mapeo_sbn.js  (variable global MAPEO_SBN: { denominacion_normalizada: {codigo, grupo, clase, denominacion} })
"""
import json
import os
import re
import unicodedata
import collections

HERE = os.path.dirname(os.path.abspath(__file__))

STOP = set("EN DE LA EL LAS LOS DEL PARA POR CON UN UNA AL AND NO SI ES SE A SU".split())


def norm_words(s):
    s = unicodedata.normalize("NFD", str(s))
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^A-Z0-9 ]", " ", s.upper())
    return s.split()


def norm_key(s):
    return " ".join(norm_words(s)).strip()


def load_js_global(path, target_key):
    with open(path, encoding="utf-8") as f:
        text = f.read()
    body = text.split("=", 1)[1].strip().rstrip(";")
    data = json.loads(body)
    return data[target_key]


def main():
    registros = load_js_global(os.path.join(HERE, "data.js"), "registros")
    catalogo = load_js_global(os.path.join(HERE, "catalogo_sbn.js"), "catalogo")

    # indice inverso palabra -> items
    inv = collections.defaultdict(list)
    for x in catalogo:
        words = set(norm_words(x["denominacion"]))
        for w in words:
            if len(w) >= 4 and w not in STOP and not w.isdigit():
                inv[w].append(x)

    def best_match(den):
        ws = set(norm_words(den))
        scores = collections.Counter()
        for w in ws:
            if len(w) >= 4 and w not in STOP and not w.isdigit():
                for x in inv.get(w, []):
                    scores[x["codigo"]] += 1
        if not scores:
            return None
        cod, _ = scores.most_common(1)[0]
        item = next(x for x in catalogo if x["codigo"] == cod)
        return item

    freqs = collections.Counter((r.get("bien") or "").strip() for r in registros)
    mapeo = {}
    for den in freqs:
        if not den:
            continue
        item = best_match(den)
        if item:
            mapeo[norm_key(den)] = {
                "codigo": item["codigo"],
                "grupo": item.get("grupo", ""),
                "clase": item.get("clase", ""),
                "denominacion": item.get("denominacion", ""),
            }

    data = {"mapeo": mapeo}
    js = "window.MAPEO_SBN = " + json.dumps(
        data, ensure_ascii=False, separators=(",", ":")) + ";\n"

    out = os.path.join(HERE, "mapeo_sbn.js")
    with open(out, "w", encoding="utf-8") as f:
        f.write(js)
    print("Escrito:", out, "(", os.path.getsize(out), "bytes )")
    print("Denominaciones mapeadas:", len(mapeo), "de", len(freqs))


if __name__ == "__main__":
    main()
