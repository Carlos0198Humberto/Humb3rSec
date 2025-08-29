// ================== IMPORTS ==================
import { auth, provider, db } from "./firebase-init.js";

import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";

import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

// ================== DOM ==================
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userNombre = document.getElementById("user-nombre");
const formularioProyectoSection = document.getElementById(
  "formulario-proyecto"
);
const proyectoForm = document.getElementById("proyecto-form");
const contenedorProyectos = document.getElementById("contenedor-proyectos");
const modalProyecto = document.getElementById("modal-proyecto");
const modalTitulo = document.getElementById("modal-titulo");
const modalImagenes = document.getElementById("modal-imagenes");
const modalDescripcion = document.getElementById("modal-descripcion");
const modalEditarBtn = document.getElementById("modal-editar");
const modalEliminarBtn = document.getElementById("modal-eliminar");
const cerrarModalBtn = document.getElementById("cerrar-modal");

let usuarioActual = null;
let proyectosCache = [];
let editingProjectId = null;

// ================== AUTH ==================
async function iniciarSesion() {
  try {
    const result = await signInWithPopup(auth, provider);
    usuarioActual = result.user;
    actualizarUIAuth(usuarioActual);
  } catch (err) {
    console.error("Login error:", err);
    alert("Error al iniciar sesión: " + (err.message || err));
  }
}

function cerrarSesion() {
  signOut(auth)
    .then(() => {
      usuarioActual = null;
      actualizarUIAuth(null);
    })
    .catch((err) => console.error("Logout error:", err));
}

function actualizarUIAuth(user) {
  usuarioActual = user || null;
  if (user) {
    userNombre.textContent = user.displayName || user.email || "Usuario";
    formularioProyectoSection.style.display = "block";
    logoutBtn.style.display = "inline-block";
    loginBtn.style.display = "none";
  } else {
    userNombre.textContent = "Invitado";
    formularioProyectoSection.style.display = "none";
    logoutBtn.style.display = "none";
    loginBtn.style.display = "inline-block";
  }
}

// ================== Dynamic Image Inputs ==================
function crearImagenInputNode(prefillDesc = "", existingUrl = "") {
  const wrapper = document.createElement("div");
  wrapper.className = "imagen-wrapper";

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.className = "imagen-input";
  if (existingUrl) fileInput.dataset.existingUrl = existingUrl;

  const descInput = document.createElement("input");
  descInput.type = "text";
  descInput.className = "imagen-descripcion";
  descInput.placeholder = "Descripción de la imagen";
  descInput.value = prefillDesc || "";

  const controls = document.createElement("div");
  controls.className = "imagen-controls";

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "eliminar-imagen-btn btn";
  removeBtn.textContent = "Eliminar imagen";
  removeBtn.addEventListener("click", () => wrapper.remove());

  controls.appendChild(removeBtn);
  wrapper.appendChild(fileInput);
  wrapper.appendChild(descInput);
  wrapper.appendChild(controls);

  return wrapper;
}

function ensureAtLeastOneImageInput() {
  let container =
    proyectoForm.querySelector(".imagenes-container") ||
    document.createElement("div");
  container.className = "imagenes-container";
  if (!proyectoForm.querySelector(".imagenes-container")) {
    const submitBtn = proyectoForm.querySelector("button[type='submit']");
    proyectoForm.insertBefore(container, submitBtn);
  }
  if (!container.querySelector(".imagen-wrapper")) {
    container.appendChild(crearImagenInputNode());
  }
  addGlobalAddImageButton(container);
}

function addGlobalAddImageButton(container) {
  if (proyectoForm.querySelector(".agregar-imagen-global")) return;
  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "agregar-imagen-global btn";
  addBtn.textContent = "Agregar otra imagen";
  addBtn.addEventListener("click", () => {
    container.appendChild(crearImagenInputNode());
  });
  proyectoForm.appendChild(addBtn);
}

// ================== Firestore collection ==================
const proyectosColRef = collection(db, "proyectos");

