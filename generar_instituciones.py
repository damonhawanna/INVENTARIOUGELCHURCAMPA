# -*- coding: utf-8 -*-
"""
Genera instituciones.js (catálogo de instituciones educativas de la UGEL Churcampa)
a partir del archivo p.xlsx (listado de IIEE con código modular, ubicación, coordenadas).

Uso:  python generar_instituciones.py  <ruta_al_p.xlsx>
Salida: instituciones.js  (variable global CATALOGO_IIEE con lista de objetos)
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
    if s.lower() in {"nan", "none", "sin informacion"}:
        return ""
    return s


def num(v):
    s = limpiar(v)
    m = re.match(r"^[\d]+(?:\.\d+)?", s.replace(",", "."))
    if m and re.search(r"\d", m.group(0)):
        return m.group(0)
    return ""


def main():
    if len(sys.argv) < 2:
        print("Uso: python generar_instituciones.py <ruta_al_p.xlsx>")
        sys.exit(1)
    src = sys.argv[1]

    df = pd.read_excel(src, sheet_name=0, dtype=str)

    def norm_col(c):
        import unicodedata
        s = unicodedata.normalize("NFD", str(c))
        s = "".join(ch for ch in s if not unicodedata.combining(ch))
        return "".join(ch for ch in s if ch.isalnum() or ch in " /.").upper()

    columnas_norm = {}
    for col in df.columns:
        columnas_norm[norm_col(col)] = col

    campos = [
        ("CODIGO INSTITUCION", "cod_inst"),
        ("CODIGO MODULAR", "cod_mod"),
        ("ANEXO", "anexo"),
        ("NOMBRE DE SS.EE.", "nombre"),
        ("UBIGEO", "ubigeo"),
        ("DEPARTAMENTO", "depto"),
        ("PROVINCIA", "prov"),
        ("DISTRITO", "distrito"),
        ("CODIGO DRE/UGEL", "cod_ugel"),
        ("DRE / UGEL", "ugel"),
        ("CENTRO POBLADO", "c_poblado"),
        ("CODIGO CENTRO POBLADO", "cod_cp"),
        ("CODIGO LOCAL", "cod_local"),
        ("DIRECCION", "direccion"),
        ("NIVEL / MODALIDAD", "nivel"),
        ("GESTION / DEPENDENCIA", "gestion"),
        ("LATITUD", "lat"),
        ("LONGITUD", "lon"),
        ("ALTITUD", "altitud"),
    ]

    lista = []
    mapeo_nombre = {}  # nombre (mayusc normalizada) -> primer registro
    mapeo_modular = {}
    mapeo_codigo = {}

    for _, row in df.iterrows():
        r = {}
        for colkey, key in campos:
            col = columnas_norm.get(colkey)
            if col is not None:
                v = limpiar(row.get(col))
                if v:
                    r[key] = v
        if not (r.get("nombre") or r.get("cod_mod")):
            continue

        # numero al inicio del nombre (ej "1000 NIÑO EMMANUEL" -> codigo corto)
        nm_col = columnas_norm.get("NOMBRE DE SS.EE.")
        m = re.match(r"^(\d+)", limpiar(row.get(nm_col)) if nm_col else "")
        if m:
            r["cod_corto"] = m.group(1)

        lista.append(r)

        nk = re.sub(r"[\u0300-\u036f]", "", (r.get("nombre") or "").lower())
        if nk and nk not in mapeo_nombre:
            mapeo_nombre[nk] = r
        if r.get("cod_mod") and r["cod_mod"] not in mapeo_modular:
            mapeo_modular[r["cod_mod"]] = r
        if r.get("cod_inst") and r["cod_inst"] not in mapeo_codigo:
            mapeo_codigo[r["cod_inst"]] = r

    # ordenar por nombre
    lista.sort(key=lambda x: x.get("nombre", "").lower())

    data = {"instituciones": lista}

    js = "window.CATALOGO_IIEE = " + json.dumps(
        data, ensure_ascii=False, separators=(",", ":")) + ";\n"

    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "instituciones.js")
    with open(out, "w", encoding="utf-8") as f:
        f.write(js)
    print("Escrito:", out, "(", os.path.getsize(out), "bytes )")
    print("Instituciones:", len(lista))


if __name__ == "__main__":
    main()
