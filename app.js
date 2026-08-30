/* INVENTARIOUGELCHURCAMPA - logica del cliente (100% offline) */
(function () {
  "use strict";

  var DATA = window.INVENTARIOUGELCHURCAMPA || null;
  var registros = DATA ? DATA.registros : [];
  var instituciones = DATA ? DATA.instituciones : [];

  var institucionSeleccionada = null;
  var inventarioActual = [];

  // Elementos
  var el = {};
  var load = function () {
    el.loading = document.getElementById("loading");
    el.searchInput = document.getElementById("searchInput");
    el.searchBtn = document.getElementById("searchBtn");
    el.resultCount = document.getElementById("resultCount");
    el.instList = document.getElementById("instList");
    el.searchEmpty = document.getElementById("searchEmpty");
    el.searchStep = document.getElementById("searchStep");
    el.inventoryStep = document.getElementById("inventoryStep");
    el.backBtn = document.getElementById("backBtn");
    el.instTitle = document.getElementById("instTitle");
    el.instCat = document.getElementById("instCat");
    el.instStats = document.getElementById("instStats");
    el.filterBien = document.getElementById("filterBien");
    el.filterEstado = document.getElementById("filterEstado");
    el.filterCond = document.getElementById("filterCond");
    el.filterTipo = document.getElementById("filterTipo");
    el.shownCount = document.getElementById("shownCount");
    el.invBody = document.getElementById("invBody");
    el.invEmpty = document.getElementById("invEmpty");
    el.exportBtn = document.getElementById("exportBtn");
    el.totalRegs = document.getElementById("totalRegs");
    el.colBtn = document.getElementById("colBtn");
    el.colPanel = document.getElementById("colPanel");
    el.colList = document.getElementById("colList");
    el.invTable = document.getElementById("invTable");
  };

  var normalize = function (s) {
    return (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  };

  function fmtMoneda(v) {
    if (!v) return "—";
    var n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
    if (isNaN(n)) return v;
    return "S/ " + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }

  function buscarInstituciones(texto) {
    var q = normalize(texto).trim();
    if (!q) return [];
    var terms = q.split(/\s+/).filter(Boolean);
    return instituciones.filter(function (inst) {
      var hay = normalize(inst.nombre);
      return terms.every(function (t) { return hay.indexOf(t) !== -1; });
    });
  }

  function renderInstituciones(lista) {
    el.instList.replaceChildren();
    if (!lista.length) {
      el.searchEmpty.hidden = false;
      el.instList.hidden = true;
      el.resultCount.hidden = true;
      return;
    }
    el.searchEmpty.hidden = true;
    el.instList.hidden = false;
    el.resultCount.hidden = false;
    el.resultCount.textContent =
      lista.length + (lista.length === 1 ? " institución encontrada" : " instituciones encontradas");

    lista.forEach(function (inst) {
      var li = document.createElement("li");
      var name = document.createElement("span");
      name.className = "inst-name";
      name.textContent = inst.nombre;
      var badge = document.createElement("span");
      badge.className = "inst-badge";
      badge.textContent = inst.cat || "";
      li.appendChild(name);
      li.appendChild(badge);
      li.addEventListener("click", function () { seleccionarInstitucion(inst); });
      el.instList.appendChild(li);
    });
  }

  function seleccionarInstitucion(inst) {
    institucionSeleccionada = inst;
    // filtrar registros de esa institucion
    inventarioActual = registros.filter(function (r) {
      return r.area === inst.nombre;
    });
    el.searchStep.hidden = true;
    el.inventoryStep.hidden = false;
    el.instTitle.textContent = inst.nombre;
    el.instCat.textContent = inst.cat || "Institución educativa";
    renderStats();
    buildTipoFilter();
    resetFilters();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderStats() {
    var total = inventarioActual.length;
    var estB = inventarioActual.filter(function (r) { return r.estado === "B"; }).length;
    var estR = inventarioActual.filter(function (r) { return r.estado === "R"; }).length;
    var estN = inventarioActual.filter(function (r) { return r.estado === "N"; }).length;
    el.instStats.innerHTML =
      stat(total, "Total") +
      stat(estB, "Bueno") +
      stat(estR, "Regular") +
      stat(estN, "Nuevo/N");
  }
  function stat(n, lbl) {
    return '<div class="stat"><div class="num">' + n + '</div><div class="lbl">' + lbl + "</div></div>";
  }

  function buildTipoFilter() {
    var tipos = {};
    inventarioActual.forEach(function (r) { if (r.tipo) tipos[r.tipo] = true; });
    var keys = Object.keys(tipos).sort();
    el.filterTipo.innerHTML = '<option value="">Todos</option>';
    keys.forEach(function (t) {
      var o = document.createElement("option");
      o.value = t;
      o.textContent = t;
      el.filterTipo.appendChild(o);
    });
    if (!keys.length) el.filterTipo.disabled = true;
    else el.filterTipo.disabled = false;
  }

  function resetFilters() {
    el.filterBien.value = "";
    el.filterEstado.value = "";
    el.filterCond.value = "";
    el.filterTipo.value = "";
    aplicarFiltros();
  }

  function aplicarFiltros() {
    var qBien = normalize(el.filterBien.value).trim();
    var qEstado = el.filterEstado.value;
    var qCond = el.filterCond.value;
    var qTipo = el.filterTipo.value;

    var filtrados = inventarioActual.filter(function (r) {
      if (qBien && normalize(r.bien).indexOf(qBien) === -1) return false;
      if (qEstado && (r.estado || "") !== qEstado) return false;
      if (qCond && (r.cond || "") !== qCond) return false;
      if (qTipo && (r.tipo || "") !== qTipo) return false;
      return true;
    });

    renderTabla(filtrados);
  }

  function renderTabla(lista) {
    el.invBody.replaceChildren();
    if (!lista.length) {
      el.invEmpty.hidden = false;
      el.shownCount.textContent = "";
      return;
    }
    el.invEmpty.hidden = true;
    el.shownCount.textContent =
      "Mostrando " + lista.length + (lista.length === 1 ? " bien" : " bienes") +
      " de " + inventarioActual.length + " en total";

    lista.forEach(function (r, i) {
      var tr = document.createElement("tr");
      tr.appendChild(td(String(i + 1), "num"));
      tr.appendChild(td(r.cod || "—", "cod"));
      tr.appendChild(td(r.bien || "—", "bien"));
      tr.appendChild(td(r.tipo || "—", "tipo"));
      tr.appendChild(tdEstado(r.estado, "estado"));
      tr.appendChild(td(r.cond || "—", "cond"));
      tr.appendChild(td((r.marca || "") + (r.modelo && r.modelo !== r.marca ? " / " + r.modelo : ""), "marca"));
      tr.appendChild(td(r.serie || "—", "serie"));
      tr.appendChild(td(r.doc || "—", "doc"));
      tr.appendChild(td(fmtMoneda(r.vadq), "vadq"));
      tr.appendChild(td(fmtMoneda(r.vneto), "vneto"));
      tr.appendChild(td(responsable(r), "resp"));
      el.invBody.appendChild(tr);
    });
    aplicarVisibilidadColumnas();
  }

  function td(texto, col) {
    var c = document.createElement("td");
    c.textContent = texto;
    if (col) c.setAttribute("data-col", col);
    return c;
  }

  function tdEstado(estado, col) {
    var c = document.createElement("td");
    if (col) c.setAttribute("data-col", col);
    var map = { B: "Bueno", R: "Regular", N: "Nuevo/N" };
    if (estado) {
      var b = document.createElement("span");
      b.className = "badge-estado est-" + estado;
      b.textContent = map[estado] || estado;
      c.appendChild(b);
    } else {
      c.textContent = "—";
    }
    return c;
  }

  function responsable(r) {
    var partes = [r.ap, r.am, r.nom].filter(Boolean);
    return partes.length ? partes.join(" ") : "—";
  }

  function exportarCSV() {
    var cols = [
      "Codigo Patrimonial", "Denominacion Bien", "Tipo", "Nro Doc Adquisicion",
      "Fecha Adquisicion", "Valor Adquisicion", "Valor Neto", "Estado", "Condicion",
      "Marca", "Modelo", "Serie", "Color", "Responsable"
    ];
    var filas = inventarioActual.filter(function (r) {
      return aplicarFiltroUnico(r);
    });
    var lines = [cols.join(";")];
    filas.forEach(function (r) {
      lines.push([
        r.cod, r.bien, r.tipo, r.doc, r.fecha, r.vadq, r.vneto,
        r.estado, r.cond, r.marca, r.modelo, r.serie, r.color, responsable(r)
      ].map(csvCelda).join(";"));
    });
    var nombre = "inventario_" + (institucionSeleccionada.nombre.replace(/[^\w]+/g, "_")) + ".csv";
    var blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    el.exportBtn.href = URL.createObjectURL(blob);
    el.exportBtn.download = nombre;
  }
  function aplicarFiltroUnico(r) {
    var qBien = normalize(el.filterBien.value).trim();
    if (qBien && normalize(r.bien).indexOf(qBien) === -1) return false;
    if (el.filterEstado.value && (r.estado || "") !== el.filterEstado.value) return false;
    if (el.filterCond.value && (r.cond || "") !== el.filterCond.value) return false;
    if (el.filterTipo.value && (r.tipo || "") !== el.filterTipo.value) return false;
    return true;
  }
  function csvCelda(v) {
    v = (v == null ? "" : String(v)).replace(/"/g, '""');
    return /[";\n]/.test(v) ? '"' + v + '"' : v;
  }

  var COLUMNAS = [
    { key: "num", label: "N°" },
    { key: "cod", label: "Código Patrimonial" },
    { key: "bien", label: "Denominación del Bien" },
    { key: "tipo", label: "Tipo" },
    { key: "estado", label: "Estado" },
    { key: "cond", label: "Condición" },
    { key: "marca", label: "Marca / Modelo" },
    { key: "serie", label: "Serie" },
    { key: "doc", label: "N° Doc" },
    { key: "vadq", label: "Valor Adquisición" },
    { key: "vneto", label: "Valor Neto" },
    { key: "resp", label: "Responsable" }
  ];
  var COL_STORAGE = "inc_cols_visibles";
  var colsVisibles = null;

  function cargarColsVisibles() {
    try {
      var saved = JSON.parse(localStorage.getItem(COL_STORAGE));
      if (saved && Array.isArray(saved) && saved.length) {
        var validas = {};
        COLUMNAS.forEach(function (c) { validas[c.key] = true; });
        colsVisibles = saved.filter(function (k) { return validas[k]; });
        return;
      }
    } catch (e) { /* ignorar */ }
    colsVisibles = COLUMNAS.map(function (c) { return c.key; });
  }

  function guardarColsVisibles() {
    try { localStorage.setItem(COL_STORAGE, JSON.stringify(colsVisibles)); } catch (e) { /* ignorar */ }
  }

  function colVisible(key) { return colsVisibles.indexOf(key) !== -1; }

  function renderColPanel() {
    el.colList.replaceChildren();
    COLUMNAS.forEach(function (c) {
      var label = document.createElement("label");
      label.className = "col-item";
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = colVisible(c.key);
      cb.addEventListener("change", function () {
        if (cb.checked) { if (colsVisibles.indexOf(c.key) === -1) colsVisibles.push(c.key); }
        else { colsVisibles = colsVisibles.filter(function (k) { return k !== c.key; }); }
        guardarColsVisibles();
        aplicarVisibilidadColumnas();
      });
      label.appendChild(cb);
      label.appendChild(document.createTextNode(c.label));
      el.colList.appendChild(label);
    });
  }

  function aplicarVisibilidadColumnas() {
    if (!el.invTable) return;
    var ths = el.invTable.querySelectorAll("thead th[data-col]");
    ths.forEach(function (th) {
      var key = th.getAttribute("data-col");
      var visible = colVisible(key);
      th.style.display = visible ? "" : "none";
      th.classList.toggle("col-hidden", !visible);
      el.invTable.querySelectorAll("tbody td[data-col='" + key + "']").forEach(function (td) {
        td.style.display = visible ? "" : "none";
      });
    });
  }

  function volverInicio() {
    institucionSeleccionada = null;
    inventarioActual = [];
    el.inventoryStep.hidden = true;
    el.searchStep.hidden = false;
    el.searchInput.focus();
  }

  function onSearch() {
    var lista = buscarInstituciones(el.searchInput.value);
    renderInstituciones(lista);
  }

  function init() {
    load();
    if (!DATA) {
      el.loading.hidden = false;
      el.loading.textContent = "No se pudo cargar data.js";
      return;
    }
    el.totalRegs.textContent = registros.length.toLocaleString("es-PE");
    el.loading.hidden = true;

    cargarColsVisibles();
    renderColPanel();
    el.colBtn.addEventListener("click", function () {
      el.colPanel.hidden = !el.colPanel.hidden;
    });

    el.searchBtn.addEventListener("click", onSearch);
    el.searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") onSearch();
    });
    el.backBtn.addEventListener("click", volverInicio);
    el.filterBien.addEventListener("input", aplicarFiltros);
    el.filterEstado.addEventListener("change", aplicarFiltros);
    el.filterCond.addEventListener("change", aplicarFiltros);
    el.filterTipo.addEventListener("change", aplicarFiltros);
    el.exportBtn.addEventListener("click", exportarCSV);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
