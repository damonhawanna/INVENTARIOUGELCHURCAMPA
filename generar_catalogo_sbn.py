# -*- coding: utf-8 -*-
"""
Genera catalogo_sbn.js (catálogo oficial de bienes del Sistema de Bienes Nacionales - SBN)
a partir de la hoja "Catalogo" del archivo Inventario SBN.xlsm.

Uso:  python generar_catalogo_sbn.py  <ruta_al_Inventario_SBN.xlsm>
Salida: catalogo_sbn.js  (variable global CATALOGO_SBN con lista de objetos)
"""
import sys
import json
import os
import re
import pandas as pd


def limpiar(v):
    if v is None:
        return ""
    s = str(v).strip()
    if not s:
        return ""
    if s.lower() in {"nan", "none"}:
        return ""
    return s


def norm_col(c):
    import unicodedata
    s = unicodedata.normalize("NFD", str(c))
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    return "".join(ch for ch in s.upper() if ch.isalnum() or ch in " /.")


def main():
    if len(sys.argv) < 2:
        print("Uso: python generar_catalogo_sbn.py <ruta_al_Inventario_SBN.xlsm>")
        sys.exit(1)
    src = sys.argv[1]

    df = pd.read_excel(src, sheet_name="Catalogo", dtype=str)

    columnas_norm = {norm_col(col): col for col in df.columns}

    campos = [
        ("CODIGO", "codigo"),
        ("DENOMINACION", "denominacion"),
        ("GRUPO", "grupo"),
        ("CLASE", "clase"),
        ("RESOLUCION", "resolucion"),
        ("ESTADO", "estado"),
    ]

    lista = []
    for _, row in df.iterrows():
        r = {}
        for colkey, key in campos:
            col = columnas_norm.get(colkey)
            if col is not None:
                v = limpiar(row.get(col))
                if v:
                    r[key] = v
        if not r.get("codigo"):
            continue
        lista.append(r)

    def orden_grupo(g):
        m = re.match(r"^(\d+)", limpiar(g))
        return int(m.group(1)) if m else 999

    lista.sort(key=lambda x: (orden_grupo(x.get("grupo")), x.get("codigo", "")))

    data = {"catalogo": lista}

    js = "window.CATALOGO_SBN = " + json.dumps(
        data, ensure_ascii=False, separators=(",", ":")) + ";\n"

    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "catalogo_sbn.js")
    with open(out, "w", encoding="utf-8") as f:
        f.write(js)
    print("Escrito:", out, "(", os.path.getsize(out), "bytes )")
    print("Bienes del catálogo:", len(lista))


if __name__ == "__main__":
    main()