// ================== Form submit ==================
proyectoForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!usuarioActual)
    return alert("Debes iniciar sesión para agregar o editar proyectos.");

  const titulo = proyectoForm.titulo.value.trim();
  const descripcion = proyectoForm.descripcion.value.trim();
  const categoria = proyectoForm.categoria?.value.trim() || "";

  if (!titulo) return alert("Título requerido.");

  const imagesContainer = proyectoForm.querySelector(".imagenes-container");
  const wrappers = imagesContainer
    ? Array.from(imagesContainer.querySelectorAll(".imagen-wrapper"))
    : [];
  const imagesData = [];

  for (const wrap of wrappers) {
    const fileInput = wrap.querySelector(".imagen-input");
    const descInput = wrap.querySelector(".imagen-descripcion");
    const file = fileInput.files[0];
    const existingUrl = fileInput.dataset.existingUrl || null;

    if (file) {
      const reader = new FileReader();
      await new Promise((resolve) => {
        reader.onload = () => {
          imagesData.push({
            url: reader.result,
            description: descInput.value || "",
          });
          resolve();
        };
        reader.readAsDataURL(file);
      });
    } else if (existingUrl) {
      imagesData.push({
        url: existingUrl,
        description: descInput.value || "",
      });
    }
  }

  try {
    const data = {
      titulo,
      descripcion,
      categoria,
      images: imagesData,
      usuarioId: usuarioActual.uid,
      updatedAt: serverTimestamp(),
    };

    if (editingProjectId) {
      const projectRef = doc(db, "proyectos", editingProjectId);
      await updateDoc(projectRef, data);
      editingProjectId = null;
      alert("Proyecto actualizado.");
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(proyectosColRef, data);
      alert("Proyecto agregado.");
    }

    proyectoForm.reset();
    proyectoForm.querySelector(".imagenes-container").innerHTML = "";
    ensureAtLeastOneImageInput();
  } catch (err) {
    console.error("Error guardando proyecto:", err);
    alert("Error guardando proyecto: " + (err.message || err));
  }
});

// ================== Fill form for edit ==================
async function fillFormForEdit(project) {
  editingProjectId = project.id;
  proyectoForm.titulo.value = project.titulo || "";
  proyectoForm.descripcion.value = project.descripcion || "";
  proyectoForm.categoria.value = project.categoria || "";

  let container = proyectoForm.querySelector(".imagenes-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "imagenes-container";
    const submitBtn = proyectoForm.querySelector("button[type='submit']");
    proyectoForm.insertBefore(container, submitBtn);
  }
  container.innerHTML = "";

  const existingImages = Array.isArray(project.images) ? project.images : [];
  for (const img of existingImages) {
    const wrapper = crearImagenInputNode(img.description || "", img.url);
    container.appendChild(wrapper);
  }

  container.appendChild(crearImagenInputNode());
  addGlobalAddImageButton(container);
  formularioProyectoSection.scrollIntoView({ behavior: "smooth" });
}

// ================== Render projects ==================
function renderProyectosList(projects) {
  contenedorProyectos.innerHTML = "";
  projects.forEach((proj) => {
    const card = document.createElement("article");
    card.className = "tarjeta";

    const title = document.createElement("h3");
    title.textContent = proj.titulo || "Sin título";

    const imgEl = document.createElement("img");
    const firstImg =
      Array.isArray(proj.images) && proj.images.length
        ? proj.images[0].url
        : "";
    imgEl.src =
      firstImg || "https://via.placeholder.com/600x360?text=Sin+imagen";
    imgEl.alt = proj.titulo || "Imagen proyecto";
    imgEl.style.cursor = "zoom-in"; // permite ampliar imagen
    imgEl.addEventListener("click", () => mostrarImagenGrande(firstImg));

    const pDesc = document.createElement("p");
    pDesc.textContent = proj.descripcion || "";

    const pCategoria = document.createElement("p");
    pCategoria.textContent = proj.categoria
      ? `Categoría: ${proj.categoria}`
      : "";

    const actions = document.createElement("div");
    actions.className = "acciones";

    const verBtn = document.createElement("button");
    verBtn.type = "button";
    verBtn.className = "btn";
    verBtn.textContent = "Ver";
    verBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      abrirModalConProyecto(proj);
    });

    actions.appendChild(verBtn);

    if (usuarioActual && usuarioActual.uid === proj.usuarioId) {
      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "boton-editar btn";
      editBtn.textContent = "Editar";
      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        fillFormForEdit(proj);
      });
      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "boton-eliminar btn";
      delBtn.textContent = "Eliminar";
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (confirm("¿Eliminar proyecto?")) eliminarProyecto(proj.id);
      });

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);
    }

    card.appendChild(imgEl);
    card.appendChild(title);
    card.appendChild(pDesc);
    card.appendChild(pCategoria);
    card.appendChild(actions);

    card.style.cursor = "pointer";
    card.addEventListener("click", () => {
      if (proj.url) {
        window.location.href = proj.url;
      } else {
        abrirModalConProyecto(proj);
      }
    });

    contenedorProyectos.appendChild(card);
  });
}

