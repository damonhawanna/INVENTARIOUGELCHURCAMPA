# INVENTARIOUGELCHURCAMPA

Consulta web del inventario patrimonial de las instituciones educativas de la UGEL Churcampa.

Funciona **100 % offline** (los datos están embebidos en `data.js`, publicados con GitHub Pages).

## Funcionalidades

- Buscador de instituciones educativas (por nombre, código o ubicación).
- Lista de instituciones coincidentes con la búsqueda.
- Inventario completo de la institución seleccionada.
- Filtros por bien, estado (Bueno/Regular/Nuevo), condición y tipo.
- Exportación a CSV.
- Funciona sin conexión a internet una vez cargada.

## Archivos

| Archivo | Descripción |
|---------|-------------|
| `index.html` | Interfaz principal |
| `styles.css` | Estilos |
| `app.js` | Lógica del cliente |
| `data.js` | Datos del inventario (48 995 registros, 267 instituciones) |
| `generar_datos.py` | Script para regenerar `data.js` desde el `.xls` |

## Regenerar datos desde el Excel

```bash
python generar_datos.py "ruta/al/Inventario SIGA 2026.xls"
```

Genera `data.js` con todos los registros de las hojas: SEDE, CETPRO, PRONOEI, CEBE, CEBA, INICIAL, PRIMARIA, SECUNDARIA.
