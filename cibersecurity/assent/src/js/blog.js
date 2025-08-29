document.addEventListener("DOMContentLoaded", () => {
  // Referencias menú
  const navHome = document.getElementById("nav-home");
  const navVideos = document.getElementById("nav-videos");
  const navApuntes = document.getElementById("nav-apuntes");
  const navProyectos = document.getElementById("nav-proyectos");

  // Referencias secciones
  const sectionHome = document.getElementById("section-home");
  const sectionVideos = document.getElementById("section-videos");
  const sectionApuntes = document.getElementById("section-apuntes");
  const sectionProyectos = document.getElementById("section-proyectos");

  // Sub-elementos videos
  const videosMainMenu = document.getElementById("videos-main-menu");
  const videosModule = document.getElementById("videos-module");
  const videosBtnBack = document.getElementById("videos-btn-back");
  const videosSectionTitle = document.getElementById("videos-section-title");
  const videoIframe = document.getElementById("video-iframe");
  const videoPrevBtn = document.getElementById("video-prev");
  const videoNextBtn = document.getElementById("video-next");

  // Comentarios y notas
  const commentsList = document.getElementById("comments-list");
  const commentInput = document.getElementById("comment-input");
  const btnAddComment = document.getElementById("btn-add-comment");
  const notesTextarea = document.getElementById("notes-textarea");
  const btnSaveNotes = document.getElementById("btn-save-notes");
  const notesSaveMsg = document.getElementById("notes-save-msg");

  // Botón tema
  const btnToggleTheme = document.getElementById("btn-toggle-theme");

  // Datos videos
  const videosData = {
    1: {
      title: "Prácticas - Ciberseguridad",
      videos: [
        "https://www.youtube.com/embed/ppVfuXyOoO8?si=kg9D-l8KOwHpGWN8",
        "https://www.youtube.com/embed/y9NhaYH-FV8?si=k4MqrB83OOIrUWOk",
      ],
    },
    2: {
      title: "Prácticas - Redes",
      videos: [
        "https://www.youtube.com/embed/dipGglRzZ6Y?si=J9X7Rkf17H7c2QIh",
        "https://www.youtube.com/embed/OLSKCWjI778?si=RRSV6_tEZ6WkXXEj",
      ],
    },

    3: {
      title: "Prácticas - python",
      videos: [
        "https://www.youtube.com/embed/Uyy3kAfm-1w?si=BfkAsTdcyG_TRBIk",
        "https://www.youtube.com/embed/XH8TzcqUWiM?si=p4bK0bE7YrepolFe",
      ],
    },
  };

  let currentSection = null;
  let currentVideoIndex = 0;

  // Ocultar todas las secciones principales
  function ocultarTodas() {
    if (sectionHome) sectionHome.classList.add("hidden");
    if (sectionVideos) sectionVideos.classList.add("hidden");
    if (sectionApuntes) sectionApuntes.classList.add("hidden");
    if (sectionProyectos) sectionProyectos.classList.add("hidden");
  }

  // Mostrar sección principal (home, videos, apuntes, proyectos)
  function mostrarSeccion(nombre) {
    ocultarTodas();
    // Siempre que volvemos a videos, ocultamos módulo y mostramos menú principal
    if (videosModule) videosModule.classList.add("hidden");
    if (videosMainMenu) videosMainMenu.classList.remove("hidden");
    videoIframe.src = "";
    commentsList.innerHTML = "";
    commentInput.value = "";
    notesTextarea.value = "";
    notesSaveMsg.style.display = "none";

    switch (nombre) {
      case "home":
        if (sectionHome) sectionHome.classList.remove("hidden");
        break;
      case "videos":
        if (sectionVideos) sectionVideos.classList.remove("hidden");
        break;
      case "apuntes":
        if (sectionApuntes) sectionApuntes.classList.remove("hidden");
        break;
      case "proyectos":
        if (sectionProyectos) sectionProyectos.classList.remove("hidden");
        break;
    }
  }

  // Evento click menú
  if (navHome)
    navHome.addEventListener("click", (e) => {
      e.preventDefault();
      mostrarSeccion("home");
    });

  if (navVideos)
    navVideos.addEventListener("click", (e) => {
      e.preventDefault();
      mostrarSeccion("videos");
    });

  if (navApuntes)
    navApuntes.addEventListener("click", (e) => {
      e.preventDefault();
      mostrarSeccion("apuntes");
    });

  if (navProyectos)
    navProyectos.addEventListener("click", (e) => {
      e.preventDefault();
      mostrarSeccion("proyectos");
    });

  // Botones dentro de videos para elegir práctica
  document.querySelectorAll(".section-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sec = btn.dataset.section;
      if (videosData[sec]) {
        currentSection = sec;
        currentVideoIndex = 0;

        if (videosSectionTitle)
          videosSectionTitle.textContent = videosData[sec].title;
        if (videosModule) videosModule.classList.remove("hidden");
        if (videosMainMenu) videosMainMenu.classList.add("hidden");

        mostrarVideo(currentVideoIndex);
        cargarComentarios();
        cargarApuntes();
      }
    });
  });

  // Mostrar video en iframe
  function mostrarVideo(index) {
    const vids = videosData[currentSection].videos;
    if (index < 0) index = vids.length - 1;
    if (index >= vids.length) index = 0;
    currentVideoIndex = index;

    if (videoIframe) videoIframe.src = vids[index];
  }

  // Navegación videos
  if (videoPrevBtn)
    videoPrevBtn.addEventListener("click", () => {
      mostrarVideo(currentVideoIndex - 1);
      cargarComentarios();
      cargarApuntes();
    });

  if (videoNextBtn)
    videoNextBtn.addEventListener("click", () => {
      mostrarVideo(currentVideoIndex + 1);
      cargarComentarios();
      cargarApuntes();
    });

  // Volver al menú principal de videos
  if (videosBtnBack)
    videosBtnBack.addEventListener("click", () => {
      if (videosModule) videosModule.classList.add("hidden");
      if (videosMainMenu) videosMainMenu.classList.remove("hidden");
      videoIframe.src = "";
      commentsList.innerHTML = "";
      commentInput.value = "";
      notesTextarea.value = "";
      notesSaveMsg.style.display = "none";
    });

  // Cargar comentarios desde localStorage
  function cargarComentarios() {
    if (!commentsList) return;
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

  // Añadir comentario
  if (btnAddComment)
    btnAddComment.addEventListener("click", () => {
      if (!commentInput) return;
      const texto = commentInput.value.trim();
      if (texto === "") return;
      const key = `comentarios-${currentSection}-${currentVideoIndex}`;
      const comentarios = JSON.parse(localStorage.getItem(key)) || [];
      comentarios.push(texto);
      localStorage.setItem(key, JSON.stringify(comentarios));
      commentInput.value = "";
      cargarComentarios();
    });

  // Cargar apuntes desde localStorage
  function cargarApuntes() {
    if (!notesTextarea) return;
    const key = `apuntes-${currentSection}-${currentVideoIndex}`;
    const apuntesGuardados = localStorage.getItem(key) || "";
    notesTextarea.value = apuntesGuardados;
    if (notesSaveMsg) notesSaveMsg.style.display = "none";
  }

  // Guardar apuntes
  if (btnSaveNotes)
    btnSaveNotes.addEventListener("click", () => {
      if (!notesTextarea) return;
      const key = `apuntes-${currentSection}-${currentVideoIndex}`;
      localStorage.setItem(key, notesTextarea.value);
      if (notesSaveMsg) {
        notesSaveMsg.style.display = "inline-block";
        setTimeout(() => (notesSaveMsg.style.display = "none"), 2000);
      }
    });

  // Iniciar en Home
  mostrarSeccion("home");
});
