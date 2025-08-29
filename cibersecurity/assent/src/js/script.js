document.addEventListener("DOMContentLoaded", () => {
  // ====== Referencias DOM ======
  const navHome = document.getElementById("nav-home");
  const navVideos = document.getElementById("nav-videos");
  const navApuntes = document.getElementById("nav-apuntes");
  const navProyectos = document.getElementById("nav-proyectos");

  const sectionHome = document.getElementById("section-home");
  const sectionVideos = document.getElementById("section-videos");
  const sectionApuntes = document.getElementById("section-apuntes");
  const sectionProyectos = document.getElementById("section-proyectos");

  const videosMainMenu = document.getElementById("videos-main-menu");
  const videosModule = document.getElementById("videos-module");
  const videosBtnBack = document.getElementById("videos-btn-back");
  const videosSectionTitle = document.getElementById("videos-section-title");

  const videoIframe = document.getElementById("video-iframe");
  const videoPrevBtn = document.getElementById("video-prev");
  const videoNextBtn = document.getElementById("video-next");

  const commentsList = document.getElementById("comments-list");
  const commentInput = document.getElementById("comment-input");
  const btnAddComment = document.getElementById("btn-add-comment");

  const notesTextarea = document.getElementById("notes-textarea");
  const btnSaveNotes = document.getElementById("btn-save-notes");
  const notesSaveMsg = document.getElementById("notes-save-msg");

  const btnToggleTheme = document.getElementById("btn-toggle-theme");

  // ====== Datos de videos ======
  const videosData = {
    1: {
      title: "Práctica 1 - Redes",
      videos: [
        "https://www.youtube.com/embed/kNb7gG_Pylo?si=FEs7iyukK4k_p1hj",
        "https://www.youtube.com/embed/BZmGxbc3Np4",
      ],
    },
    2: {
      title: "Práctica 2 - Seguridad",
      videos: ["https://www.youtube.com/embed/BZmGxbc3Np4"],
    },
  };

  let currentSection = null;
  let currentVideoIndex = 0;

  // ====== Función para mostrar una sección y ocultar las demás ======
  function mostrarSeccion(id) {
    [sectionHome, sectionVideos, sectionApuntes, sectionProyectos].forEach(
      (sec) => sec.classList.add("hidden")
    );
    document.getElementById(id).classList.remove("hidden");
    // Reset módulo de videos cuando no estamos en prácticas
    if (id !== "section-videos") {
      videosModule.classList.add("hidden");
      videosMainMenu.classList.remove("hidden");
      videoIframe.src = "";
    }
  }

  // ====== Eventos de navegación ======
  navHome.addEventListener("click", (e) => {
    e.preventDefault();
    mostrarSeccion("section-home");
  });
  navVideos.addEventListener("click", (e) => {
    e.preventDefault();
    mostrarSeccion("section-videos");
  });
  navApuntes.addEventListener("click", (e) => {
    e.preventDefault();
    mostrarSeccion("section-apuntes");
  });
  navProyectos.addEventListener("click", (e) => {
    e.preventDefault();
    mostrarSeccion("section-proyectos");
  });

  // ====== Botones de prácticas ======
  document.querySelectorAll(".section-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sectionId = btn.dataset.section;
      if (videosData[sectionId]) {
        currentSection = sectionId;
        currentVideoIndex = 0;

        videosSectionTitle.textContent = videosData[sectionId].title;
        mostrarVideo(currentVideoIndex);

        videosModule.classList.remove("hidden");
        videosMainMenu.classList.add("hidden");

        cargarComentarios();
        cargarApuntes();
      }
    });
  });

  // ====== Mostrar video en iframe ======
  function mostrarVideo(index) {
    const videos = videosData[currentSection].videos;
    if (index < 0) index = videos.length - 1;
    if (index >= videos.length) index = 0;
    currentVideoIndex = index;

    const url = videos[index];
    videoIframe.src = url;
  }

  // ====== Navegación entre videos ======
  videoPrevBtn.addEventListener("click", () => {
    mostrarVideo(currentVideoIndex - 1);
    cargarComentarios();
    cargarApuntes();
  });

  videoNextBtn.addEventListener("click", () => {
    mostrarVideo(currentVideoIndex + 1);
    cargarComentarios();
    cargarApuntes();
  });

  // ====== Volver al menú de prácticas ======
  videosBtnBack.addEventListener("click", () => {
    videosModule.classList.add("hidden");
    videosMainMenu.classList.remove("hidden");
    videoIframe.src = "";
    commentsList.innerHTML = "";
    commentInput.value = "";
    notesTextarea.value = "";
    notesSaveMsg.style.display = "none";
  });

  // ====== Comentarios ======
  function cargarComentarios() {
    commentsList.innerHTML = "";
    const key = `comentarios-${currentSection}-${currentVideoIndex}`;
    const comentarios = JSON.parse(localStorage.getItem(key)) || [];
    comentarios.forEach((c) => {
      const li = document.createElement("li");
      li.textContent = c;
      li.style.borderBottom = "1px solid var(--red)";
      li.style.padding = "0.3rem 0";
      commentsList.appendChild(li);
    });
  }

  btnAddComment.addEventListener("click", () => {
    const texto = commentInput.value.trim();
    if (texto === "") return;
    const key = `comentarios-${currentSection}-${currentVideoIndex}`;
    const comentarios = JSON.parse(localStorage.getItem(key)) || [];
    comentarios.push(texto);
    localStorage.setItem(key, JSON.stringify(comentarios));
    commentInput.value = "";
    cargarComentarios();
  });

  // ====== Apuntes por video ======
  function cargarApuntes() {
    const key = `apuntes-${currentSection}-${currentVideoIndex}`;
    const apuntesGuardados = localStorage.getItem(key) || "";
    notesTextarea.value = apuntesGuardados;
    notesSaveMsg.style.display = "none";
  }

  btnSaveNotes.addEventListener("click", () => {
    const key = `apuntes-${currentSection}-${currentVideoIndex}`;
    localStorage.setItem(key, notesTextarea.value);
    notesSaveMsg.style.display = "inline-block";
    setTimeout(() => (notesSaveMsg.style.display = "none"), 2000);
  });

  // ====== Mostrar home por defecto ======
  mostrarSeccion("section-home");
});

