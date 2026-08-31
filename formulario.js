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
    bienesBody: $("bienesBody"), addRowBtn: $("addRowBtn"),
    importFile: $("importFile"), importLabel: $("importLabel"),
    dropZone: $("dropZone"),
    genCaptacion: $("genCaptacion"), genRelacion: $("genRelacion"),
    genAmbos: $("genAmbos"), result: $("result")
  };

  function linNombre(nombre) {
    return String(nombre || "").replace(/^\d+\s*/, "").trim();
  }

  function hoy() {
    var d = new Date();
    return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear();
  }

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

  el.ieSelect.addEventListener("change", function () {
    var ie = buscarPorCodMod(this.value);
    if (ie) { el.ieCodMod.value = ie.cod_mod || ""; aplicarIE(ie); }
  });

  el.ieCodMod.addEventListener("change", function () {
    var ie = buscarPorCodMod(this.value);
    if (ie) { el.ieSelect.value = ie.cod_mod || ""; aplicarIE(ie); }
  });

  var rowCnt = 0;
  var FIELDS = ["codigo", "den", "marca", "modelo", "tipo", "color", "serie", "estado", "valor", "cant", "total", "causal", "obs"];

  function nuevoTr() {
    rowCnt += 1;
    var tr = document.createElement("tr");
    var th = document.createElement("td");
    th.className = "num-cell";
    th.textContent = rowCnt;
    tr.appendChild(th);

    FIELDS.forEach(function (f) {
      var td = document.createElement("td");
      var inp = document.createElement("input");
      inp.type = "text";
      inp.dataset.field = f;
      if (f === "cant") inp.value = "1";
      td.appendChild(inp);
      tr.appendChild(td);
    });

    var tdBtn = document.createElement("td");
    tdBtn.className = "btn-col";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-rem";
    btn.textContent = "x";
    btn.title = "Eliminar bien";
    btn.addEventListener("click", function () { removerFila(tr); });
    tdBtn.appendChild(btn);
    tr.appendChild(tdBtn);
    return tr;
  }

  function agregarFila() {
    el.bienesBody.appendChild(nuevoTr());
  }

  function removerFila(tr) {
    tr.remove();
    renumero();
  }

  function renumero() {
    var rows = el.bienesBody.querySelectorAll("tr");
    rows.forEach(function (r, i) {
      r.cells[0].textContent = i + 1;
    });
  }

  el.addRowBtn.addEventListener("click", agregarFila);
  agregarFila();

  function leerFilas() {
    var filas = [];
    el.bienesBody.querySelectorAll("tr").forEach(function (tr) {
      var bien = { codigo: "", den: "", marca: "", modelo: "", tipo: "", color: "", serie: "",
        estado: "", valor: "", cant: "1", total: "", causal: "", obs: "" };
      tr.querySelectorAll("input[data-field]").forEach(function (inp) {
        bien[inp.dataset.field] = inp.value.trim();
      });
      filas.push(bien);
    });
    return filas;
  }

  function valorNum(v) {
    var n = parseFloat(String(v || "").replace(/[^0-9,.\-]/g, "").replace(",", "."));
    return isNaN(n) ? 0 : n;
  }

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

  function escribir(hojas, nombreArchivo) {
    if (!window.XLSX) { mostrarResultado("Error: la librería de Excel no cargó. Revisa tu conexión a internet.", true); return; }
    var wb = XLSX.utils.book_new();
    hojas.forEach(function (h) {
      XLSX.utils.book_append_sheet(wb, h.hoja, h.nombre.substr(0, 31));
    });
    XLSX.writeFile(wb, nombreArchivo);
    mostrarResultado("Documento(s) generado(s) correctamente: <strong>" + nombreArchivo + "</strong>", false);
  }

  function mostrarResultado(mensaje, error) {
    el.result.hidden = false;
    el.result.style.color = error ? "var(--danger)" : "var(--primary-dark)";
    el.result.innerHTML = (error ? "&#9888; " : "&#10004; ") + mensaje;
  }

  // ---------- Captación de Datos (04) ----------
  function hojaCaptacion(bienes, ie) {
    var encabezado = [
      ["UNIDAD DE GESTIÓN EDUCATIVA LOCAL - CHURCAMPA"],
      ["FORMATO DE CAPTACIÓN DE DATOS COBIERNO REGIONAL - ALTA DE BIENES"],
      [""],
      ["NOMBRE DE LA IIEE / ENTIDAD: ", ie.nombre],
      ["DISTRITO: ", ie.distrito, "      PROVINCIA: ", ie.provincia],
      ["DIRECCIÓN: ", ie.direccion],
      ["DIRECTOR(A): ", ie.director, "      FECHA: ", ie.fecha]
    ];
    var cols = [
      "CODIGO PATRIMONIAL", "DESCRIPCIÓN DEL BIEN", "MOTIVO DE ALTA", "DOCUMENTO SUSTENTATORIO",
      "MARCA", "MODELO", "COLOR", "SERIE / MEDIDAS", "UBICACIÓN", "VALOR COSTO (S/)",
      "VALOR TASACIÓN (S/)", "OBSERVACIONES"
    ];
    var data = [encabezado, cols];
    bienes.forEach(function (b) {
      data.push([
        b.codigo, b.den, b.causal, "", b.marca, b.modelo, b.color, b.serie, "",
        valorNum(b.valor), "", b.obs
      ]);
    });
    var ws = XLSX.utils.aoa_to_sheet(data);
    ws["!cols"] = [{ wch: 16 }, { wch: 34 }, { wch: 22 }, { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 18 }, { wch: 13 }, { wch: 15 }, { wch: 20 }];
    return { nombre: "Captación de Datos", hoja: ws };
  }

  // ---------- Relación de Bienes (09) ----------
  function hojaRelacion(bienes, ie) {
    var aoa = [];
    aoa.push(["GOBIERNO REGIONAL HUANCAVELICA", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
    aoa.push(["UNIDAD DE GESTIÓN EDUCATIVA LOCAL CHURCAMPA", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
    aoa.push(["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
    aoa.push(["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
    aoa.push(["FORMATO DE INVENTARIO ANUAL DE BIENES MUEBLES - RELACIÓN DE BIENES A DAR DE ALTA", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
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

    bienes.forEach(function (b, i) {
      aoa.push([
        String(i + 1), b.cant || "1", b.den, "", "", "", "", "", b.marca, b.modelo, b.tipo, b.color, b.serie, "", "",
        "", b.estado, b.valor ? valorNum(b.valor) : "", (valorNum(b.valor) * valorNum(b.cant || 1)) || ""
      ]);
    });

    var totalV = 0, totalT = 0;
    bienes.forEach(function (b) { totalV += valorNum(b.valor); totalT += valorNum(b.valor) * valorNum(b.cant || 1); });

    while (aoa.length < 38) aoa.push(["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
    aoa.push(["TOTAL GENERAL", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", totalV, totalT]);

    var ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 6 }, { wch: 9 }, { wch: 28 }, { wch: 7 }, { wch: 7 }, { wch: 7 }, { wch: 7 }, { wch: 7 }, { wch: 12 }, { wch: 11 }, { wch: 8 }, { wch: 8 }, { wch: 16 }, { wch: 10 }, { wch: 9 }, { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 12 }];
    return { nombre: "Relación de Bienes", hoja: ws };
  }

  // ---------- Importar Excel ----------
  function manejarArchivo(file) {
    if (!file) return;
    if (!window.XLSX) { mostrarResultado("Librería de Excel no disponible.", true); return; }
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var wb = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
        var ws = wb.Sheets[wb.SheetNames[0]];
        var rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        importarFilas(rows);
      } catch (err) {
        mostrarResultado("No se pudo leer el archivo: " + err.message, true);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function importarFilas(rows) {
    if (!rows || !rows.length) { mostrarResultado("El archivo está vacío.", true); return; }
    var enc = null;
    for (var i = 0; i < rows.length && !enc; i++) {
      var m = filaMap(rows[i], i);
      if (m.den >= 0) enc = m;
    }
    if (!enc) {
      mostrarResultado("No se encontró una columna de denominación/descripción del bien en el archivo.", true);
      return;
    }
    var dataStart = enc.fila < 0 ? enc.row + 1 : enc.fila + 1;
    var count = 0;
    for (var r = dataStart; r < rows.length; r++) {
      var row = rows[r];
      if (!row || !row.some) continue;
      var celdas = row.slice();
      var comp = celdas.join(" ").trim();
      if (!comp) continue;
      if (/total general/i.test(comp)) break;
      var den = String(celdas[enc.den] == null ? "" : celdas[enc.den]).trim();
      if (!den) continue;
      var bien = {
        codigo: str(celdas[enc.codigo]), den: den, marca: str(celdas[enc.marca]),
        modelo: str(celdas[enc.modelo]), tipo: str(celdas[enc.tipo]), color: str(celdas[enc.color]),
        serie: str(celdas[enc.serie]), estado: str(celdas[enc.estado]),
        valor: numStr(celdas[enc.valor]), cant: numStr(celdas[enc.cant]),
        total: numStr(celdas[enc.total]), causal: str(celdas[enc.causal]), obs: str(celdas[enc.obs])
      };
      agregarFilaCon(bien);
      count++;
    }
    if (!count) { mostrarResultado("No se encontraron filas de bienes. Revisa el encabezado (necesita una columna 'descripción/detalle').", true); }
    else { mostrarResultado("Se importaron <strong>" + count + "</strong> bienes desde el archivo.", false); }
  }

  function str(v) { return v == null ? "" : String(v).trim(); }

  function numStr(v) {
    if (v == null) return "";
    var s = String(v).trim();
    if (/^[0-9.,\-]+$/.test(s) && (/[.,]/.test(s))) return s;
    if (typeof v === "number") return String(v);
    return s;
  }

  function filaMap(row, idx) {
    var map = { codigo: -1, den: -1, marca: -1, modelo: -1, tipo: -1, color: -1, serie: -1, estado: -1, valor: -1, cant: -1, total: -1, causal: -1, obs: -1, fila: -1, row: idx };
    if (!row) return map;
    var reG = /denominaci|descripci|caracter|detalle|bien/i;
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
      if (/valor unitario|valor costo|valor actual/i.test(s) && map.valor < 0) map.valor = i;
      if (reG.test(s) && map.den < 0 && s.length <= 40 && !/relaci|formato|inventario anual|a dar de/i.test(s)) map.den = i;
      if (/cantidad|^cant\./i.test(s) && map.cant < 0) map.cant = i;
      if (/^total|causal/i.test(s)) {
        if (/causal/i.test(s) && map.causal < 0) map.causal = i;
        else if (map.total < 0) map.total = i;
      }
      if (/observaci/i.test(s) && map.obs < 0) map.obs = i;
      if (map.fila < 0) map.fila = 0;
    });
    return map;
  }

  function agregarFilaCon(bien) {
    var tr = nuevoTr();
    el.bienesBody.appendChild(tr);
    tr.querySelectorAll("input[data-field]").forEach(function (inp) {
      if (bien[inp.dataset.field] != null) inp.value = bien[inp.dataset.field];
    });
    if (!bien.cant) {
      var c = tr.querySelector('input[data-field="cant"]');
      if (c) c.value = "1";
    }
  }

  el.importFile.addEventListener("change", function () { manejarArchivo(this.files && this.files[0]); this.value = ""; });
  el.importLabel.addEventListener("click", function (e) { e.preventDefault(); el.importFile.click(); });

  ["dragover", "dragenter"].forEach(function (ev) {
    el.dropZone.addEventListener(ev, function (e) { e.preventDefault(); el.dropZone.classList.add("drag-over"); });
  });
  ["dragleave", "drop"].forEach(function (ev) {
    el.dropZone.addEventListener(ev, function (e) { e.preventDefault(); el.dropZone.classList.remove("drag-over"); });
  });
  el.dropZone.addEventListener("drop", function (e) {
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) manejarArchivo(f);
  });
  el.dropZone.addEventListener("click", function () { el.importFile.click(); });

  function validarParaGenerar() {
    var ie = datosIE();
    if (!ie.nombre) { mostrarResultado("Ingresa la institución educativa.", true); return null; }
    var bienes = leerFilas().filter(function (b) { return b.den; });
    if (!bienes.length) { mostrarResultado("Agrega al menos un bien con su denominación.", true); return null; }
    return { bienes: bienes, ie: ie };
  }

  el.genCaptacion.addEventListener("click", function () {
    var d = validarParaGenerar(); if (!d) return;
    escribir([hojaCaptacion(d.bienes, d.ie)], "Captacion-de-Datos-" + slug(d.ie.nombre) + ".xlsx");
  });

  el.genRelacion.addEventListener("click", function () {
    var d = validarParaGenerar(); if (!d) return;
    escribir([hojaRelacion(d.bienes, d.ie)], "Relacion-de-Bienes-" + slug(d.ie.nombre) + ".xlsx");
  });

  el.genAmbos.addEventListener("click", function () {
    var d = validarParaGenerar(); if (!d) return;
    var base = slug(d.ie.nombre);
    escribir([hojaCaptacion(d.bienes, d.ie)], "Captacion-de-Datos-" + base + ".xlsx");
    escribir([hojaRelacion(d.bienes, d.ie)], "Relacion-de-Bienes-" + base + ".xlsx");
  });

  function slug(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").substr(0, 40) || "bienes";
  }

  poblarCatalogo();
})();