// ================== Modal ==================
function abrirModalConProyecto(proj) {
  modalTitulo.textContent = proj.titulo || "";
  modalDescripcion.textContent = proj.descripcion || "";

  modalImagenes.innerHTML = "";
  const imgs = Array.isArray(proj.images) ? proj.images : [];
  if (imgs.length === 0) {
    modalImagenes.innerHTML = `<p style="color:var(--primary)">Sin imágenes</p>`;
  } else {
    imgs.forEach((imgObj) => {
      const block = document.createElement("div");
      block.className = "modal-imagen-block";

      const img = document.createElement("img");
      img.src = imgObj.url;
      img.alt = "imagen";
      img.style.width = "100%";
      img.style.borderRadius = "8px";
      img.style.marginBottom = "6px";
      img.style.cursor = "zoom-in";
      img.addEventListener("click", () => mostrarImagenGrande(imgObj.url));

      const desc = document.createElement("p");
      desc.style.color = "var(--primary)";
      desc.textContent = imgObj.description || "";

      block.appendChild(img);
      block.appendChild(desc);
      modalImagenes.appendChild(block);
    });
  }

  if (usuarioActual && usuarioActual.uid === proj.usuarioId) {
    modalEditarBtn.style.display = "inline-block";
    modalEliminarBtn.style.display = "inline-block";
    modalEditarBtn.onclick = () => {
      fillFormForEdit(proj);
      modalProyecto.style.display = "none";
    };
    modalEliminarBtn.onclick = async () => {
      if (confirm("¿Eliminar proyecto?")) {
        await eliminarProyecto(proj.id);
        modalProyecto.style.display = "none";
      }
    };
  } else {
    modalEditarBtn.style.display = "none";
    modalEliminarBtn.style.display = "none";
    modalEditarBtn.onclick = null;
    modalEliminarBtn.onclick = null;
  }

  modalProyecto.style.display = "flex";
}

// ================== Delete project ==================
async function eliminarProyecto(projectId) {
  const confirmacion = confirm("¿Seguro que quieres eliminar este proyecto?");
  if (!confirmacion) return;
  try {
    await deleteDoc(doc(db, "proyectos", projectId));
    alert("Proyecto eliminado.");
  } catch (err) {
    console.error("Error eliminando proyecto:", err);
    alert("Error eliminando proyecto: " + (err.message || err));
  }
}

// ================== Mostrar imagen en grande ==================
function mostrarImagenGrande(src) {
  if (!src) return;
  const visor = document.createElement("div");
  visor.className = "visor-imagen";
  visor.style.position = "fixed";
  visor.style.top = 0;
  visor.style.left = 0;
  visor.style.width = "100%";
  visor.style.height = "100%";
  visor.style.background = "rgba(0,0,0,0.8)";
  visor.style.display = "flex";
  visor.style.alignItems = "center";
  visor.style.justifyContent = "center";
  visor.style.zIndex = 9999;

  const img = document.createElement("img");
  img.src = src;
  img.style.maxWidth = "90%";
  img.style.maxHeight = "90%";
  img.style.borderRadius = "8px";

  const cerrar = document.createElement("span");
  cerrar.textContent = "×";
  cerrar.style.position = "absolute";
  cerrar.style.top = "20px";
  cerrar.style.right = "30px";
  cerrar.style.fontSize = "2rem";
  cerrar.style.color = "#fff";
  cerrar.style.cursor = "pointer";

  cerrar.addEventListener("click", () => visor.remove());
  visor.addEventListener("click", (e) => {
    if (e.target === visor) visor.remove();
  });

  visor.appendChild(img);
  visor.appendChild(cerrar);
  document.body.appendChild(visor);
}

// ================== Real-time listener ==================
const q = query(proyectosColRef, orderBy("createdAt", "desc"));
onSnapshot(q, (snapshot) => {
  const projects = [];
  snapshot.forEach((s) => projects.push({ id: s.id, ...s.data() }));
  proyectosCache = projects;
  renderProyectosList(projects);
});

// ================== Modal close ==================
cerrarModalBtn.addEventListener(
  "click",
  () => (modalProyecto.style.display = "none")
);
window.addEventListener("click", (e) => {
  if (e.target === modalProyecto) modalProyecto.style.display = "none";
});

// ================== Auth observer ==================
onAuthStateChanged(auth, (user) => {
  actualizarUIAuth(user);
  renderProyectosList(proyectosCache);
});

// ================== Event bindings ==================
loginBtn.addEventListener("click", iniciarSesion);
logoutBtn.addEventListener("click", cerrarSesion);
ensureAtLeastOneImageInput();

// ================== Keyboard ==================
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") modalProyecto.style.display = "none";
});

document.querySelector(".avatar").src = user.photoURL || "avatar.jpg";
