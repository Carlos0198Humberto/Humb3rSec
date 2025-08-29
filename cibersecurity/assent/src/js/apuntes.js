// apuntes.js MEJORADO - FILTRO FUNCIONAL PARA USUARIOS LOGEADOS O NO

import {
  auth,
  provider,
  db,
  signOut,
  onAuthStateChanged,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  deleteDoc,
  updateDoc,
} from "./firebase-init.js";

import { signInWithPopup } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";

const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const userInfo = document.getElementById("user-info");
const userEmail = document.getElementById("user-email");
const userPhoto = document.getElementById("user-photo");
const formulario = document.getElementById("formulario-container");
const apunteForm = document.getElementById("apunte-form");
const apuntesContainer = document.getElementById("apuntes-container");
const filtroColor = document.getElementById("filtro-color");
const noti = document.getElementById("notificacion");
const guardarBtn = document.getElementById("guardar-btn");
const comandosContainer = document.getElementById("comandos-container");
const agregarComandoBtn = document.getElementById("agregar-comando");

let usuarioActual = null;
let editandoId = null;
let apuntesCache = [];
let unsubscribeApuntes = null;

// ------------------ FUNCIONES DE AUTENTICACIÓN ------------------
loginBtn.addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    usuarioActual = result.user;
    actualizarEstadoUsuario();
    mostrarNotificacion("Sesión iniciada correctamente.");
  } catch (error) {
    mostrarNotificacion("Error al iniciar sesión: " + error.message, "error");
    console.error(error);
  }
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  usuarioActual = null;
  actualizarEstadoUsuario();
  mostrarNotificacion("Has cerrado sesión correctamente.", "info");
});

onAuthStateChanged(auth, (user) => {
  usuarioActual = user || null;
  actualizarEstadoUsuario();
});

function actualizarEstadoUsuario() {
  if (usuarioActual) {
    userInfo.style.display = "flex";
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    userEmail.textContent = usuarioActual.email;
    userPhoto.src = usuarioActual.photoURL || "default-avatar.png";
    formulario.classList.remove("oculto");
  } else {
    userInfo.style.display = "none";
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    formulario.classList.add("oculto");
  }
  renderizarApuntes(); // Renderiza apuntes filtrados siempre
}

// ------------------ AGREGAR COMANDOS ------------------
agregarComandoBtn.addEventListener("click", () => {
  const wrapper = document.createElement("div");
  wrapper.classList.add("comando-item");
  wrapper.innerHTML = `
    <input type="text" class="comando-input" placeholder="Comando útil (opcional)" />
    <button type="button" class="btn-xs btn-danger eliminar-comando">✖</button>
  `;
  wrapper
    .querySelector(".eliminar-comando")
    .addEventListener("click", () => wrapper.remove());
  comandosContainer.appendChild(wrapper);
});

// ------------------ GUARDAR APUNTE ------------------
apunteForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!usuarioActual) {
    mostrarNotificacion("Debes iniciar sesión para guardar.", "error");
    return;
  }

  const titulo = document.getElementById("titulo").value.trim();
  const descripcion = document.getElementById("descripcion").value.trim();
  const comandos = Array.from(document.querySelectorAll(".comando-input"))
    .map((input) => input.value.trim())
    .filter((c) => c !== "");
  const fuentes = document.getElementById("fuentes").value.trim();
  const sistema = document.getElementById("sistema").value.trim();
  const color = document.getElementById("color").value;
  const imagen = document.getElementById("imagen").files[0];
  let imagenURL = "";

  const guardar = async () => {
    try {
      const data = {
        titulo,
        descripcion,
        comandos,
        fuentes,
        sistema,
        color,
        imagenURL,
        fecha: new Date(),
        usuario: usuarioActual.uid,
        autorEmail: usuarioActual.email,
      };

      if (editandoId) {
        await updateDoc(doc(db, "apuntes", editandoId), data);
        mostrarNotificacion("Apunte actualizado correctamente.");
      } else {
        await addDoc(collection(db, "apuntes"), data);
        mostrarNotificacion("Apunte guardado correctamente.");
      }

      apunteForm.reset();
      document.getElementById("nombre-archivo").textContent =
        "Ningún archivo seleccionado";
      editandoId = null;
      guardarBtn.textContent = "Guardar apunte";
    } catch (err) {
      console.error("Error al guardar:", err);
      mostrarNotificacion("Error al guardar el apunte.", "error");
    }
  };

  if (imagen) {
    const reader = new FileReader();
    reader.onload = async () => {
      imagenURL = reader.result;
      await guardar();
    };
    reader.readAsDataURL(imagen);
  } else {
    await guardar();
  }
});

