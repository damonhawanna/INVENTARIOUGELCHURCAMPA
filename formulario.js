(function () {
  "use strict";

  var CATALOGO = (window.CATALOGO_IIEE && window.CATALOGO_IIEE.instituciones) || [];

  var $ = function (id) { return document.getElementById(id); };

  var el = {
    ieSelect: $("ieSelect"), ieCodMod: $("ieCodMod"),
    ieNombre: $("ieNombre"), ieDistrito: $("ieDistrito"),
    ieProvincia: $("ieProvincia"), ieDireccion: $("ieDireccion"),
    dirNombre: $("dirNombre"), dirDni: $("dirDni"),
    dirTel: $("dirTel"), dirEmail: $("dirEmail"),
    tabAlta: $("tabAlta"), tabBaja: $("tabBaja"),
    cardAlta: $("cardAlta"), cardBaja: $("cardBaja"),
    result: $("result"),
    alta: {
      body: $("bienesBodyAlta"), addBtn: $("addRowBtnAlta"),
      file: $("importFileAlta"), label: $("importLabelAlta"), drop: $("dropZoneAlta"),
      genCaptacion: $("genCaptacion"), genRelacion: $("genRelacion"), genAmbos: $("genAmbos")
    },
    baja: {
      body: $("bienesBodyBaja"), addBtn: $("addRowBtnBaja"),
      file: $("importFileBaja"), label: $("importLabelBaja"), drop: $("dropZoneBaja"),
      genBaja: $("genBaja")
    }
  };

  var CAUSALES_BAJA = [
    "DETERIORO TOTAL O INSERVIBLE",
    "OBSOLESCENCIA",
    "PERDIDA - ROBO - EXTRAVIO",
    "NO APTO PARA FUNCIONAMIENTO",
    "REPARACION ANTIECONOMICA",
    "SINIESTRO (INCENDIO / INUNDACION / OTROS)",
    "BAJA TECNICA",
    "DONACION",
    "ENTREGA A ENTIDAD / TRANSFERENCIA",
    "OTRO"
  ];

  var CAUSALES_ALTA = [
    "COMPRA",
    "DONACION",
    "REPOSICION",
    "TRANSFERENCIA",
    "SOBRANTE / HALLAZGO",
    "OTRO"
  ];

  // ---------- Helpers ----------
  function linNombre(nombre) {
    return String(nombre || "").replace(/^\d+\s*/, "").trim();
  }

  function hoy() {
    var d = new Date();
    return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear();
  }

  function valorNum(v) {
    var n = parseFloat(String(v || "").replace(/[^0-9,.\-]/g, "").replace(",", "."));
    return isNaN(n) ? 0 : n;
  }

  function slug(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").substr(0, 40) || "bienes";
  }

  function mostrarResultado(mensaje, error) {
    if (!el.result) return;
    el.result.hidden = false;
    el.result.style.color = error ? "var(--danger)" : "var(--primary-dark)";
    el.result.innerHTML = (error ? "&#9888; " : "&#10004; ") + mensaje;
    el.result.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function escribir(hojas, nombreArchivo) {
    if (!window.XLSX) { mostrarResultado("Error: la librería de Excel no cargó. Revisa tu conexión a internet.", true); return; }
    var wb = XLSX.utils.book_new();
    hojas.forEach(function (h) {
      XLSX.utils.book_append_sheet(wb, h.hoja, h.nombre.substr(0, 31));
    });
    XLSX.writeFile(wb, nombreArchivo);
    mostrarResultado("Documento(s) generado(s): <strong>" + nombreArchivo + "</strong>", false);
  }

  // ---------- Institución ----------
  function poblarCatalogo() {
    if (!el.ieSelect) return;
    var frag = document.createDocumentFragment();
    var opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "-- Selecciona una institución --";
    frag.appendChild(opt);
    CATALOGO.slice().sort(function (a, b) { return (a.nombre || "").localeCompare(b.nombre || ""); })
      .forEach(function (ie) {
        var o = document.createElement("option");
        o.value = ie.cod_mod || "";
        o.setAttribute("data-cod", ie.cod_mod || "");
        o.textContent = ie.nombre + " - " + (ie.distrito || "");
        frag.appendChild(o);
      });
    el.ieSelect.appendChild(frag);
  }

  function aplicarIE(ie) {
    el.ieNombre.value = linNombre(ie.nombre);
    el.ieDistrito.value = ie.distrito || "";
    el.ieProvincia.value = ie.prov || "";
    el.ieDireccion.value = ie.direccion || "";
  }

  function buscarPorCodMod(cod) {
    cod = String(cod || "").trim();
    if (!cod) return null;
    return CATALOGO.find(function (ie) { return String(ie.cod_mod || "") === cod; }) ||
      CATALOGO.find(function (ie) { return String(ie.cod_inst || "") === cod; }) || null;
  }

  if (el.ieSelect) {
    el.ieSelect.addEventListener("change", function () {
      var ie = buscarPorCodMod(this.value);
      if (ie) { el.ieCodMod.value = ie.cod_mod || ""; aplicarIE(ie); }
    });
    el.ieCodMod.addEventListener("change", function () {
      var ie = buscarPorCodMod(this.value);
      if (ie) { el.ieSelect.value = ie.cod_mod || ""; aplicarIE(ie); }
    });
  }

  // ---------- Pestañas ----------
  function setTab(tab) {
    var alt = tab === "alta";
    el.cardAlta.hidden = !alt;
    el.cardBaja.hidden = alt;
    el.tabAlta.classList.toggle("active", alt);
    el.tabBaja.classList.toggle("active", !alt);
    el.alta.genCaptacion.hidden = !alt;
    el.alta.genRelacion.hidden = !alt;
    el.alta.genAmbos.hidden = !alt;
    el.baja.genBaja.hidden = alt;
  }

  if (el.tabAlta && el.tabBaja) {
    el.tabAlta.addEventListener("click", function () { setTab("alta"); });
    el.tabBaja.addEventListener("click", function () { setTab("baja"); });
  }

  // ---------- Tablas genéricas ----------
  var rowCnt = 0;
  function mkInput(field, opts) {
    var inp = document.createElement("input");
    inp.type = "text";
    inp.dataset.field = field;
    if (opts && opts.default) inp.value = opts.default;
    if (opts && opts.placeholder) inp.placeholder = opts.placeholder;
    return inp;
  }

  function mkSelect(field, opciones) {
    var sel = document.createElement("select");
    sel.dataset.field = field;
    var o = document.createElement("option");
    o.value = "";
    o.textContent = "";
    sel.appendChild(o);
    opciones.forEach(function (c) {
      var oo = document.createElement("option");
      oo.value = c; oo.textContent = c;
      sel.appendChild(oo);
    });
    return sel;
  }

  function nuevoTr(fields) {
    rowCnt += 1;
    var tr = document.createElement("tr");
    var th = document.createElement("td");
    th.className = "num-cell";
    th.textContent = rowCnt;
    tr.appendChild(th);
    fields.forEach(function (f) {
      var td = document.createElement("td");
      var control = f.type === "select" ? mkSelect(f.field, f.opciones) : mkInput(f.field, f);
      td.appendChild(control);
      tr.appendChild(td);
    });
    var tdBtn = document.createElement("td");
    tdBtn.className = "btn-col";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-rem";
    btn.textContent = "x";
    btn.title = "Eliminar";
    btn.addEventListener("click", function () { removerFila(tr); });
    tdBtn.appendChild(btn);
    tr.appendChild(tdBtn);
    return tr;
  }

  function removerFila(tr) { tr.remove(); renumero(tr.parentNode); }

  function renumero(tbody) {
    if (!tbody) return;
    var rows = tbody.querySelectorAll("tr");
    rows.forEach(function (r, i) { r.cells[0].textContent = i + 1; });
  }

  function leerFilas(tbody, fields) {
    var filas = [];
    if (!tbody) return filas;
    tbody.querySelectorAll("tr").forEach(function (tr) {
      var bien = {};
      fields.forEach(function (f) { bien[f.field] = ""; });
      tr.querySelectorAll("input[data-field], select[data-field]").forEach(function (inp) {
        bien[inp.dataset.field] = inp.value.trim();
      });
      filas.push(bien);
    });
    return filas;
  }

  function agregarFilaCon(tbody, fields, bien) {
    var tr = nuevoTr(fields);
    tbody.appendChild(tr);
    tr.querySelectorAll("input[data-field], select[data-field]").forEach(function (inp) {
      if (bien[inp.dataset.field] != null && String(bien[inp.dataset.field]) !== "") inp.value = bien[inp.dataset.field];
    });
  }

  // ---------- Definición de campos ----------
  var FIELDS_ALTA = [
    { field: "codigo", placeholder: "Código patrimonial" },
    { field: "den", placeholder: "Denominación" },
    { field: "marca" }, { field: "modelo" }, { field: "tipo" }, { field: "color" },
    { field: "serie", placeholder: "Serie / dimensiones" },
    { field: "estado" },
    { field: "valor", placeholder: "0.00" },
    { field: "cant", default: "1" },
    { field: "total", placeholder: "auto" },
    { field: "causal", type: "select", opciones: CAUSALES_ALTA },
    { field: "obs", placeholder: "Observaciones" }
  ];

  var FIELDS_BAJA = [
    { field: "codigo", placeholder: "Código patrimonial" },
    { field: "den", placeholder: "Denominación" },
    { field: "marca" }, { field: "modelo" }, { field: "tipo" }, { field: "color" },
    { field: "serie", placeholder: "Serie / dimensiones" },
    { field: "placa" }, { field: "motor" }, { field: "chasis" }, { field: "anio", placeholder: "Año" },
    { field: "estado" },
    { field: "valor", placeholder: "Valor en libros 0.00" },
    { field: "causal", type: "select", opciones: CAUSALES_BAJA },
    { field: "ubicacion" }
  ];

  function initTabla() {
    agregarFilaCon(el.alta.body, FIELDS_ALTA, { cant: "1" });
    agregarFilaCon(el.baja.body, FIELDS_BAJA, {});
  }

  // agregar/importar ALTA
  el.alta.addBtn.addEventListener("click", function () { agregarFilaCon(el.alta.body, FIELDS_ALTA, { cant: "1" }); });
  el.baja.addBtn.addEventListener("click", function () { agregarFilaCon(el.baja.body, FIELDS_BAJA, {}); });

  // ---------- Importar Excel ----------
  function manejarArchivo(file, tbody, fields) {
    if (!file) return;
    if (!window.XLSX) { mostrarResultado("Librería de Excel no disponible.", true); return; }
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var wb = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
        var ws = wb.Sheets[wb.SheetNames[0]];
        var rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        importarFilas(rows, tbody, fields);
      } catch (err) {
        mostrarResultado("No se pudo leer el archivo: " + err.message, true);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function filaMap(row, idx) {
    var map = { codigo: -1, den: -1, marca: -1, modelo: -1, tipo: -1, color: -1, serie: -1,
      estado: -1, valor: -1, cant: -1, total: -1, causal: -1, obs: -1,
      placa: -1, motor: -1, chasis: -1, anio: -1, ubicacion: -1, row: idx };
    if (!row) return map;
    var reG = /denominaci|descripci|caracter|detalle|bien de/i;
    var reCod = /c[oó]digo patrimonial|patrimonial/i;
    row.forEach(function (c, i) {
      var s = String(c == null ? "" : c).trim();
      if (!s) return;
      if (reCod.test(s) && map.codigo < 0) map.codigo = i;
      if (/marca/i.test(s) && !/n° de placa/.test(s) && map.marca < 0) map.marca = i;
      if (/modelo/i.test(s) && map.modelo < 0) map.modelo = i;
      if (/^tipo$/i.test(s) && map.tipo < 0) map.tipo = i;
      if (/^color$/i.test(s) && map.color < 0) map.color = i;
      if (/serie/i.test(s) && map.serie < 0) map.serie = i;
      if (/estado/i.test(s) && map.estado < 0) map.estado = i;
      if (/placa/i.test(s) && map.placa < 0) map.placa = i;
      if (/motor/i.test(s) && map.motor < 0) map.motor = i;
      if (/chasis/i.test(s) && map.chasis < 0) map.chasis = i;
      if (/a\~?[nñ]o de fabricaci|a\~?[nñ]o fabri|^a\~?[nñ]o$/i.test(s) && map.anio < 0) map.anio = i;
      if (/ubicaci/i.test(s) && map.ubicacion < 0) map.ubicacion = i;
      if (/valor unitario|valor costo|valor actual|valor en libros/i.test(s) && map.valor < 0) map.valor = i;
      if (reG.test(s) && map.den < 0 && s.length <= 40 && !/relaci|formato|inventario anual|a dar de/i.test(s)) map.den = i;
      if (/cantidad|^cant\./i.test(s) && map.cant < 0) map.cant = i;
      if (/causal/i.test(s) && map.causal < 0) map.causal = i;
      if (map.total < 0 && (/^total|costo total/i.test(s))) map.total = i;
      if (/observaci/i.test(s) && map.obs < 0) map.obs = i;
    });
    return map;
  }

  function importarFilas(rows, tbody, fields) {
    if (!rows || !rows.length) { mostrarResultado("El archivo está vacío.", true); return; }
    var enc = null;
    for (var i = 0; i < rows.length && !enc; i++) {
      var m = filaMap(rows[i], i);
      if (m.den >= 0) enc = m;
    }
    if (!enc) { mostrarResultado("No se encontró la columna de denominación/descripción.", true); return; }
    var dataStart = enc.row < 0 ? enc.fila + 1 : enc.row + 1;
    var count = 0;
    for (var r = dataStart; r < rows.length; r++) {
      var row = rows[r];
      if (!row || !row.some) continue;
      var comp = row.join(" ").trim();
      if (!comp) continue;
      if (/total general/i.test(comp)) break;
      var den = String(row[enc.den] == null ? "" : row[enc.den]).trim();
      if (!den) continue;
      var bien = {};
      fields.forEach(function (f) { bien[f.field] = ""; });
      bien.den = den;
      var idxMap = { codigo: enc.codigo, marca: enc.marca, modelo: enc.modelo, tipo: enc.tipo,
        color: enc.color, serie: enc.serie, estado: enc.estado, valor: enc.valor, cant: enc.cant,
        total: enc.total, causal: enc.causal, obs: enc.obs, placa: enc.placa, motor: enc.motor,
        chasis: enc.chasis, anio: enc.anio, ubicacion: enc.ubicacion };
      Object.keys(idxMap).forEach(function (k) {
        var ci = idxMap[k];
        if (ci >= 0 && row[ci] != null) bien[k] = String(row[ci]).trim();
      });
      if (!bien.cant) bien.cant = "1";
      agregarFilaCon(tbody, fields, bien);
      count++;
    }
    if (!count) mostrarResultado("No se encontraron filas de bienes. Revisa el encabezado.", true);
    else mostrarResultado("Se importaron <strong>" + count + "</strong> bienes.", false);
  }

  function bindDrop(cfg) {
    cfg.file.addEventListener("change", function () { manejarArchivo(this.files && this.files[0], cfg.body, cfg.fields); this.value = ""; });
    cfg.label.addEventListener("click", function (e) { e.preventDefault(); cfg.file.click(); });
    ["dragover", "dragenter"].forEach(function (ev) {
      cfg.drop.addEventListener(ev, function (e) { e.preventDefault(); cfg.drop.classList.add("drag-over"); });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      cfg.drop.addEventListener(ev, function (e) { e.preventDefault(); cfg.drop.classList.remove("drag-over"); });
    });
    cfg.drop.addEventListener("drop", function (e) {
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) manejarArchivo(f, cfg.body, cfg.fields);
    });
    cfg.drop.addEventListener("click", function () { cfg.file.click(); });
  }

  // ---------- Datos IE ----------
  function datosIE() {
    return {
      nombre: el.ieNombre.value.trim(),
      distrito: el.ieDistrito.value.trim(),
      provincia: el.ieProvincia.value.trim() || "CHURCAMPA",
      direccion: el.ieDireccion.value.trim(),
      codMod: el.ieCodMod.value.trim(),
      director: el.dirNombre.value.trim(),
      dni: el.dirDni.value.trim(),
      tel: el.dirTel.value.trim(),
      email: el.dirEmail.value.trim(),
      fecha: hoy()
    };
  }

  // ---------- Hojas ALTA ----------
  function hojaCaptacion(bienes, ie) {
    var data = [
      ["UNIDAD DE GESTIÓN EDUCATIVA LOCAL - CHURCAMPA"],
      ["FORMATO DE CAPTACIÓN DE DATOS - ALTA DE BIENES"],
      [""],
      ["NOMBRE DE LA IIEE / ENTIDAD: ", ie.nombre],
      ["DISTRITO: ", ie.distrito, "      PROVINCIA: ", ie.provincia],
      ["DIRECCIÓN: ", ie.direccion],
      ["DIRECTOR(A): ", ie.director, "      FECHA: ", ie.fecha]
    ];
    var cols = ["CODIGO PATRIMONIAL", "DESCRIPCIÓN DEL BIEN", "MOTIVO DE ALTA", "DOCUMENTO SUSTENTATORIO",
      "MARCA", "MODELO", "COLOR", "SERIE / MEDIDAS", "UBICACIÓN", "VALOR COSTO (S/)",
      "VALOR TASACIÓN (S/)", "OBSERVACIONES"];
    data.push(cols);
    bienes.forEach(function (b) {
      data.push([b.codigo, b.den, b.causal, "", b.marca, b.modelo, b.color, b.serie, "", valorNum(b.valor), "", b.obs]);
    });
    var ws = XLSX.utils.aoa_to_sheet(data);
    ws["!cols"] = [{ wch: 16 }, { wch: 34 }, { wch: 22 }, { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 18 }, { wch: 13 }, { wch: 15 }, { wch: 20 }];
    return { nombre: "Captación de Datos", hoja: ws };
  }

  function hojaRelacionAlta(bienes, ie) {
    var aoa = [];
    aoa.push(["GOBIERNO REGIONAL HUANCAVELICA", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
    aoa.push(["UNIDAD DE GESTIÓN EDUCATIVA LOCAL CHURCAMPA", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
    aoa.push(["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
    aoa.push(["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
    aoa.push(["RELACIÓN DE BIENES A DAR DE ALTA", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
    aoa.push(["NOMBRE DE LA IIEE / ENTIDAD: " + ie.nombre, "", "", "", "", "", "", "", "", "APELLIDOS Y NOMBRES DEL DIRECTOR: " + ie.director, "", "", "", "", "", "", "", "", ""]);
    aoa.push(["DIRECCIÓN: " + ie.direccion, "", "", "", "", "", "", "", "", "N° TELÉFONO / CELULAR: " + ie.tel, "", "", "", "", "", "", "", "", ""]);
    aoa.push(["DISTRITO: " + ie.distrito, "", "", "", "", "", "", "", "", "CORREO ELECTRÓNICO: " + ie.email, "", "", "", "", "", "", "", "", ""]);
    aoa.push(["PROVINCIA: " + ie.provincia, "", "", "", "", "", "", "", "", "FECHA: " + ie.fecha, "", "", "", "", "", "", "", "", ""]);
    aoa.push(["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
    aoa.push(["ITEMS", "CANTIDAD", "DENOMINACIÓN DEL BIEN", "", "", "", "", "", "MARCA", "MODELO", "TIPO", "COLOR", "SERIE / DIMENSIONES", "N° DE PLACA DE RODAJE", "N° DE MOTOR", "AÑO DE FABRICACIÓN", "UBICACIÓN DEL BIEN", "ESTADO DEL BIEN", "VALOR UNITARIO S/.", "TOTAL S/."]);
    aoa.push(["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
    aoa.push(["VALOR ACTUAL", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
    aoa.push(["VALOR DE TASACIÓN", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
    aoa.push(["CAUSAL DE ALTA", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
    var tV = 0, tT = 0;
    bienes.forEach(function (b, i) {
      var v = valorNum(b.valor), q = valorNum(b.cant || 1);
      tV += v; tT += v * q;
      aoa.push([String(i + 1), b.cant || "1", b.den, "", "", "", "", "", b.marca, b.modelo, b.tipo, b.color, b.serie, "", "", "", b.estado, v || "", v * q || ""]);
    });
    while (aoa.length < 38) aoa.push(["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
    aoa.push(["TOTAL GENERAL", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", tV, tT]);
    var ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 6 }, { wch: 9 }, { wch: 28 }, { wch: 7 }, { wch: 7 }, { wch: 7 }, { wch: 7 }, { wch: 7 }, { wch: 12 }, { wch: 11 }, { wch: 8 }, { wch: 8 }, { wch: 16 }, { wch: 10 }, { wch: 9 }, { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 12 }];
    return { nombre: "Relación de Bienes", hoja: ws };
  }

  // ---------- Hoja BAJA (Anexo 28-A) ----------
  function hojaRelacionBaja(bienes, ie) {
    var aoa = [];
    aoa.push(["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
    aoa.push(["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
    aoa.push(["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
    aoa.push(["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
    aoa.push(["RELACIÓN DE BIENES MUEBLES PARA DAR DE BAJA", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
    aoa.push(["UNIDAD EJECUTORA: ", "314-001643 - UGEL CHURCAMPA", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
    aoa.push(["UGEL: ", "CHURCAMPA", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
    aoa.push(["I.E.: ", ie.nombre, "", "", "LUGAR: ", ie.direccion, "", "", "DISTRITO: ", ie.distrito, "", "", "ANEXO N° 28-A", "", "", ""]);
    aoa.push(["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
    aoa.push(["ITEMS", "CODIGO PATRIMONIAL", "DESCRIPCION DEL BIEN", "", "", "", "", "", "", "", "", "", "ESTADO DEL BIEN", "VALOR EN LIBROS", "CAUSAL DE BAJA", "UBICACIÓN DEL BIEN"]);
    aoa.push(["", "", "DENOMINACION", "MARCA", "MODELO", "TIPO", "COLOR", "SERIE/DIMENSIONES", "N° DE PLACA DE RODAJE", "N° DE MOTOR", "NRO_CHASIS", "AÑO DE FABRICACION", "", "", "", ""]);
    var tL = 0;
    bienes.forEach(function (b, i) {
      var v = valorNum(b.valor);
      tL += v;
      aoa.push([String(i + 1), b.codigo, b.den, b.marca, b.modelo, b.tipo, b.color, b.serie, b.placa, b.motor, b.chasis, b.anio, b.estado, v || "", b.causal, b.ubicacion]);
    });
    while (aoa.length < 38) aoa.push(["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
    aoa.push(["", "", "", "", "", "", "", "", "", "", "", "", "", "TOTAL VALOR EN LIBROS: " + tL, "", ""]);
    aoa.push(["", "RESPONSABLE DEL ALMACEN / PATRIMONIO", "", "", "", "", "", "", "", "", "", "", "", "DIRECTOR DE LA IIEE", "", ""]);
    aoa.push(["", "NOMBRE:", "", "", "", "", "", "", "", "", "", "", "", "NOMBRE:", "", ""]);
    aoa.push(["", "DNI:", "", "", "", "", "", "", "", "", "", "", "", "DNI:", "", ""]);
    aoa.push(["", "FIRMA:", "", "", "", "", "", "", "", "", "", "", "", "FIRMA:", "", ""]);
    var ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 6 }, { wch: 16 }, { wch: 28 }, { wch: 12 }, { wch: 11 }, { wch: 8 }, { wch: 8 }, { wch: 16 }, { wch: 10 }, { wch: 9 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 20 }, { wch: 14 }];
    return { nombre: "Relación de Baja", hoja: ws };
  }

  // ---------- Acciones ----------
  function validarParaGenerar(tbody, fields) {
    var ie = datosIE();
    if (!ie.nombre) { mostrarResultado("Ingresa la institución educativa.", true); return null; }
    var bienes = leerFilas(tbody, fields).filter(function (b) { return b.den; });
    if (!bienes.length) { mostrarResultado("Agrega al menos un bien con su denominación.", true); return null; }
    return { bienes: bienes, ie: ie };
  }

  el.alta.genCaptacion.addEventListener("click", function () {
    var d = validarParaGenerar(el.alta.body, FIELDS_ALTA); if (!d) return;
    escribir([hojaCaptacion(d.bienes, d.ie)], "Captacion-de-Datos-" + slug(d.ie.nombre) + ".xlsx");
  });
  el.alta.genRelacion.addEventListener("click", function () {
    var d = validarParaGenerar(el.alta.body, FIELDS_ALTA); if (!d) return;
    escribir([hojaRelacionAlta(d.bienes, d.ie)], "Relacion-de-Bienes-" + slug(d.ie.nombre) + ".xlsx");
  });
  el.alta.genAmbos.addEventListener("click", function () {
    var d = validarParaGenerar(el.alta.body, FIELDS_ALTA); if (!d) return;
    var base = slug(d.ie.nombre);
    escribir([hojaCaptacion(d.bienes, d.ie)], "Captacion-de-Datos-" + base + ".xlsx");
    escribir([hojaRelacionAlta(d.bienes, d.ie)], "Relacion-de-Bienes-" + base + ".xlsx");
  });
  el.baja.genBaja.addEventListener("click", function () {
    var d = validarParaGenerar(el.baja.body, FIELDS_BAJA); if (!d) return;
    escribir([hojaRelacionBaja(d.bienes, d.ie)], "Relacion-de-Bienes-a-dar-de-Baja-" + slug(d.ie.nombre) + ".xlsx");
  });

  // ---------- Init ----------
  poblarCatalogo();
  initTabla();
  bindDrop({ body: el.alta.body, fields: FIELDS_ALTA, file: el.alta.file, label: el.alta.label, drop: el.alta.drop });
  bindDrop({ body: el.baja.body, fields: FIELDS_BAJA, file: el.baja.file, label: el.baja.label, drop: el.baja.drop });
  setTab("alta");
})();
