// guias_fixed.js — Versión integrada (usa dataURL como en el código funcional)
// ----------------------------------------------------------------
// Guarda imágenes como dataURL (FileReader) y las muestra.
// Basado en tu versión con logs y mejoras, pero sin uso de Firebase Storage.
// ----------------------------------------------------------------

import {
  auth,
  provider,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  db,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
  // storage removed — using dataURL instead
} from "./firebase-init.js";

import { signInWithPopup } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";

// ----------------- Estado global / DOM -----------------
let usuarioActual = null;
let editandoGuiaId = null; // cuando se edita, guardamos el id aquí

const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const userInfo = document.getElementById("user-info");
const userEmail = document.getElementById("user-email");
const userPhoto = document.getElementById("user-photo");
const guiaForm = document.getElementById("guia-form");
const guiasContainer = document.getElementById("guias-container");
const agregarPasoBtn = document.getElementById("agregar-paso-btn");
const pasosContainer = document.getElementById("pasos-container");
const detalleGuiaSection = document.getElementById("detalle-guia");
let guardarBtn = document.getElementById("guardar-btn");
if (!guardarBtn) {
  // fallback para evitar errores si el script corre antes del DOM
  guardarBtn = { textContent: "", disabled: false };
  document.addEventListener("DOMContentLoaded", () => {
    const el = document.getElementById("guardar-btn");
    if (el) {
      guardarBtn = el;
      logDebug("guardar-btn enlazado después de DOMContentLoaded");
      actualizarUI();
    } else {
      console.warn("guardar-btn no encontrado en DOM tras DOMContentLoaded");
    }
  });
}

// ----------------- Paleta de 30 colores -----------------
const PALETTE_30 = [
  "#ff4d4d",
  "#1e90ff",
  "#2ecc71",
  "#f1c40f",
  "#9b59b6",
  "#e67e22",
  "#34495e",
  "#e84393",
  "#00cec9",
  "#fdcb6e",
  "#6c5ce7",
  "#ff6b81",
  "#00b894",
  "#fab1a0",
  "#81ecec",
  "#a29bfe",
  "#ffeaa7",
  "#55efc4",
  "#d63031",
  "#6c3483",
  "#1abc9c",
  "#2c3e50",
  "#ff9ff3",
  "#f368e0",
  "#48dbfb",
  "#10ac84",
  "#feca57",
  "#5f27cd",
  "#c8d6e5",
  "#576574",
];

function colorForIndex(i) {
  return PALETTE_30[i % PALETTE_30.length];
}

// ----------------- Helpers varios -----------------
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function hashString(str = "") {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return h;
}

function logDebug(...args) {
  if (window.APP_DEBUG) console.log("[DEBUG]", ...args);
}

// ----------------- Conversión base64/dataURL a Blob -----------------
function dataURLToBlob(dataURL) {
  const arr = dataURL.split(",");
  if (arr.length < 2) return null;
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

// ----------------- Utilidad: File -> dataURL (Promise) -----------------
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("");
    const reader = new FileReader();
    reader.onerror = (err) => {
      logDebug("fileToDataURL: FileReader error", err);
      reject(err);
    };
    reader.onload = (e) => {
      resolve(e.target.result);
    };
    reader.readAsDataURL(file);
  });
}

// ----------------- Autenticación y UI -----------------
getRedirectResult(auth)
  .then((result) => {
    if (result?.user) {
      usuarioActual = result.user;
      actualizarUI();
    }
  })
  .catch((error) => console.error("Error en redirect:", error))
  .finally(() => {
    onAuthStateChanged(auth, (user) => {
      usuarioActual = user;
      actualizarUI();
      aplicarPermisosFormulario();
    });
  });

loginBtn?.addEventListener("click", () => {
  signInWithPopup(auth, provider).catch((err) =>
    console.error("Error login popup:", err)
  );
});

logoutBtn?.addEventListener("click", () => {
  signOut(auth).catch((err) => console.error("Error cerrar sesión:", err));
});