// ====== MODALES DE CERTIFICADOS ======
function openDiplomaModal(imgSrc, link) {
  const modal = document.getElementById("diplomaModal");
  const modalImg = document.getElementById("diplomaModalImg");
  const diplomaLink = document.getElementById("diplomaLink");

  modalImg.src = imgSrc;
  diplomaLink.href = link;
  modal.style.display = "flex";
}

function closeDiplomaModal() {
  document.getElementById("diplomaModal").style.display = "none";
}

// ====== MODALES DE PROYECTOS ======
function abrirModal(imgSrc, descripcion, categoria) {
  const modal = document.getElementById("modal");
  const modalImg = document.getElementById("modal-img");
  const modalDesc = document.getElementById("modal-descripcion");
  const modalCat = document.getElementById("modal-categoria");

  modalImg.src = imgSrc;
  modalDesc.textContent = descripcion;
  modalCat.textContent = categoria;

  modal.style.display = "flex";
}

function cerrarModal() {
  document.getElementById("modal").style.display = "none";
}

// ====== CERRAR MODAL HACIENDO CLIC FUERA ======
window.addEventListener("click", function (e) {
  if (e.target.classList.contains("modal")) {
    e.target.style.display = "none";
  }
});
document
  .getElementById("contact-form")
  .addEventListener("submit", function (e) {
    e.preventDefault();

    emailjs.sendForm("TU_SERVICE_ID", "TU_TEMPLATE_ID", this).then(
      function () {
        alert("Mensaje enviado correctamente!");
      },
      function (error) {
        alert("Error al enviar: " + JSON.stringify(error));
      }
    );
  });