// ------------------ ACTUALIZA NOMBRE DEL ARCHIVO ------------------
document.getElementById("imagen").addEventListener("change", (e) => {
  const nombre = e.target.files[0]?.name || "Ningún archivo seleccionado";
  document.getElementById("nombre-archivo").textContent = nombre;
});

// ------------------ SUSCRIPCIÓN A APUNTES ------------------
function suscribirApuntes() {
  if (unsubscribeApuntes) return;
  const q = query(collection(db, "apuntes"), orderBy("fecha", "desc"));
  unsubscribeApuntes = onSnapshot(q, (snapshot) => {
    apuntesCache = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderizarApuntes(); // repinta apuntes al recibir datos
  });
}
suscribirApuntes();

// ------------------ FILTRO ------------------
filtroColor.addEventListener("change", renderizarApuntes);

// ------------------ RENDERIZAR APUNTES ------------------
function renderizarApuntes() {
  apuntesContainer.innerHTML = "";
  const filtro = (filtroColor.value || "todos").toLowerCase();

  apuntesCache.forEach((apunte) => {
    const colorApunte = (apunte.color || "amarillo").toLowerCase();
    if (filtro === "todos" || filtro === colorApunte) {
      const tarjeta = crearTarjeta(apunte);
      apuntesContainer.appendChild(tarjeta);
    }
  });
}

// ------------------ CREAR TARJETA ------------------
function crearTarjeta(apunte) {
  const tarjeta = document.createElement("div");
  tarjeta.className = `tarjeta ${apunte.color || ""}`;

  let fechaTexto = "";
  try {
    if (apunte.fecha) {
      if (apunte.fecha.seconds !== undefined)
        fechaTexto = new Date(apunte.fecha.seconds * 1000).toLocaleString();
      else if (apunte.fecha.toDate)
        fechaTexto = apunte.fecha.toDate().toLocaleString();
      else if (apunte.fecha instanceof Date)
        fechaTexto = apunte.fecha.toLocaleString();
      else fechaTexto = new Date(apunte.fecha).toLocaleString();
    }
  } catch (e) {
    console.error("Error parseando fecha:", e);
  }

  tarjeta.innerHTML = `
    <h3>${apunte.titulo || "Sin título"}</h3>
    ${apunte.imagenURL ? `<img src="${apunte.imagenURL}" alt="Imagen">` : ""}
    <p>${apunte.descripcion || ""}</p>
    ${
      apunte.comandos && apunte.comandos.length
        ? apunte.comandos.map((c) => `<pre>${escapeHtml(c)}</pre>`).join("")
        : ""
    }
    ${
      apunte.fuentes
        ? `<p><strong>Fuente:</strong> <a href="${apunte.fuentes}" target="_blank" rel="noopener noreferrer">ver</a></p>`
        : ""
    }
    ${
      apunte.sistema
        ? `<p><strong>Sistema:</strong> ${escapeHtml(apunte.sistema)}</p>`
        : ""
    }
    <p class="autor">Creado por: ${apunte.autorEmail || "Anónimo"}</p>
    <p style="font-size: 0.65rem;">${fechaTexto}</p>
  `;

  // Acciones solo para autor
  if (usuarioActual && usuarioActual.uid === apunte.usuario) {
    const acciones = document.createElement("div");
    acciones.className = "acciones";

    const btnEditar = document.createElement("button");
    btnEditar.textContent = "Editar";
    btnEditar.className = "boton-editar";
    btnEditar.onclick = (e) => {
      e.stopPropagation();
      cargarEdicion(apunte);
    };

    const btnEliminar = document.createElement("button");
    btnEliminar.textContent = "Eliminar";
    btnEliminar.className = "boton-eliminar";
    btnEliminar.onclick = (e) => {
      e.stopPropagation();
      eliminarApunte(apunte.id);
    };

    acciones.appendChild(btnEditar);
    acciones.appendChild(btnEliminar);
    tarjeta.appendChild(acciones);
  }

  tarjeta.addEventListener("click", () => mostrarModal(apunte));
  return tarjeta;
}