function actualizarUI() {
  if (usuarioActual) {
    if (loginBtn) loginBtn.style.display = "none";
    if (userInfo) userInfo.style.display = "flex";
    if (userEmail) userEmail.textContent = usuarioActual.email || "";
    if (userPhoto) userPhoto.src = usuarioActual.photoURL || "L_Carlos.png";
    const cont = document.getElementById("formulario-container");
    if (cont) cont.classList.remove("oculto");
  } else {
    if (loginBtn) loginBtn.style.display = "block";
    if (userInfo) userInfo.style.display = "none";
    const cont = document.getElementById("formulario-container");
    if (cont) cont.classList.add("oculto");
  }
  // actualizar botón eliminar en detalle si existe
  const botonEliminarDetalle =
    detalleGuiaSection.querySelector(".eliminar-guia-btn");
  if (botonEliminarDetalle) {
    botonEliminarDetalle.style.display =
      usuarioActual &&
      botonEliminarDetalle.dataset.autorId === usuarioActual.uid
        ? "inline-block"
        : "none";
  }
  // actualizar estado del botón guardar
  if (guardarBtn)
    guardarBtn.textContent = editandoGuiaId
      ? "Actualizar guía"
      : "Guardar guía";
}

// ----------------- Manejo de pasos (DOM dinámico) -----------------
let pasoCount = 0;

