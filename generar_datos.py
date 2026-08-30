# -*- coding: utf-8 -*-
"""
Genera data.js (INVENTARIOUGELCHURCAMPA) a partir del archivo Inventario SIGA 2026.xls
Uso:  python generar_datos.py  <ruta_al_xls>
Salida: data.js  (variable global DATOS_INVENTARIO)
"""
import sys
import json
import os
import pandas as pd

SHEETS = ["SEDE", "CETPRO", "PRONOEI", "CEBE", "CEBA",
          "INICIAL", "PRIMARIA", "SECUNDARIA"]

KEEP = [
    ("CODIGO PATRIMONIAL", "cod"),
    ("DENOMINACION BIEN", "bien"),
    ("TIPO", "tipo"),
    ("NRO DOC ADQUISICION", "doc"),
    ("FECHA ADQUISICION", "fecha"),
    ("VALOR ADQUISICION", "vadq"),
    ("VALOR NETO", "vneto"),
    ("NOMBRE AREA", "area"),
    ("ESTADO BIEN", "estado"),
    ("CONDICION", "cond"),
    ("MARCA", "marca"),
    ("MODELO", "modelo"),
    ("SERIE", "serie"),
    ("COLOR", "color"),
    ("APELLIDO PATERNO", "ap"),
    ("APELLIDO MATERNO", "am"),
    ("NOMBRES", "nom"),
]

CATEGORIA = {
    "SEDE": "SEDE / UGEL",
    "CETPRO": "CETPRO",
    "PRONOEI": "PRONOEI",
    "CEBE": "CEBE",
    "CEBA": "CEBA",
    "INICIAL": "INICIAL",
    "PRIMARIA": "PRIMARIA",
    "SECUNDARIA": "SECUNDARIA",
}

VALORES_LIMPIO = {"SIN MARCA", "SIN MODELO", "SIN SERIE", "SIN MEDIDAS",
                  "SIN CARACTERISTICAS", "NO INDICA", "NO INDIca", "nan",
                  "NAN", "NaN", "SIN INFORMACION"}


def limpiar(v):
    if v is None:
        return ""
    s = str(v).strip()
    if not s:
        return ""
    if s.lower() in {x.lower() for x in VALORES_LIMPIO}:
        return ""
    return s


def extraer_registros(sheet_name):
    df = pd.read_excel(xl, sheet_name=sheet_name, header=0, dtype=str)
    regs = []
    for _, row in df.iterrows():
        r = {"cat": CATEGORIA[sheet_name]}
        for col, key in KEEP:
            if col in df.columns:
                v = limpiar(row.get(col))
                if v:
                    r[key] = v
        # solo registros con denominacion o codigo
        if r.get("bien") or r.get("cod"):
            regs.append(r)
    return regs


def main():
    if len(sys.argv) < 2:
        print("Uso: python generar_datos.py <ruta_al_xls>")
        sys.exit(1)
    src = sys.argv[1]
    global xl
    xl = pd.ExcelFile(src)

    todos = []
    for s in SHEETS:
        todos.extend(extraer_registros(s))

    print("Registros totales:", len(todos))

    # nombres unicos de instituciones para la lista de coincidencias
    # agrupar por nombre de area (normalizado), mantener primera aparicion
    inst_by_area = {}
    for r in todos:
        a = r["area"]
        if not a:
            continue
        key = a
        if key not in inst_by_area:
            inst_by_area[key] = {"nombre": a, "cat": r["cat"]}
    instituciones = [
        {"nombre": v["nombre"], "cat": v["cat"]}
        for v in inst_by_area.values()
    ]
    instituciones.sort(key=lambda x: x["nombre"].lower())
    print("Instituciones unicas:", len(instituciones))

    data = {"registros": todos, "instituciones": instituciones}
    js = "window.INVENTARIOUGELCHURCAMPA = " + json.dumps(
        data, ensure_ascii=False, separators=(",", ":")) + ";\n"

    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data.js")
    with open(out, "w", encoding="utf-8") as f:
        f.write(js)
    print("Escrito:", out, "(", os.path.getsize(out), "bytes )")


if __name__ == "__main__":
    main()
