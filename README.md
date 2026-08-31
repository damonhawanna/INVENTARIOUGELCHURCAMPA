# INVENTARIOUGELCHURCAMPA

Consulta web del inventario patrimonial de las instituciones educativas de la UGEL Churcampa.

Funciona **100 % offline** (los datos están embebidos en `data.js`, publicados con GitHub Pages) y es **instalable** (PWA) en Android y Windows.

## Instalación (PWA)

La web es una *Progressive Web App*: puede instalarse en el dispositivo para usarse como una aplicación nativa, sin conexión.

- **Android (Chrome):** abre la web → menú ⋮ → **Instalar aplicación** (o "Añadir a pantalla de inicio").
- **Windows (Edge/Chrome):** abre la web → icono de **Instalar** en la barra de direcciones (o menú ⋮ → Aplicaciones → Instalar esta web como una app).
- Tras instalarla, funciona aunque estés sin conexión.

## Funcionalidades

- Buscador de instituciones educativas (por nombre, **código modular**, código de institución o ubicación).
- Lista de instituciones coincidentes con la búsqueda, mostrando código modular, distrito y nivel.
- Inventario completo de la institución seleccionada.
- Filtros por bien, estado (Bueno/Regular/Nuevo), condición y tipo.
- Exportación a Excel (.xlsx) con los filtros aplicados.
- Columna **"Clase SBN"** que muestra la clasificación oficial del catálogo SBN por cada bien.
- Resumen global por tipo de bien (tarjetas de totales) y resumen desplegable por institución.
- **Generador de formularios de Alta** (`formulario.html`): formulario dinámico + importación desde Excel que produce los formatos oficiales **Captación de Datos** y **Relación de Bienes** (.xlsx) prellenados con los datos de la IE (autocompletados desde el catálogo).
- Funciona sin conexión a internet una vez cargada.

## Catálogo de instituciones

La búsqueda utiliza además el padrón oficial de instituciones educativas de la UGEL Churcampa (`instituciones.js`, generado desde `p.xlsx`), que incluye **código modular**, código de institución, distrito, nivel/modalidad, dirección y coordenadas. Al seleccionar una institución se muestran estos datos y se enlazan con los bienes del inventario (SIGA).

Para regenerar el catálogo:

```bash
python generar_instituciones.py "ruta/al/p.xlsx"
```

## Archivos

| Archivo | Descripción |
|---------|-------------|
| `index.html` | Interfaz principal |
| `formulario.html` | Panel de Generador de formularios (Alta de bienes) |
| `formulario.js` | Lógica del generador de formularios (autocompletar IE, generar .xlsx) |
| `styles.css` | Estilos |
| `app.js` | Lógica del cliente |
| `data.js` | Datos del inventario (48 995 registros, 267 instituciones) |
| `instituciones.js` | Catálogo de IIEE del padrón (362 instituciones con código modular) |
| `catalogo_sbn.js` | Catálogo oficial SBN de bienes (4 746 códigos, grupos y clases) |
| `mapeo_sbn.js` | Mapeo denominación → código/clase SBN (354 denominaciones) |
| `manifest.webmanifest` | Manifiesto PWA (nombre, tema, íconos) |
| `sw.js` | Service worker (instalación y uso offline) |
| `icon-192.png` / `icon-512.png` | Íconos de la app |
| `logo.png` | Logo de la UGEL Churcampa |
| `generar_datos.py` | Script para regenerar `data.js` desde el `.xls` |
| `generar_instituciones.py` | Script para regenerar `instituciones.js` desde el `p.xlsx` |
| `generar_catalogo_sbn.py` | Script para regenerar `catalogo_sbn.js` desde el `Inventario SBN.xlsm` |
| `generar_mapeo_sbn.py` | Script para regenerar `mapeo_sbn.js` (denominación → SBN) |

## Regenerar datos desde el Excel

```bash
python generar_datos.py "ruta/al/Inventario SIGA 2026.xls"
```

Genera `data.js` con todos los registros de las hojas: SEDE, CETPRO, PRONOEI, CEBE, CEBA, INICIAL, PRIMARIA, SECUNDARIA.