function crearPasoDOM({ titulo = "", descripcion = "", imagenUrl = "" } = {}) {
  pasoCount += 1;
  const pasoWrapper = document.createElement("div");
  pasoWrapper.classList.add("paso");
  pasoWrapper.dataset.pasoIndex = pasoCount;

  const colorIndex = (pasoCount - 1) % 30; // 0..29
  const pasoColor = colorForIndex(colorIndex);
  pasoWrapper.dataset.color = colorIndex + 1;
  pasoWrapper.style.borderLeft = `6px solid ${pasoColor}`;

  pasoWrapper.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px;">
      <input type="text" class="paso-titulo" placeholder="Título del paso" value="${escapeHtml(
        titulo
      )}" required />
      <button type="button" class="btn eliminar-paso-local-btn" title="Eliminar este paso">❌</button>
    </div>
    <textarea class="paso-descripcion" placeholder="Descripción del paso">${escapeHtml(
      descripcion
    )}</textarea>

    <div style="display:flex; gap:8px; align-items:center; margin-top:6px; flex-wrap:wrap;">
      <label class="file-upload-label">
        📁 Seleccionar imagen
        <input type="file" class="paso-imagen-archivo" accept="image/*" />
      </label>
      <input type="text" class="paso-imagen" placeholder="URL de imagen (opcional o dataURL)" value="${escapeHtml(
        imagenUrl
      )}" />
      <button type="button" class="btn btn-sm limpiar-imagen-btn" title="Quitar imagen">Quitar imagen</button>
    </div>

    <div class="preview-contenedor" style="margin-top:8px;"></div>
  `;

  const archivoInput = pasoWrapper.querySelector(".paso-imagen-archivo");
  const previewCont = pasoWrapper.querySelector(".preview-contenedor");
  const urlInput = pasoWrapper.querySelector(".paso-imagen");
  const limpiarBtn = pasoWrapper.querySelector(".limpiar-imagen-btn");

  // Si ya hay URL/dataURL, mostrar preview
  if (imagenUrl) {
    if (imagenUrl.startsWith("data:") || imagenUrl.startsWith("http")) {
      previewCont.innerHTML = `<img src="${imagenUrl}" style="max-width:200px;border-radius:8px;display:block;" />`;
    }
  }

  // Quitar imagen
  limpiarBtn.addEventListener("click", () => {
    if (archivoInput) archivoInput.value = "";
    if (urlInput) urlInput.value = "";
    previewCont.innerHTML = "";
  });

  // Preview para archivos locales usando FileReader
  archivoInput.addEventListener("change", async (ev) => {
    const file = ev.target.files[0];
    previewCont.innerHTML = ""; // limpiar previo
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Solo se permiten imágenes.");
      ev.target.value = "";
      return;
    }
    try {
      const dataUrl = await fileToDataURL(file);
      previewCont.innerHTML = `<img src="${dataUrl}" style="max-width:200px;border-radius:8px;display:block;" />`;
      // Guardamos dataURL en el input para mantener compatibilidad con submit
      urlInput.value = dataUrl;
    } catch (err) {
      console.error("FileReader error:", err);
      alert("Error leyendo la imagen. Intenta otro archivo.");
    }
  });

  // Cambios en el campo URL → actualizar preview
  urlInput.addEventListener("input", (e) => {
    const val = e.target.value.trim();
    if (!val) {
      previewCont.innerHTML = "";
      return;
    }
    if (val.startsWith("http") || val.startsWith("data:")) {
      previewCont.innerHTML = `<img src="${val}" style="max-width:200px;border-radius:8px;display:block;" />`;
    } else {
      previewCont.innerHTML =
        "<small>Ingrese una URL válida o un dataURL</small>";
    }
  });

  // boton eliminar del paso
  const eliminarBtn = pasoWrapper.querySelector(".eliminar-paso-local-btn");
  eliminarBtn.addEventListener("click", () => {
    if (confirm("¿Eliminar este paso? Esta acción no se podrá deshacer.")) {
      pasoWrapper.remove();
      const ult = pasosContainer.querySelector(".paso:last-child");
      if (ult) activarPaso(ult);
    }
  });

  // click en el paso para activarlo (salvo que se haga click en inputs)
  pasoWrapper.addEventListener("click", (ev) => {
    const tag = ev.target.tagName.toLowerCase();
    if (
      tag === "input" ||
      tag === "textarea" ||
      ev.target.classList.contains("eliminar-paso-local-btn") ||
      ev.target.classList.contains("paso-imagen-archivo")
    )
      return;
    activarPaso(pasoWrapper);
  });

  return pasoWrapper;
}

function activarPaso(pasoEl) {
  const pasos = pasosContainer.querySelectorAll(".paso");
  pasos.forEach((p) => p.classList.remove("paso-activo"));
  if (pasoEl) pasoEl.classList.add("paso-activo");
}

agregarPasoBtn?.addEventListener("click", () => {
  const nuevoPaso = crearPasoDOM();
  pasosContainer.appendChild(nuevoPaso);
  activarPaso(nuevoPaso);
});

function ensureInitialPaso() {
  if (pasosContainer.querySelectorAll(".paso").length === 0) {
    const p = crearPasoDOM();
    pasosContainer.appendChild(p);
    activarPaso(p);
  }
}

// ----------------- Guardar/Actualizar guía (submit) -----------------
// Ahora: convertimos archivo a dataURL (si existe) y guardamos dataURL en Firestore.
// Esta función recolecta pasos y transforma archivos locales a dataURL.
async function recolectarPasosYSubirImagenes() {
  const pasosDOM = pasosContainer.querySelectorAll(".paso");
  logDebug(
    "[recolectarPasosYSubirImagenes] pasos encontrados:",
    pasosDOM.length
  );
  const pasosData = [];

  for (const pasoEl of pasosDOM) {
    const tituloPaso = pasoEl.querySelector(".paso-titulo").value.trim();
    logDebug(
      "[recolectarPasosYSubirImagenes] procesando paso:",
      pasoEl.dataset.pasoIndex,
      "titulo:",
      tituloPaso
    );
    if (!tituloPaso) {
      logDebug("  -> salto paso sin título");
      continue;
    }

    const descripcionPaso =
      pasoEl.querySelector(".paso-descripcion").value.trim() || "";
    const archivoInput = pasoEl.querySelector(".paso-imagen-archivo");
    const archivo = archivoInput?.files[0] || null;
    const campoURL = pasoEl.querySelector(".paso-imagen").value.trim();

    let imagenURL = "";

    try {
      if (archivo) {
        // Si el usuario seleccionó un archivo, convertirlo a dataURL y usarlo
        logDebug(
          "  -> hay archivo local:",
          archivo.name,
          archivo.type,
          archivo.size
        );
        imagenURL = await fileToDataURL(archivo);
        logDebug("  -> archivo convertido a dataURL (len):", imagenURL.length);
      } else if (campoURL.startsWith("data:image/")) {
        // Si el campo ya contiene dataURL (por ejemplo al editar), lo usamos directamente
        logDebug("  -> campo contiene dataURL (ya presente), uso tal cual");
        imagenURL = campoURL;
      } else if (campoURL.startsWith("http")) {
        // Si es una URL externa, la usamos tal cual
        logDebug("  -> campo es URL externa, uso tal cual:", campoURL);
        imagenURL = campoURL;
      } else {
        logDebug("  -> sin imagen para este paso");
      }
    } catch (err) {
      console.error(`Error procesando imagen del paso "${tituloPaso}":`, err);
      alert(
        `Error procesando imagen del paso "${tituloPaso}". Revisa la consola (F12).`
      );
      throw err;
    }

    pasosData.push({
      titulo: tituloPaso,
      descripcion: descripcionPaso,
      imagen: imagenURL,
      colorIndex: Number(pasoEl.dataset.color) || null,
    });
  }

  return pasosData;
}

function limpiarFormularioGuia() {
  if (guiaForm) guiaForm.reset();
  pasosContainer.innerHTML = "";
  pasoCount = 0;
  ensureInitialPaso();
  editandoGuiaId = null;
  actualizarUI();
}

async function guardarNuevaGuia({ titulo, descripcion, sistema, pasosData }) {
  const tarjetaColorIndex = Math.abs(hashString(titulo + Date.now())) % 30;
  await addDoc(collection(db, "guias"), {
    titulo,
    descripcion,
    sistema,
    pasos: pasosData,
    fechaCreacion: new Date(),
    usuarioId: usuarioActual.uid,
    autor: usuarioActual.email,
    tarjetaColorIndex,
  });
}

async function actualizarGuiaExistente({
  id,
  titulo,
  descripcion,
  sistema,
  pasosData,
}) {
  await updateDoc(doc(db, "guias", id), {
    titulo,
    descripcion,
    sistema,
    pasos: pasosData,
    // opcional: fechaActualizacion: new Date(),
  });
}

// Submit del formulario
if (guiaForm) {
  guiaForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    logDebug("[submit] Inicio guardado de guía -", new Date().toISOString());
    if (!usuarioActual) {
      alert("Debes iniciar sesión para guardar una guía.");
      return;
    }

    const titulo = document.getElementById("titulo").value.trim();
    const descripcion = document.getElementById("descripcion").value.trim();
    const sistema = document.getElementById("sistema").value.trim();

    logDebug(
      "[submit] titulo:",
      titulo,
      "descripcion largo:",
      descripcion.length,
      "sistema:",
      sistema
    );

    if (!titulo || !descripcion) {
      alert("Completa el título y la descripción.");
      return;
    }

    try {
      if (guardarBtn && typeof guardarBtn.disabled !== "undefined")
        guardarBtn.disabled = true;
      if (guardarBtn)
        guardarBtn.textContent = editandoGuiaId
          ? "Actualizando..."
          : "Guardando...";

      const pasosData = await recolectarPasosYSubirImagenes();
      logDebug("[submit] pasosData recolectados:", pasosData.length);

      if (pasosData.length === 0) {
        alert("Agrega al menos un paso con título.");
        return;
      }

      if (editandoGuiaId) {
        logDebug("[submit] Actualizando guía id:", editandoGuiaId);
        await actualizarGuiaExistente({
          id: editandoGuiaId,
          titulo,
          descripcion,
          sistema,
          pasosData,
        });
        alert("Guía actualizada correctamente ✅");
      } else {
        logDebug("[submit] Guardando nueva guía");
        await guardarNuevaGuia({ titulo, descripcion, sistema, pasosData });
        alert("Guía guardada correctamente ✅");
      }

      limpiarFormularioGuia();
    } catch (err) {
      console.error("[submit] Error guardando la guía:", err);
      alert(
        "Ocurrió un error al guardar la guía. Revisa la consola (F12) para más detalles."
      );
    } finally {
      if (guardarBtn && typeof guardarBtn.disabled !== "undefined")
        guardarBtn.disabled = false;
      actualizarUI();
    }
  });
} else {
  console.warn(
    "Formulario 'guia-form' no encontrado; el listener de submit no se ha enlazado."
  );
}

// ----------------- Render lista de guías (real-time) -----------------
try {
  onSnapshot(
    query(collection(db, "guias"), orderBy("fechaCreacion", "desc")),
    (snapshot) => {
      guiasContainer.innerHTML = "";
      snapshot.forEach((docSnap) => {
        const guia = docSnap.data();
        const id = docSnap.id;

        const imagenPrincipal =
          Array.isArray(guia.pasos) &&
          guia.pasos.find((p) => p.imagen && p.imagen.length)
            ? guia.pasos.find((p) => p.imagen && p.imagen.length).imagen
            : "";

        const indexColor =
          typeof guia.tarjetaColorIndex === "number"
            ? guia.tarjetaColorIndex
            : Math.abs(hashString(id)) % 30;
        const bordeColor = colorForIndex(indexColor);

        const tarjeta = document.createElement("div");
        tarjeta.classList.add("tarjeta-guia", "tarjeta");
        tarjeta.dataset.id = id;
        tarjeta.style.borderLeft = `6px solid ${bordeColor}`;
        tarjeta.style.cursor = "pointer";

        tarjeta.innerHTML = `
          <div class="tarjeta-cabecera">
            <div>
              <div class="tarjeta-titulo">${escapeHtml(guia.titulo)}</div>
              <div class="tarjeta-descripcion">${escapeHtml(
                guia.descripcion
              )}</div>
            </div>
            <div>
              <div class="tarjeta-sistema">${escapeHtml(
                guia.sistema || "N/D"
              )}</div>
            </div>
          </div>
          ${
            imagenPrincipal
              ? `<img src="${imagenPrincipal}" alt="${escapeHtml(
                  guia.titulo
                )}" style="width:100%; height:160px; object-fit:cover; border-radius:8px; margin-top:8px;" />`
              : ""
          }
          <div class="tarjeta-contenido" style="text-align:center; margin-top:8px;">
            <div class="autor">Autor: ${escapeHtml(guia.autor || "Anon")}</div>
          </div>
        `;

        tarjeta.addEventListener("click", (ev) => {
          ev.preventDefault();
          mostrarDetalleGuia(id)
            .then(() => {
              if (detalleGuiaSection) {
                detalleGuiaSection.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
                const primerPaso =
                  detalleGuiaSection.querySelector(".timeline-item");
                if (primerPaso)
                  primerPaso.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
              }
            })
            .catch((err) => {
              console.error("Error al abrir detalle desde tarjeta:", err);
            });
        });

        guiasContainer.appendChild(tarjeta);
      });
    },
    (err) => {
      console.error("Error escuchando guías:", err);
    }
  );
} catch (e) {
  console.error("onSnapshot fallo al inicializar:", e);
}

// ----------------- Mostrar detalle de una guía -----------------
async function mostrarDetalleGuia(id) {
  try {
    const guiaRef = doc(db, "guias", id);
    const guiaSnap = await getDoc(guiaRef);
    if (!guiaSnap.exists()) {
      alert("No se encontró la guía.");
      return;
    }
    const guia = guiaSnap.data();

    const pasosHTML =
      Array.isArray(guia.pasos) && guia.pasos.length
        ? guia.pasos
            .map((p, i) => {
              const idx = (p.colorIndex ? Number(p.colorIndex) - 1 : i) % 30;
              const inlineColor = colorForIndex(idx);
              return `
            <div class="timeline-item" style="border-left: 4px solid ${inlineColor}; padding-left:12px; margin-bottom:16px; border-radius:6px;">
              <div class="timeline-dot" style="background-color:${inlineColor};"></div>
              <div class="timeline-content">
                <h4>Paso ${i + 1}: ${escapeHtml(p.titulo)}</h4>
                <p>${escapeHtml(p.descripcion || "")}</p>
                ${
                  p.imagen
                    ? `<img src="${p.imagen}" class="timeline-img" style="max-height:280px; width:100%; object-fit:cover; border-radius:8px; margin-top:8px;" />`
                    : ""
                }
              </div>
            </div>
          `;
            })
            .join("")
        : "<p>No hay pasos disponibles.</p>";

    detalleGuiaSection.innerHTML = `
      <div class="detalle-contenido">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
          <div>
            <h2 class="detalle-titulo">${escapeHtml(guia.titulo)}</h2>
            <p class="detalle-descripcion">${escapeHtml(guia.descripcion)}</p>
            <p class="tarjeta-sistema">Sistema: ${escapeHtml(
              guia.sistema || "N/D"
            )}</p>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <button class="btn btn-ver-mas" id="editar-guia-btn" style="display:none;">Editar</button>
            <button class="btn boton-eliminar eliminar-guia-btn" id="eliminar-guia-btn" data-autor-id="${escapeHtml(
              guia.usuarioId || ""
            )}" style="display:none;">Eliminar guía</button>
          </div>
        </div>

        <div class="timeline" id="timeline-detalle">
          ${pasosHTML}
        </div>

        <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:16px;">
          <button class="volver-btn" id="volver-detalle-btn">Volver</button>
        </div>
      </div>
    `;

    const eliminarBtn = document.getElementById("eliminar-guia-btn");
    const editarBtn = document.getElementById("editar-guia-btn");

    if (usuarioActual && usuarioActual.uid === guia.usuarioId) {
      eliminarBtn.style.display = "inline-block";
      editarBtn.style.display = "inline-block";
    } else {
      eliminarBtn.style.display = "none";
      editarBtn.style.display = "none";
    }

    eliminarBtn.addEventListener("click", async () => {
      if (!usuarioActual) {
        alert("Debes iniciar sesión para eliminar la guía.");
        return;
      }
      if (usuarioActual.uid !== guia.usuarioId) {
        alert("Solo el autor puede eliminar esta guía.");
        return;
      }
      if (!confirm("¿Eliminar la guía? Esta acción no se puede deshacer."))
        return;
      try {
        await deleteDoc(doc(db, "guias", id));
        detalleGuiaSection.classList.add("oculto");
        guiasContainer.scrollIntoView({ behavior: "smooth" });
        alert("Guía eliminada.");
      } catch (err) {
        console.error("Error eliminando guía:", err);
        alert("Ocurrió un error al eliminar la guía.");
      }
    });

    // Editar: carga los datos en el formulario y habilita modo edición
    editarBtn.addEventListener("click", async () => {
      if (!usuarioActual || usuarioActual.uid !== guia.usuarioId) {
        alert("Solo el autor puede editar esta guía.");
        return;
      }
      document.getElementById("titulo").value = guia.titulo || "";
      document.getElementById("descripcion").value = guia.descripcion || "";
      document.getElementById("sistema").value = guia.sistema || "";
      pasosContainer.innerHTML = "";
      pasoCount = 0;
      if (Array.isArray(guia.pasos)) {
        guia.pasos.forEach((p) => {
          const paso = crearPasoDOM({
            titulo: p.titulo || "",
            descripcion: p.descripcion || "",
            imagenUrl: p.imagen || "",
          });
          pasosContainer.appendChild(paso);
        });
      }
      editandoGuiaId = id;
      actualizarUI();
      detalleGuiaSection.classList.add("oculto");
      document
        .getElementById("formulario-container")
        .classList.remove("oculto");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    const volverBtn = document.getElementById("volver-detalle-btn");
    volverBtn.addEventListener("click", () => {
      detalleGuiaSection.classList.add("oculto");
      guiasContainer.scrollIntoView({ behavior: "smooth" });
    });

    detalleGuiaSection.classList.remove("oculto");
  } catch (err) {
    console.error("Error mostrando detalle:", err);
    alert("Ocurrió un error al cargar el detalle de la guía.");
    throw err;
  }
}

// ----------------- Observers y permisos -----------------
function aplicarPermisosFormulario() {
  const disabled = !usuarioActual;
  ["titulo", "descripcion", "sistema"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.disabled = disabled;
  });
  if (agregarPasoBtn) agregarPasoBtn.disabled = disabled;
  const botones = pasosContainer.querySelectorAll("button, input, textarea");
  botones.forEach((b) => (b.disabled = disabled));
}

onAuthStateChanged(auth, (user) => {
  usuarioActual = user;
  actualizarUI();
  aplicarPermisosFormulario();
});

const observer = new MutationObserver(() => aplicarPermisosFormulario());
observer.observe(pasosContainer, { childList: true, subtree: true });

// Inicial: crear un paso si no hay
ensureInitialPaso();

// ----------------- Utilidades opcionales (zoom imagen en detalle) -----------------
document.addEventListener("click", (e) => {
  const img = e.target.closest(".timeline-img");
  if (!img) return;
  const visor = document.createElement("div");
  visor.className = "visor-imagen";
  visor.innerHTML = `
    <div class="imagen-grande-contenedor">
      <span class="cerrar-visor" style="cursor:pointer;font-size:28px;position:absolute;top:10px;right:18px;">&times;</span>
      <img src="${img.src}" alt="Imagen ampliada" style="max-width:90vw; max-height:90vh; border-radius:12px;" />
    </div>
  `;
  visor.addEventListener("click", (ev) => {
    if (ev.target.classList.contains("cerrar-visor") || ev.target === visor) {
      visor.remove();
    }
  });
  Object.assign(visor.style, {
    position: "fixed",
    inset: "0",
    background: "rgba(0,0,0,.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: "9999",
  });
  document.body.appendChild(visor);
});

// FIN del archivo
logDebug("guias_fixed.js cargado y listo (usa dataURL para imágenes).");
