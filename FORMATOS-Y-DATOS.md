# Formatos y Datos Fuente (D:\patrimonio-siga\datos-crudo\Inventario-y-formatos)

Documento de referencia sobre los archivos fuente disponibles para la plataforma
INVENTARIOUGELCHURCAMPA, qué contienen y cómo se aprovechan.

## Resumen

| Archivo / Carpeta | Qué es | ¿Se usa? |
|---|---|---|
| `Inventario SBN.xlsm` | Formato oficial SBN + **Catálogo SBN (4.746 códigos)** | ✅ Sí — estandarizar/normalizar bienes |
| `Alta de Bienes\04 Captación de datos.xlsx` | Formato oficial de **captación/alta** que llena cada IE | ✅ Sí — entrada para el plan de actualización |
| `Baja de Bienes\01 Relacion de bienes a dar de baja.xls`, `04/05 17-A/17-B` | Formatos oficiales de **baja** | ✅ Sí — flujo de bajas |
| `UIT.xlsx` | Histórico de UIT por año | ⚠️ Referencia (cálculo de límites) |
| `p.xlsx` | Padrón de IIEE (código modular, ubicación) | ✅ Ya usado → `instituciones.js` |
| `Inventario SIGA 2026.xls` | Inventario maestro SIGA | ✅ Ya usado → `data.js` |
| `Alta de Bienes/` (00–09), `Baja de Bienes/`, `BIENES CULTURALES/`, `DONACION/`, `BAJA AUXILIARES/` | Oficios, actas, declaraciones, informes técnicos (plantillas `.doc/.docx`) | ❌ Solo formularios, no datos |
| `*.rar`, `*.mp4`, `*.pptx`, pdfs | Comprensiones, videos, presentaciones | ❌ Material de referencia |

## 1. Inventario SBN.xlsm (el más valioso)

Formato oficial del **Sistema de Bienes Nacionales** (SBN / MINECO).

### Hoja `Catalogo`
- **4.746 bienes** con código oficial, denominación, grupo, clase, resolución y estado.
- Taxonomía: **14 grupos** y **10 clases** (Oficina, Cómputo, Mobiliario, Equipo, etc.).
- Ejemplo: `04220001` → `ELECTROEYACULADOR PARA BOVINOS` → grupo `04 AGRICOLA Y PESQUERO`, clase `22 EQUIPO`.
- **Uso en la plataforma:** se extrajo a `catalogo_sbn.js` (variable `CATALOGO_SBN`) mediante
  `generar_catalogo_sbn.py`. Además se generó `mapeo_sbn.js` (variable `MAPEO_SBN`, 354 denominaciones
  únicas del inventario → código/clase/grupo SBN) mediante `generar_mapeo_sbn.py`, que la web usa para
  mostrar la columna **"Clase SBN"** en el inventario y estandarizar las denominaciones.

### Hoja `Estructura`
- Define los **52 campos oficiales** del inventario (código patrimonial, denominación, valor de
  adquisición, depreciación, valor neto, responsable, etc.) con tipo, longitud y obligatoriedad.
- Útil si queremos enriquecer la tabla con campos oficiales que hoy no mostramos.

### Hoja `Inventario`
- Plantilla del formato completo (sin filas de datos) con los 52 campos como encabezados.

### Hojas `Cuentas Contable`, `Valida_Columna`
- Cuentas contables (1503, etc.), UIT 2026 y valores válidos de columnas (tipo causal, estado, etc.).

## 2. Formato de Alta (04 Captación de datos.xlsx)

Formato oficial `FORMATO DE INVENTARIO DE BIENES PARA DAR ALTA` que llena cada IE.
Columnas: **Código Patrimonial, Descripción del bien, Motivo de Alta, N° Doc. Sustentatorio,
Marca, Modelo, Color, Serie/Medidas, Ubicación física Actual, Valor Costo, Valor Tasación, Observaciones**.
Incluye datos de la IE (nombre, dirección, distrito, directivo) y firmas (director, inventariador, control patrimonial).

- **Uso en la plataforma:** es el formato natural de entrada para que una IE reporte **altas**.
  En el plan `PLAN-ACTUALIZACION.md` se prevé aceptarlo en `upload.html` y hacer el merge por IE.

## 3. Formato de Baja

- `01 Relacion de bienes a dar de baja.xls` → columnas: **Código Patrimonial, Descripción,
  Estado, Valor en libros, Causal de baja, Ubicación**.
- `04 17-A Muebles y Enseres.xls`, `05 17-B Maquinaria y Equipo.xls` → formatos oficiales de baja
  registrables ante SBN.

- **Uso en la plataforma:** conectar con el flujo de **bajas reales** del plan de actualización.

## 4. UIT.xlsx

Valores históricos de la UIT (2025=5.350, 2024=5.150, ...). Útil como referencia para límites de
valor en bajas/tasaciones.

## Cómo regenerar los archivos derivados

```bash
# Catálogo de IIEE (ya existente)
python generar_instituciones.py "D:\patrimonio-siga\datos-crudo\Inventario-y-formatos\p.xlsx"

# Catálogo SBN de bienes
python generar_catalogo_sbn.py "D:\patrimonio-siga\datos-crudo\Inventario-y-formatos\Inventario SBN.xlsm"

# Inventario maestro SIGA
python generar_datos.py "D:\patrimonio-siga\datos-crudo\Inventario-y-formatos\Inventario SIGA 2026.xls"
```
