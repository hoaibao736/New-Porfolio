
document.addEventListener("DOMContentLoaded", () => {
  const API_BASE_URL = 'data';
  let currentLang = localStorage.getItem("language") || "vi";
  let cachedData = { personalInfo: null, projects: null, videoProjects: null };

  // Lưu text gốc (tiếng Việt) của phần tử data-lang
  const elements = document.querySelectorAll('[data-lang]');
  const originalTexts = {};
  elements.forEach(el => {
    originalTexts[el.getAttribute('data-lang')] = el.textContent.trim();
  });

  // Bảng dịch tiếng Anh
  const translations = {
    nav_home: 'Home',
    nav_about: 'About',
    nav_projects: 'Projects',
    nav_video_projects: 'Video Projects',
    nav_contact: 'Contact',
    projects_title: 'My Projects',
    video_projects_title: 'My Video Projects',
    footer_name: 'Designer Name'
  };

  // Cập nhật văn bản data-lang
  function switchLanguage(lang) {
    console.log('Chuyển sang ngôn ngữ:', lang);
    const elements = document.querySelectorAll('[data-lang]');
    elements.forEach(el => {
      const key = el.getAttribute('data-lang');
      el.textContent = lang === 'vi' ? originalTexts[key] : translations[key] || originalTexts[key];
    });
    document.documentElement.lang = lang;
    document.title = lang === "vi" ? "Portfolio Thiết Kế" : "Design Portfolio";
  }

  // Hàm làm sạch HTML để chống XSS
  function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Fetch với retry và kiểm tra tính toàn vẹn
  async function fetchWithRetry(url, retries = 2, delay = 1000, expectedHash = '') {
    for (let i = 0; i <= retries; i++) {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Lỗi HTTP! Trạng thái: ${response.status}, URL: ${url}`);
        const data = await response.json();
        if (expectedHash) {
          const dataString = JSON.stringify(data);
          const hash = btoa(dataString);
          if (hash !== expectedHash) {
            throw new Error('Kiểm tra tính toàn vẹn dữ liệu thất bại');
          }
        }
        return data;
      } catch (error) {
        if (i < retries) {
          console.warn(`Thử lại fetch (${i + 1}/${retries}) cho ${url}`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
  }

  // Load tất cả nội dung
  async function loadAll(langOverride) {
    const lang = langOverride || currentLang;
    currentLang = lang;
    localStorage.setItem('language', lang);
    switchLanguage(lang);
    try {
      await Promise.all([
        loadPersonalInfo(),
        loadProjects(),
        loadVideoProjects()
      ]);
    } catch (error) {
      console.error('Không tải được nội dung:', error);
    }
  }

  // Debounce để tránh lặp sự kiện
  function debounce(func, wait) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // Đổi ngôn ngữ
  const setLanguage = debounce(async (lang) => {
    if (lang === currentLang) return;

    console.log(">> Đổi ngôn ngữ:", lang);
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;
    currentLang = lang;

    // Reset cache để ép tải lại
    cachedData = { personalInfo: null, projects: null, videoProjects: null };

    // Cập nhật UI tĩnh
    switchLanguage(lang);

    // Tải lại toàn bộ nội dung
    try {
      await Promise.all([
        loadPersonalInfo(),
        loadProjects(),
        loadVideoProjects()
      ]);
    } catch (error) {
      console.error('Không tải được nội dung:', error);
    }
  }, 200);

  // Preload ảnh
  function preloadImage(url) {
    if (url && url !== 'images/placeholder.jpg') {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = url;
      document.head.appendChild(link);
    }
  }

  // Hàm tạo defaultPersonalInfo động
  function getDefaultPersonalInfo(lang) {
    return {
      name: lang === "vi" ? "Tên Người Dùng" : "User Name",
      profile_picture_url: "images/placeholder.jpg",
      tagline: lang === "vi" ? "Dòng giới thiệu" : "Tagline",
      bio_short: lang === "vi" ? "Tiểu sử ngắn" : "Short bio",
      bio_long: lang === "vi" ? "Thông tin chi tiết" : "Detailed information",
      cta_button: lang === "vi" ? "Xem Dự Án" : "View Projects",
      about_title: lang === "vi" ? "Về Tôi" : "About Me",
      skills_technical_title: lang === "vi" ? "Kỹ Năng Chuyên Môn" : "Technical Skills",
      skills_technical: [],
      skills_software_title: lang === "vi" ? "Phần Mềm Thành Thạo" : "Proficient Software",
      skills_software: [],
      experience_title: lang === "vi" ? "Kinh Nghiệm Làm Việc" : "Work Experience",
      work_experience: [],
      contact_title: lang === "vi" ? "Liên Hệ" : "Contact",
      contact_message: lang === "vi" ? "Nếu bạn có bất kỳ câu hỏi nào, hãy liên hệ!" : "Reach out for any questions!",
      contact_email_label: lang === "vi" ? "Email:" : "Email:",
      contact_email: "email@example.com",
      social_links: []
    };
  }

  // Fetch và render thông tin cá nhân
  async function loadPersonalInfo() {
    const heroSection = document.getElementById("hero");
    if (!heroSection) {
      console.error("Không tìm thấy hero section!");
      return;
    }
    heroSection.innerHTML = `<div class="spinner"></div>`;

    try {
      const data = await fetchWithRetry(`${API_BASE_URL}/${currentLang}/personal_info.json`);
      cachedData.personalInfo = { lang: currentLang, data };
      renderPersonalInfo(data);
    } catch (error) {
      console.error(`Không tải được thông tin cá nhân cho ${currentLang}:`, error);
      heroSection.innerHTML = `<p>${currentLang === "vi" ? "Lỗi tải thông tin cá nhân. Vui lòng thử lại sau." : "Error loading personal information. Please try again later."}</p>`;
    }
  }

  // Render thông tin cá nhân
  function renderPersonalInfo(data) {
    console.log("Đang render profile cho ngôn ngữ:", currentLang);
    data = { ...getDefaultPersonalInfo(currentLang), ...data };
    preloadImage(data.profile_picture_url);
    const heroSection = document.getElementById("hero");
    const aboutSection = document.getElementById("about");
    const contactSection = document.getElementById("contact");
    const footerName = document.getElementById("footer-name");

    heroSection.innerHTML = `
      <div class="hero-content">
        <img src="${sanitizeHTML(data.profile_picture_url)}" alt="${sanitizeHTML(data.name)}" id="profile-pic" fetchpriority="high" onerror="this.src='images/placeholder.jpg'" loading="lazy">
        <h1>${sanitizeHTML(data.name)}</h1>
        <ul class="social-links-contact">
          ${(data.social_links || []).map(link => `
            <li>
              <a href="${sanitizeHTML(link.url || '#')}" target="_blank" title="${sanitizeHTML(link.platform || 'Social')}" aria-label="Liên kết tới ${sanitizeHTML(link.platform || 'mạng xã hội')}">
                ${
                  /\.(png|jpe?g|svg|gif)$/i.test(link.icon_class || '')
                    ? `<img src="${sanitizeHTML(link.icon_class)}" alt="${sanitizeHTML(link.platform || 'icon')} icon" class="social-icon-img" style="height: 30px; vertical-align: middle; margin-left: 10px;" loading="lazy" onerror="this.src='images/placeholder.jpg'">`
                    : `<i class="${sanitizeHTML(link.icon_class || 'fa fa-link')}" style="font-size: 30px; margin-left: 10px;"></i>`
                }
              </a>
            </li>
          `).join("")}
        </ul>
        <p id="hero-tagline">${sanitizeHTML(data.tagline)}</p>
        <p id="hero-bio-short">${sanitizeHTML(data.bio_short)}</p>
        <a href="#projects" class="cta-button">${sanitizeHTML(data.cta_button)}</a>
      </div>`;

    if (aboutSection) {
      aboutSection.innerHTML = `
        <div class="container">
          <h2>${sanitizeHTML(data.about_title)}</h2>
          <p id="bio-long">${sanitizeHTML(data.bio_long)}</p>
          <div class="skills-container">
            <h3>${sanitizeHTML(data.skills_technical_title)}</h3>
            <ul class="skills-list" id="technical-skills">
              ${(data.skills_technical || []).map(skill => `<li>${sanitizeHTML(skill)}</li>`).join("")}
            </ul>
          </div>
          <div class="skills-container">
            <h3>${sanitizeHTML(data.skills_software_title)}</h3>
            <ul class="skills-list" id="software-skills">
              ${(data.skills_software || []).map(skill => `<li>${sanitizeHTML(skill)}</li>`).join("")}
            </ul>
          </div>
          <div class="experience-container">
            <h3>${sanitizeHTML(data.experience_title)}</h3>
            <div id="work-experience">
              ${(data.work_experience || []).map(exp => `
                <div class="experience-item">
                  <h4>${sanitizeHTML(exp.job_title || (currentLang === "vi" ? "Chức vụ" : "Position"))}</h4>
                  <p class="company">${sanitizeHTML(exp.company_name || (currentLang === "vi" ? "Công ty" : "Company"))} ${
                    exp.company_logo_url ? `<img src="${sanitizeHTML(exp.company_logo_url)}" alt="${sanitizeHTML(exp.company_name || 'company')} logo" style="height:20px; vertical-align:middle; margin-left:5px;" loading="lazy" onerror="this.src='images/placeholder.jpg'">` : ""
                  }</p>
                  <p class="duration">${sanitizeHTML(exp.duration || "")}</p>
                  <ul>
                    ${(exp.responsibilities || []).map(res => `<li>${sanitizeHTML(res)}</li>`).join("")}
                  </ul>
                </div>
              `).join("")}
            </div>
          </div>
        </div>`;
    }

    if (contactSection) {
      contactSection.innerHTML = `
        <div class="container">
          <h2>${sanitizeHTML(data.contact_title)}</h2>
          <div id="contact-info">
            <p style="color: #000000;">${sanitizeHTML(data.contact_message)}</p>
            <p>
              <strong style="color: #000000;">${sanitizeHTML(data.contact_email_label)}</strong> 
              <a href="mailto:${sanitizeHTML(data.contact_email)}" aria-label="Gửi email tới ${sanitizeHTML(data.contact_email)}">${sanitizeHTML(data.contact_email)}</a>
            </p>
            ${
              data.phone_number
                ? `<p>
                  <strong style="color: #000000;">${sanitizeHTML(data.contact_phone_label || (currentLang === "vi" ? "Điện thoại:" : "Phone:"))}</strong>
                  <span style="color: #000000;">${sanitizeHTML(data.phone_number)}</span>
                </p>`
                : ""
            }
            <ul class="social-links-contact">
              ${(data.social_links || []).map(link => `
                <li>
                  <a href="${sanitizeHTML(link.url || '#')}" target="_blank" title="${sanitizeHTML(link.platform || 'Social')}" aria-label="Liên kết tới ${sanitizeHTML(link.platform || 'mạng xã hội')}">
                    ${
                      /\.(png|jpe?g|svg|gif)$/i.test(link.icon_class || '')
                        ? `<img src="${sanitizeHTML(link.icon_class)}" alt="${sanitizeHTML(link.platform || 'icon')} icon" class="social-icon-img" style="height: 30px;" loading="lazy" onerror="this.src='images/placeholder.jpg'">`
                        : `<i class="${sanitizeHTML(link.icon_class || 'fa fa-link')}"></i>`
                    }
                  </a>
                </li>
              `).join("")}
            </ul>
          </div>
        </div>`;
    }

    if (footerName) footerName.textContent = sanitizeHTML(data.name || translations.footer_name);
  }

  // Fetch dự án
  async function loadProjects() {
    const projectGrid = document.querySelector(".project-grid");
    if (!projectGrid) {
      console.error("Không tìm thấy lưới dự án!");
      return;
    }
    projectGrid.innerHTML = `<div class="spinner"></div>`;

    try {
      if (cachedData.projects && cachedData.projects.lang === currentLang) {
        renderProjects(cachedData.projects.data);
        return;
      }
      const projects = await fetchWithRetry(`${API_BASE_URL}/${currentLang}/projects.json`);
      cachedData.projects = { lang: currentLang, data: projects };
      renderProjects(projects);
    } catch (error) {
      console.error(`Không tải được danh sách dự án cho ${currentLang}:`, error);
      projectGrid.innerHTML = `<p>${currentLang === "vi" ? "Lỗi tải danh sách dự án." : "Error loading project list."}</p>`;
    }
  }

  // Fetch dự án video
  async function loadVideoProjects() {
    const videoProjectGrid = document.querySelector(".video-project-grid");
    if (!videoProjectGrid) {
      console.error("Không tìm thấy lưới dự án video!");
      return;
    }
    videoProjectGrid.innerHTML = `<div class="spinner"></div>`;

    try {
      if (cachedData.videoProjects && cachedData.videoProjects.lang === currentLang) {
        renderVideoProjects(cachedData.videoProjects.data);
        return;
      }
      const videoProjects = await fetchWithRetry(`${API_BASE_URL}/${currentLang}/video_projects.json`);
      cachedData.videoProjects = { lang: currentLang, data: videoProjects };
      renderVideoProjects(videoProjects);
    } catch (error) {
      console.error(`Không tải được danh sách dự án video cho ${currentLang}:`, error);
      const videoSection = document.getElementById("video-projects");
      const videoNavItem = document.getElementById("nav-video-projects");
      if (videoSection) videoSection.style.display = "none";
      if (videoNavItem) videoNavItem.style.display = "none";
      videoProjectGrid.innerHTML = "";
    }
  }

  // Dữ liệu mặc định cho dự án
  const defaultProjects = [];
  const defaultVideoProjects = [];

  // Render dự án
  function renderProjects(projects) {
    projects = projects.length ? projects : defaultProjects;
    const projectGrid = document.querySelector(".project-grid");
    projectGrid.innerHTML = "";
    projects.forEach(project => {
      const projectCard = document.createElement("div");
      projectCard.classList.add("project-card");
      projectCard.dataset.projectId = project.id;
      projectCard.innerHTML = `
        <img src="${sanitizeHTML(project.project_thumbnail_url || 'images/placeholder.jpg')}" alt="${sanitizeHTML(project.project_name || 'Project')}" class="project-thumbnail"
             style="width: 360px; height: 240px; object-fit: cover; display: block; margin: 0 auto; border-radius: 8px;"
             loading="lazy" onerror="this.src='images/placeholder.jpg'">
        <div class="project-info">
          <h3>${sanitizeHTML(project.project_name || (currentLang === "vi" ? "Tên Dự Án" : "Project Name"))}</h3>
          <span class="project-category">${sanitizeHTML(project.project_category || (currentLang === "vi" ? "Thể loại" : "Category"))}</span>
          <p class="project-summary">${sanitizeHTML(project.project_summary || (currentLang === "vi" ? "Tóm tắt dự án" : "Project summary"))}</p>
        </div>`;
      projectCard.addEventListener("click", () => openProjectModal(project.id, projects));
      projectGrid.appendChild(projectCard);
    });

    const images = projectGrid.querySelectorAll('img.project-thumbnail');
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src || img.src;
          obs.unobserve(img);
        }
      });
    }, { rootMargin: '200px' });
    images.forEach(img => {
      img.dataset.src = img.src;
      observer.observe(img);
    });
  }

  // Render dự án video
  function renderVideoProjects(videoProjects) {
    videoProjects = videoProjects.length ? videoProjects : defaultVideoProjects;
    const videoProjectGrid = document.querySelector(".video-project-grid");
    const navVideoProjects = document.getElementById("nav-video-projects");
    const sectionVideoProjects = document.getElementById("video-projects");

    if (!videoProjects || videoProjects.length === 0) {
      if (navVideoProjects) navVideoProjects.classList.add("hidden");
      if (sectionVideoProjects) sectionVideoProjects.classList.add("hidden");
      videoProjectGrid.innerHTML = "";
      return;
    }

    if (navVideoProjects) navVideoProjects.classList.remove("hidden");
    if (sectionVideoProjects) sectionVideoProjects.classList.remove("hidden");

    videoProjectGrid.innerHTML = "";

    videoProjects.forEach(project => {
      const projectCard = document.createElement("div");
      projectCard.classList.add("video-project-card");
      projectCard.dataset.projectId = project.id;

      let thumbnailURL = project.project_thumbnail_url;
      if (!thumbnailURL || !thumbnailURL.includes("img.youtube.com")) {
        let videoId = "";
        if (project.video_url.includes("youtube.com/watch?v=")) {
          videoId = project.video_url.split("v=")[1].split("&")[0];
        } else if (project.video_url.includes("youtu.be/")) {
          videoId = project.video_url.split("/").pop().split("?")[0];
        } else if (project.video_url.includes("youtube.com/shorts/")) {
          videoId = project.video_url.split("/shorts/")[1].split("?")[0];
        }
        thumbnailURL = videoId
          ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
          : "images/placeholder.jpg";
      }

      const thumbnailHTML = `
        <div class="video-thumbnail-wrapper">
          <img src="${sanitizeHTML(thumbnailURL)}" alt="${sanitizeHTML(project.project_name || 'Video Project')}" class="video-project-thumbnail"
               style="width: 360px; height: 240px; object-fit: cover; display: block; margin: 0 auto; border-radius: 8px;"
               loading="lazy" onerror="this.src='images/placeholder.jpg'">
          <button class="play-button" data-project-id="${project.id}" aria-label="Play video">
            <svg width="50" height="50" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" fill="#fff"/>
            </svg>
          </button>
        </div>`;

      projectCard.innerHTML = `
        ${thumbnailHTML}
        <div class="project-info">
          <h3>${sanitizeHTML(project.project_name || (currentLang === "vi" ? "Tên Dự Án Video" : "Video Project Name"))}</h3>
          <span class="project-category">${sanitizeHTML(project.project_category || (currentLang === "vi" ? "Thể loại Video" : "Video Category"))}</span>
          <p class="project-summary">${sanitizeHTML(project.project_summary || (currentLang === "vi" ? "Tóm tắt dự án video" : "Video project summary"))}</p>
        </div>`;

      videoProjectGrid.appendChild(projectCard);
    });

    const playButtons = videoProjectGrid.querySelectorAll('.play-button');
    playButtons.forEach(button => {
      button.addEventListener('click', () => {
        const projectId = button.dataset.projectId;
        openProjectModal(projectId, videoProjects, true);
      });
    });

    const images = videoProjectGrid.querySelectorAll('img.video-project-thumbnail');
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src || img.src;
          obs.unobserve(img);
        }
      });
    }, { rootMargin: '200px' });
    images.forEach(img => {
      img.dataset.src = img.src;
      observer.observe(img);
    });
  }

  // Modal chi tiết dự án
  function openProjectModal(projectId, allProjects, isVideoProject = false) {
    const modal = document.getElementById("project-modal");
    const modalContent = document.getElementById("modal-project-content");
    if (!modal || !modalContent) {
      console.error("Không tìm thấy modal hoặc nội dung modal!");
      return;
    }

    const project = allProjects.find(p => p.id === projectId);
    if (!project) {
      console.error("Không tìm thấy dự án:", projectId);
      return;
    }

    let mediaHTML = '<div class="media-gallery">';
    if (isVideoProject && project.video_url) {
      let videoEmbedUrl = project.video_url;
      if (project.video_url.includes("youtube.com/watch?v=")) {
        const videoId = project.video_url.split("v=")[1].split("&")[0];
        videoEmbedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
      } else if (project.video_url.includes("youtu.be/")) {
        const videoId = project.video_url.split("/").pop().split("?")[0];
        videoEmbedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
      } else if (project.video_url.includes("vimeo.com/")) {
        const videoId = project.video_url.substring(project.video_url.lastIndexOf("/") + 1);
        videoEmbedUrl = `https://player.vimeo.com/video/${videoId}`;
      }
      mediaHTML += `
        <div class="media-item" id="video-container-${project.id}">
          <div id="video-placeholder-${project.id}" style="width: 100%; height: 360px; background: #000; display: flex; align-items: center; justify-content: center;">
            <span style="color: #fff;">Đang tải video...</span>
          </div>
          <p style="display: none; color: #000000;" id="video-error-${project.id}">${currentLang === "vi" ? "Video không thể load do bị chặn. Vui lòng xem trực tiếp trên YouTube." : "Video cannot be loaded due to restrictions. Please view it directly on YouTube."}</p>
          <a href="${sanitizeHTML(project.video_url)}" target="_blank" class="cta-button" style="display: none;" id="video-link-${project.id}" aria-label="Xem video trên YouTube">${currentLang === "vi" ? "Xem trên YouTube" : "View on YouTube"}</a>
          <p>${sanitizeHTML(project.caption || "")}</p>
        </div>`;
      setTimeout(() => {
        const iframe = document.createElement('iframe');
        iframe.src = sanitizeHTML(videoEmbedUrl);
        iframe.frameborder = "0";
        iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
        iframe.allowFullscreen = true;
        iframe.loading = "lazy";
        iframe.style.width = "100%";
        iframe.style.height = "360px";
        iframe.id = `video-iframe-${project.id}`;
        iframe.title = sanitizeHTML(project.project_name || 'Video');
        iframe.onerror = () => handleVideoError(project.id, project.video_url, currentLang);
        const placeholder = document.getElementById(`video-placeholder-${project.id}`);
        if (placeholder) placeholder.replaceWith(iframe);
      }, 500);
    } else {
      (project.media || []).forEach(item => {
        if (item.type === "image") {
          const imageCount = (project.media || []).filter(i => i.type === "image").length;
          const isMultiple = imageCount > 1;
          const imageStyle = isMultiple
            ? "height: 250px; width: 100%; object-fit: cover;"
            : "width: 100%; height: auto;";
          mediaHTML += `
            <div class="media-item">
              <img class="zoomable-image" src="${sanitizeHTML(item.url || 'images/placeholder.jpg')}" alt="${sanitizeHTML(item.alt_text || 'Media')}"
                   style="border: 2px solid black; ${imageStyle}" loading="lazy" onerror="this.src='images/placeholder.jpg'">
              <p style="text-align: justify;">${sanitizeHTML(item.caption || "")}</p>
            </div>`;
        } else if (item.type === "video") {
          let videoEmbedUrl = item.url || "";
          if (item.url.includes("youtube.com/watch?v=")) {
            const videoId = item.url.split("v=")[1].split("&")[0];
            videoEmbedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
          } else if (item.url.includes("vimeo.com/")) {
            const videoId = item.url.substring(item.url.lastIndexOf("/") + 1);
            videoEmbedUrl = `https://player.vimeo.com/video/${videoId}`;
          }
          mediaHTML += `
            <div class="media-item" id="video-container-${item.url}">
              <div id="video-placeholder-${item.url}" style="width: 100%; height: 360px; background: #000; display: flex; align-items: center; justify-content: center;">
                <span style="color: #fff;">Đang tải video...</span>
              </div>
              <p style="display: none; color: #000000;" id="video-error-${item.url}">${currentLang === "vi" ? "Video không thể load. Vui lòng xem trực tiếp." : "Video cannot be loaded. Please view it directly."}</p>
              <a href="${sanitizeHTML(item.url)}" target="_blank" class="cta-button" style="display: none;" id="video-link-${item.url}" aria-label="Xem video">${currentLang === "vi" ? "Xem video" : "View video"}</a>
              <p>${sanitizeHTML(item.caption || "")}</p>
            </div>`;
          setTimeout(() => {
            const iframe = document.createElement('iframe');
            iframe.src = sanitizeHTML(videoEmbedUrl);
            iframe.frameborder = "0";
            iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
            iframe.allowFullscreen = true;
            iframe.loading = "lazy";
            iframe.style.width = "100%";
            iframe.style.height = "360px";
            iframe.id = `video-iframe-${item.url}`;
            iframe.title = sanitizeHTML(item.alt_text || 'Video');
            iframe.onerror = () => handleVideoError(item.url, item.url, currentLang);
            const placeholder = document.getElementById(`video-placeholder-${item.url}`);
            if (placeholder) placeholder.replaceWith(iframe);
          }, 500);
        }
      });
    }
    mediaHTML += "</div>";

    modalContent.innerHTML = `
      <h2>${sanitizeHTML(project.project_name || (currentLang === "vi" ? "Tên Dự Án" : "Project Name"))}</h2>
      <div class="project-meta">
        <span><strong>${sanitizeHTML(project.project_category_label || (currentLang === "vi" ? "Thể loại:" : "Category:"))}</strong> ${sanitizeHTML(project.project_category || (currentLang === "vi" ? "Thể loại" : "Category"))}</span><br>
        <span><strong>${sanitizeHTML(project.project_date_label || (currentLang === "vi" ? "Ngày:" : "Date:"))}</strong> ${sanitizeHTML(project.project_date || "")}</span>
        ${
          project.client_name
            ? `<span><strong>${sanitizeHTML(project.client_label || (currentLang === "vi" ? "Khách hàng:" : "Client:"))}</strong> ${sanitizeHTML(project.client_name)}</span>`
            : ""
        }
      </div>
      <div class="description-detailed">${sanitizeHTML(project.project_description_detailed || (currentLang === "vi" ? "Mô tả chi tiết" : "Detailed description"))}</div>
      ${
        project.tools_used && project.tools_used.length > 0
          ? `<p><strong>${sanitizeHTML(project.tools_label || (currentLang === "vi" ? "Công cụ sử dụng:" : "Tools Used:"))}</strong> ${project.tools_used.map(tool => sanitizeHTML(tool)).join(", ")}</p>`
          : ""
      }
      ${
        project.project_live_url
          ? `<p><a href="${sanitizeHTML(project.project_live_url)}" target="_blank" class="cta-button" aria-label="Xem dự án trực tiếp">${sanitizeHTML(project.view_live_label || (currentLang === "vi" ? "Xem trực tiếp" : "View Live"))}</a></p>`
          : ""
      }
      ${
        project.project_case_study_url
          ? `<p><a href="${sanitizeHTML(project.project_case_study_url)}" target="_blank" class="cta-button" aria-label="Xem case study">${sanitizeHTML(project.case_study_label || (currentLang === "vi" ? "Xem Case Study" : "View Case Study"))}</a></p>`
          : ""
      }
      <h3>${sanitizeHTML(project.media_title || (currentLang === "vi" ? "Hình Ảnh/Video Dự Án" : "Project Images/Videos"))}</h3>
      ${mediaHTML}`;
    modal.style.display = "block";
  }

  // Xử lý lỗi video
  function handleVideoError(videoId, videoUrl, lang) {
    const container = document.getElementById(`video-container-${videoId}`);
    const iframe = document.getElementById(`video-iframe-${videoId}`);
    const errorMsg = document.getElementById(`video-error-${videoId}`);
    const link = document.getElementById(`video-link-${videoId}`);
    if (iframe && errorMsg && link) {
      iframe.style.display = "none";
      errorMsg.style.display = "block";
      link.style.display = "block";
    }
  }

  // Đóng modal
  function closeModal() {
    const modal = document.getElementById("project-modal");
    if (!modal) return;
    modal.style.display = "none";
    const iframes = modal.querySelectorAll("iframe");
    iframes.forEach(iframe => {
      iframe.src = "";
    });
  }

  const closeButton = document.querySelector(".close-button");
  if (closeButton) {
    closeButton.onclick = () => {
      closeModal();
    };
  }

  window.onclick = event => {
    const modal = document.getElementById("project-modal");
    if (event.target === modal) {
      closeModal();
    }
  };

  // Cuộn mượt
  document.querySelectorAll('nav a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", e => {
      e.preventDefault();
      const targetId = anchor.getAttribute("href");
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth" });
      }
    });
  });

  // Hamburger menu
  const hamburger = document.getElementById("hamburger");
  const navUl = document.querySelector("nav ul");
  if (hamburger && navUl) {
    hamburger.addEventListener("click", () => {
      navUl.classList.toggle("active");
      console.log("Đã bật/tắt menu hamburger");
    });
  }

  // Zoom ảnh
  const overlay = document.getElementById("imageOverlay");
  const overlayImage = document.getElementById("overlayImage");
  document.body.addEventListener("click", e => {
    if (e.target.classList.contains("zoomable-image")) {
      overlayImage.src = e.target.src;
      overlay.style.display = "flex";
    } else if (e.target === overlay || e.target === overlayImage) {
      overlay.style.display = "none";
    }
  });

  // Xử lý cờ ngôn ngữ
  const langVi = document.getElementById("lang-vi");
  const langEn = document.getElementById("lang-en");
  if (langVi && langEn) {
    [langVi, langEn].forEach(el => {
      el.addEventListener("pointerdown", e => {
        e.preventDefault();
        e.stopPropagation();
        const lang = el.id === "lang-vi" ? "vi" : "en";
        setLanguage(lang);
      }, { passive: false });
      el.addEventListener("touchstart", e => {
        e.preventDefault();
        e.stopPropagation();
        const lang = el.id === "lang-vi" ? "vi" : "en";
        setLanguage(lang);
      }, { passive: false });
    });
  } else {
    console.error("Không tìm thấy phần tử biểu tượng ngôn ngữ!");
  }

  // Chặn chuột phải
  document.addEventListener("contextmenu", function(e) {
    e.preventDefault();
  });

  // Chặn F12, Ctrl+Shift+I, Ctrl+U, Ctrl+S
  document.addEventListener("keydown", function(e) {
    if (e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J")) ||
        (e.ctrlKey && (e.key === "U" || e.key === "S"))) {
      e.preventDefault();
    }
  });

  // Ngăn kéo thả ảnh
  document.querySelectorAll('img').forEach(img => {
    img.addEventListener('dragstart', e => e.preventDefault());
  });

  // Áp dụng loading="lazy" cho tất cả ảnh
  document.querySelectorAll('img').forEach(img => {
    if (!img.hasAttribute('loading')) {
      img.setAttribute('loading', 'lazy');
    }
  });

  // Ngăn in trang
  window.onbeforeprint = function() {
    return false;
  };

  // Khởi tạo
  loadAll();
});