// ------------------ CARGAR EDICIÓN ------------------
function cargarEdicion(apunte) {
  document.getElementById("titulo").value = apunte.titulo || "";
  document.getElementById("descripcion").value = apunte.descripcion || "";

  comandosContainer.innerHTML = "";
  if (Array.isArray(apunte.comandos)) {
    apunte.comandos.forEach((c) => {
      const wrapper = document.createElement("div");
      wrapper.classList.add("comando-item");
      wrapper.innerHTML = `
        <input type="text" class="comando-input" value="${escapeHtml(c)}" />
        <button type="button" class="btn-xs btn-danger eliminar-comando">✖</button>
      `;
      wrapper
        .querySelector(".eliminar-comando")
        .addEventListener("click", () => wrapper.remove());
      comandosContainer.appendChild(wrapper);
    });
  }

  document.getElementById("fuentes").value = apunte.fuentes || "";
  document.getElementById("sistema").value = apunte.sistema || "";
  document.getElementById("color").value = apunte.color || "rojo";
  editandoId = apunte.id;
  guardarBtn.textContent = "Actualizar apunte";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ------------------ ELIMINAR APUNTE ------------------
async function eliminarApunte(id) {
  if (confirm("¿Seguro que quieres eliminar este apunte?")) {
    await deleteDoc(doc(db, "apuntes", id));
    mostrarNotificacion("Apunte eliminado.", "info");
  }
}

// ------------------ MODAL ------------------
function mostrarModal(apunte) {
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `
    <div class="modal-contenido ${apunte.color}">
      <span class="cerrar-modal">&times;</span>
      <h2 class="titulo-modal">${apunte.titulo}</h2>
      ${
        apunte.imagenURL
          ? `<img class="imagen-modal" src="${apunte.imagenURL}" alt="Imagen">`
          : ""
      }
      <p class="descripcion-modal">${apunte.descripcion}</p>
      ${
        apunte.comandos
          ? apunte.comandos
              .map((c) => `<pre class="bloque-comando"><code>${c}</code></pre>`)
              .join("")
          : ""
      }
      ${
        apunte.fuentes
          ? `<p class="fuente-modal"><strong>Fuente:</strong> <a href="${apunte.fuentes}" target="_blank">${apunte.fuentes}</a></p>`
          : ""
      }
      ${
        apunte.sistema
          ? `<p class="sistema-modal"><strong>Sistema:</strong> ${apunte.sistema}</p>`
          : ""
      }
      <p class="fecha-modal"><strong>Fecha:</strong> ${new Date(
        apunte.fecha.seconds * 1000
      ).toLocaleString()}</p>
    </div>
  `;
  modal
    .querySelector(".cerrar-modal")
    .addEventListener("click", () => modal.remove());
  const imagen = modal.querySelector(".imagen-modal");
  if (imagen)
    imagen.addEventListener("click", () => mostrarImagenGrande(imagen.src));
  document.body.appendChild(modal);
}

function mostrarImagenGrande(src) {
  const visor = document.createElement("div");
  visor.className = "visor-imagen";
  visor.innerHTML = `
    <div class="imagen-grande-contenedor">
      <span class="cerrar-visor">&times;</span>
      <img src="${src}" alt="Imagen ampliada">
    </div>
  `;
  visor
    .querySelector(".cerrar-visor")
    .addEventListener("click", () => visor.remove());
  document.body.appendChild(visor);
}

// ------------------ NOTIFICACIONES ------------------
function mostrarNotificacion(mensaje, tipo = "info") {
  if (!noti) return;
  noti.textContent = mensaje;
  noti.className = `notificacion mostrar${tipo === "error" ? " error" : ""}`;
  setTimeout(() => noti.classList.remove("mostrar"), 3000);
}
