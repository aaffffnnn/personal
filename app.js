document.addEventListener("DOMContentLoaded", () => {

    // 1. Safe parse to avoid JSON errors
    function safeParse(key, fallback) {
        try {
            const val = localStorage.getItem(key);
            if (!val || val === "null" || val === "undefined") throw "bad";
            return JSON.parse(val);
        } catch {
            return fallback;
        }
    }

    // 2. Constants and state
    const ALL = "__ALL__";
    let folders = safeParse("folders", []);
    let photos = safeParse("photos", []);
    let notes = safeParse("notes", {});
    let liked = safeParse("liked", []);
    let selectedFolder = localStorage.getItem("sel") || ALL;
    if (selectedFolder !== ALL && !folders.includes(selectedFolder)) selectedFolder = ALL;

    // 3. DOM selectors
    const $ = s => document.querySelector(s);
    const foldersDiv = $("#folders"),
        photosDiv = $("#photos"),
        emptyDiv = $("#empty"),
        backBtn = $("#back-arrow"),
        likeBtn = $("#like-filter-btn"),
        photoUploadInput = $("#photo-upload"),
        fabFolderBtn = $("#fab-folder"),
        sendMsgBtn = $("#send-msg-btn");
        const navBtns = [
            document.querySelector('.tab-home'),
            document.querySelector('.tab-voice'),
            document.querySelector('.tab-chat'),
            document.querySelector('.tab-calendar')
        ].filter(Boolean);
        
        const pages = [
            document.getElementById('page-home'),
            document.getElementById('page-voice'),
            document.getElementById('page-chat'),
            document.getElementById('page-calendar')
        ];
        

    const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
    const keyOf = p => `${p.data}|${p.folder}|${p.caption}`;

    // 4. Folder & photo rendering
    function drawFolders() {
        foldersDiv.innerHTML = "";
        addFolderCard("All Photos", ALL);
        folders.forEach(f => addFolderCard(f, f));
        backBtn.classList.toggle("hide", selectedFolder === ALL);
    }
    function addFolderCard(label, id) {
        const div = document.createElement("div");
        div.className = `folder${id === selectedFolder ? " selected" : ""}`;
        div.dataset.name = id;
        if (id !== ALL) {
            const delBtn = document.createElement("button");
            delBtn.className = "del";
            delBtn.textContent = "✕";
            div.appendChild(delBtn);
        }
        const cover = photos.find(p => p.folder === id);
        if (cover) {
            const img = new Image();
            img.src = cover.data;
            img.className = "folder-cover";
            div.appendChild(img);
        }
        div.append(label);
        foldersDiv.appendChild(div);
    }

    let showLikedOnly = false;
    function drawPhotos() {
        photosDiv.innerHTML = "";
        let filtered = selectedFolder === ALL ? photos : photos.filter(p => p.folder === selectedFolder);
        if (showLikedOnly) filtered = filtered.filter(p => liked.includes(keyOf(p)));
        emptyDiv.classList.toggle("hide", filtered.length > 0);
        filtered.forEach(p => {
            const idx = photos.indexOf(p);
            const noteText = notes[keyOf(p)];
            const isLiked = liked.includes(keyOf(p));
            const card = document.createElement("div");
            card.className = "photo-card";
            card.dataset.idx = idx;
            card.innerHTML = `
          <div class="tiny-toolbar">
            <button class="note" title="Add / Edit note">📝</button>
            <button class="view-img" title="Full view">🔍</button>
            <button class="delete" title="Delete">✕</button>
          </div>
          <img class="resp-img" src="${p.data}">
          <button class="like${isLiked ? " liked" : ""}" title="Like">❤</button>
          ${noteText ? `<div class="note-cloud">${noteText}</div>` : ""}
        `;
            photosDiv.appendChild(card);
        });
    }

    // 5. Events
    foldersDiv.onclick = e => {
        const delBtn = e.target.closest(".del");
        if (delBtn) {
            e.stopPropagation();
            const name = delBtn.parentElement.dataset.name;
            if (confirm(`Delete folder “${name}” and all its photos?`)) {
                photos = photos.filter(p => p.folder !== name);
                folders = folders.filter(f => f !== name);
                selectedFolder = ALL;
                save("photos", photos);
                save("folders", folders);
                save("sel", selectedFolder);
                drawFolders();
                drawPhotos();
            }
            return;
        }
        const folderCard = e.target.closest(".folder");
        if (folderCard) {
            selectedFolder = folderCard.dataset.name;
            save("sel", selectedFolder);
            drawFolders();
            drawPhotos();
        }
    };

    photosDiv.onclick = e => {
        const btn = e.target.closest("button");
        if (!btn) return;
        const card = btn.closest(".photo-card");
        if (!card) return;
        const p = photos[Number(card.dataset.idx)];
        if (btn.classList.contains("note")) openNoteModal(p);
        else if (btn.classList.contains("view-img")) openImageModal(p.data);
        else if (btn.classList.contains("delete")) {
            if (confirm("Delete this photo?")) {
                photos.splice(photos.indexOf(p), 1);
                save("photos", photos);
                drawFolders();
                drawPhotos();
            }
        } else if (btn.classList.contains("like")) {
            const k = keyOf(p), i = liked.indexOf(k);
            if (i > -1) liked.splice(i, 1); else liked.push(k);
            save("liked", liked);
            drawPhotos();
        }
    };

    likeBtn.onclick = () => {
        showLikedOnly = !showLikedOnly;
        likeBtn.style.transform = showLikedOnly ? "scale(1.15) rotate(-8deg)" : "";
        drawPhotos();
    };

    function openNoteModal(p) {
        const current = notes[keyOf(p)] || "";
        const bg = document.createElement("div");
        Object.assign(bg.style, {
            position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 222
        });
        const modal = document.createElement("div");
        modal.style.cssText = `
        background: linear-gradient(135deg, #f9d3e3ee 0%, #b5f3ffee 100%);
        padding: 1.8rem 2rem; border-radius: 28px; max-width: 320px;
        width: 90vw; box-shadow: 0 8px 48px #ffb3d1cc;
      `;
        modal.innerHTML = `
        <h3 style="font-family:Pacifico,cursive;color:#ff4f8b;margin-bottom:1rem;text-align:center;">Add / Edit Note</h3>
        <textarea rows="5" style="width:100%;padding:0.7rem 1rem;border-radius:16px;border:1px solid #ffb3d1aa;resize:none;font-size:1rem;box-sizing:border-box;">${current}</textarea>
        <div style="margin-top:1rem;text-align:right;">
          <button id="cancelBtn" style="background:#eee;border:none;border-radius:24px;padding:0.5rem 1.3rem;color:#ff4f8b;font-weight:bold;cursor:pointer;">Cancel</button>
          <button id="saveBtn" style="background:linear-gradient(90deg,#ff4f8b,#6be7ff);border:none;border-radius:24px;padding:0.5rem 1.3rem;color:#fff;font-weight:bold;cursor:pointer;">Save</button>
        </div>`;
        bg.appendChild(modal);
        document.body.appendChild(bg);
        const textarea = modal.querySelector("textarea");
        textarea.focus();
        bg.onclick = e => { if (e.target === bg) bg.remove(); };
        modal.querySelector("#cancelBtn").onclick = () => bg.remove();
        modal.querySelector("#saveBtn").onclick = () => {
            const val = textarea.value.trim();
            if (val) notes[keyOf(p)] = val; else delete notes[keyOf(p)];
            save("notes", notes); drawPhotos(); bg.remove();
        };
    }

    function openImageModal(src) {
        const bg = document.createElement("div");
        Object.assign(bg.style, {
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 299
        });
        bg.innerHTML = `<img src="${src}" style="max-width: 95vw; max-height: 92vh; border-radius: 16px; box-shadow: 0 6px 42px #ffb3d1ee;">
        <button id="closeImgBtn" style="position:absolute; top: 20px; right: 20px; font-size:2rem; background:none; border:none; color: #fff; cursor:pointer;">✕</button>`;
        document.body.appendChild(bg);
        bg.querySelector("#closeImgBtn").onclick = () => bg.remove();
        bg.onclick = e => { if (e.target === bg) bg.remove(); };
    }

    fabFolderBtn.onclick = () => {
        const name = prompt("Name for new folder:");
        if (!name) return;
        if (folders.includes(name)) return alert("That folder already exists.");
        folders.push(name);
        save("folders", folders);
        drawFolders();
    };

    photoUploadInput.addEventListener("change", e => {
        [...e.target.files].forEach(f => {
            const r = new FileReader();
            r.onload = ev => {
                photos.push({
                    data: ev.target.result,
                    folder: selectedFolder !== ALL ? selectedFolder : null,
                    caption: f.name
                });
                save("photos", photos);
                drawFolders();
                drawPhotos();
            };
            r.readAsDataURL(f);
        });
        e.target.value = "";
    });

    // Tab navigation

    navBtns.forEach((btn, i) => {
        btn.onclick = () => showTab(i);
      });
      
      // On page load, try to restore previously selected tab
      const savedIndex = parseInt(localStorage.getItem("selectedTabIndex"));
      if (!isNaN(savedIndex) && savedIndex >= 0 && savedIndex < navBtns.length) {
        showTab(savedIndex);
      } else {
        showTab(0); // Default to Home (Photos) tab
      }
      

    // Improved showTab function with persistence
    function showTab(index) {
        console.log("Showing tab index:", index);
        if (index < 0 || index >= navBtns.length) {
          console.warn("Invalid tab index:", index);
          return;
        }
      
        navBtns.forEach((btn, i) => btn.classList.toggle("selected", i === index));
        pages.forEach((page, i) => {
          if (!page) {
            console.warn("No page element at index", i);
            return;
          }
          if (i === index) {
            page.style.display = "";      // Show current
            page.classList.add("show");
            setTimeout(() => page.classList.remove("show"), 800);
            if (i === 0) {
              drawFolders();
              drawPhotos();
            }
          } else {
            page.style.display = "none";  // Hide the rest
          }
        });
      
        localStorage.setItem("selectedTabIndex", index);
      }
      


    // function activateTab(targetId) {
    //     console.log("Activating tab:", targetId);
    //     clearActive();
    //     const section = document.getElementById(targetId);
    //     if (section) {
    //       section.classList.add('show');
    //     } else {
    //       console.warn("No section found with id:", targetId);
    //     }
    //     tab.classList.add('selected');
    //     } else {
    //       console.warn("No tab button found with data-target:", targetId);
    //     }
    //   }
      

    // backBtn.onclick = () => {
    //     selectedFolder = ALL;
    //     save("sel", selectedFolder);
    //     drawFolders();
    //     drawPhotos();
    // };

    // Love note EmailJS modal
    if (sendMsgBtn) {
        sendMsgBtn.onclick = function () {
            const html = `
            <div class="love-modal">
              <button id="close">&times;</button>
              <div class="love-modal-header">💖 <span>Send a Love Note</span></div>
              <form id="loveForm">
                <select id="to">
                  <option value="affannawaz4477@gmail.com">📨 to Gehad</option>
                  <option value="iqrajaanchoudhary@gmail.com">💌 to Gundi</option>
                </select>
                <input type="text" id="yourName" placeholder="Apna pyara naam likho">
                <input type="email" id="yourEmail" placeholder="Email id bhi likhdo zara si">
                <textarea id="msg" rows="5" placeholder="Write your affectionate note here…Sharmana nai hai zara bhi"></textarea>
                <button id="send" type="submit" class="pill">Send ✈️</button>
              </form>
            </div>
          `;

            // Create the background overlay
            const bg = document.createElement("div");
            bg.className = "love-modal-bg";
            bg.innerHTML = html;
            document.body.appendChild(bg);

            // Close modal on ✕ button
            bg.querySelector("#close").onclick = () => bg.remove();

            // Close modal when clicking outside the card
            bg.onclick = e => { if (e.target === bg) bg.remove(); };

            // Handle form submission
            bg.querySelector("#loveForm").onsubmit = function (e) {
                e.preventDefault();
                const to = bg.querySelector("#to").value;
                const note = bg.querySelector("#msg").value.trim();
                const yourName = bg.querySelector("#yourName").value.trim();
                const yourEmail = bg.querySelector("#yourEmail").value.trim();
                if (!note) {
                    alert("Write a message first 💕");
                    return;
                }
                // Insert your EmailJS call here

                emailjs.send("service_wo4cxk7", "template_ny9gdxi", {
                    to_email: to,
                    note: note,
                    your_name: yourName,
                    your_email: yourEmail
                }).then(() => {
                    alert("Sent with love! 💖");
                    bg.remove();
                }).catch(() => alert("Oops, failed to send."));

                alert("This would be sent by EmailJS!\n\nTo: " + to + "\nMessage: " + note + "\nFrom: " + yourName + " (" + yourEmail + ")");
                bg.remove();
            };
        };
    }

    // Mood switcher
    const moodBtns = [
        document.querySelector(".mood-love"),
        document.querySelector(".mood-night"),
        document.querySelector(".mood-sunny"),
    ];
    const moodMap = ["love", "night", "sunny"];
    function setMood(mood) {
        document.body.classList.remove("love", "night", "sunny");
        document.body.classList.add(mood);
        localStorage.setItem("moodMode", mood);
        moodBtns.forEach((btn, i) =>
            btn && btn.classList.toggle("selected", moodMap[i] === mood)
        );
    }
    const userMood = localStorage.getItem("moodMode") || "love";
    setMood(userMood);
    moodBtns.forEach((btn, i) => {
        if (btn) btn.onclick = () => {
            setMood(moodMap[i]);
            location.reload();
        };
    });

    // --- Cute Lovable Discord Mini Chat App ---
    const chatForm = document.getElementById("chat-form");
    const chatMessages = document.getElementById("chat-messages");
    const chatInput = document.getElementById("chat-input");

    // Store last 50 messages only (local only)
    function getChatMsgs() {
        return JSON.parse(localStorage.getItem("lovechat") || "[]");
    }
    function saveChatMsgs(msgs) {
        localStorage.setItem("lovechat", JSON.stringify(msgs.slice(-50)));
    }
    function renderChatMsgs() {
        const msgs = getChatMsgs();
        chatMessages.innerHTML = "";
        msgs.forEach(msg => {
            const row = document.createElement("div");
            row.className = "message-row" + (msg.me ? " me" : "");
            const bubble = document.createElement("div");
            bubble.className = msg.me ? "my-message" : "their-message";
            bubble.textContent = msg.text;
            const time = document.createElement("div");
            time.className = "message-time";
            time.textContent = msg.time;
            row.append(bubble, time);
            chatMessages.appendChild(row);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight + 300;
    }
    // Initial render
    if (chatMessages) renderChatMsgs();

    // Send chat message (simulate sender/receiver for demo)
    if (chatForm) chatForm.onsubmit = function (e) {
        e.preventDefault();
        const text = chatInput.value.trim();
        if (!text) return;
        const now = new Date();
        const msgs = getChatMsgs();
        // Demo: alternate sender/receiver if needed
        const isMe = (msgs.length === 0) || (msgs[msgs.length - 1].me === false);
        msgs.push({
            text,
            time: now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0'),
            me: isMe
        });
        saveChatMsgs(msgs);
        renderChatMsgs();
        chatInput.value = "";
    };

    


});
// --- Chat Section with long-press delete ---

function getChatMsgs() {
    return JSON.parse(localStorage.getItem("lovechat") || "[]");
  }
  function saveChatMsgs(msgs) {
    localStorage.setItem("lovechat", JSON.stringify(msgs.slice(-50)));
  }
  
  function renderChatMsgs() {
    const chatForm = document.getElementById("chat-form");
    const chatMessages = document.getElementById("chat-messages");
    if (!chatMessages) return;
    const msgs = getChatMsgs();
    chatMessages.innerHTML = "";
    msgs.forEach((msg, index) => {
      const row = document.createElement("div");
      row.className = "message-row";
      const bubble = document.createElement("div");
      bubble.className = "my-message";
      bubble.textContent = msg.text;
      // Time
      const time = document.createElement("div");
      time.className = "message-time";
      time.textContent = msg.time;
      // Universal robust long-press, both desktop and mobile:
      let pressTimer = null, pointerDown = false;
      function tryDelete() {
        pointerDown = false;
        if (confirm("Delete this message?")) {
          msgs.splice(index, 1);
          saveChatMsgs(msgs);
          renderChatMsgs();
        }
      }
      // Desktop
      bubble.addEventListener("mousedown", () => {
        pointerDown = true;
        pressTimer = setTimeout(() => { if (pointerDown) tryDelete(); }, 600);
      });
      bubble.addEventListener("mouseup", () => { pointerDown = false; clearTimeout(pressTimer); });
      bubble.addEventListener("mouseleave", () => { pointerDown = false; clearTimeout(pressTimer); });
      bubble.addEventListener("contextmenu", e => e.preventDefault());
      // Touch
      bubble.addEventListener("touchstart", () => {
        pointerDown = true;
        pressTimer = setTimeout(() => { if (pointerDown) tryDelete(); }, 600);
      });
      bubble.addEventListener("touchend", () => { pointerDown = false; clearTimeout(pressTimer); });
      bubble.addEventListener("touchmove", () => { pointerDown = false; clearTimeout(pressTimer); });
      row.append(bubble, time);
      chatMessages.appendChild(row);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight + 300;
  }
  
  // Initial render after DOM loads
  if(document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", renderChatMsgs);
  } else {
    renderChatMsgs();
  }
  
  // Chat form submit (put after renderChatMsgs but before mood logic)
  const chatFormElm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  if(chatFormElm && chatInput) {
    chatFormElm.onsubmit = function(e){
      e.preventDefault();
      const text = chatInput.value.trim();
      if(!text) return;
      const now = new Date();
      const msgs = getChatMsgs();
      msgs.push({
        text,
        time: now.getHours().toString().padStart(2,'0') + ":" + now.getMinutes().toString().padStart(2,'0')
      });
      saveChatMsgs(msgs);
      renderChatMsgs();
      chatInput.value = "";
    };
  }
  
  // Mood switcher - do not move, only adjust if needed
  function updateChatMoodBg(mood) {
    const chatCont = document.querySelector(".chat-container");
    if (!chatCont) return;
    if (mood === "love")
      chatCont.style.background = "linear-gradient(120deg, #ffd1eb 70%, #b5f3ff 100%)";
    else if (mood === "night")
      chatCont.style.background = "linear-gradient(120deg, #342b5c, #1d1a3d 90%)";
    else if (mood === "sunny")
      chatCont.style.background = "linear-gradient(120deg, #fff59d 0%, #ffd6ea 100%)";
  }
  const moodBtns = [
    document.querySelector(".mood-love"),
    document.querySelector(".mood-night"),
    document.querySelector(".mood-sunny")
  ];
  const moodMap = ["love", "night", "sunny"];
  function setMood(mood) {
    document.body.classList.remove("love", "night", "sunny");
    document.body.classList.add(mood);
    localStorage.setItem("moodMode", mood);
    updateChatMoodBg(mood);
    moodBtns.forEach((btn, i) =>
      btn && btn.classList.toggle("selected", moodMap[i] === mood)
    );
  }
  const userMood = localStorage.getItem("moodMode") || "love";
  setMood(userMood);
  moodBtns.forEach((btn, i) => {
    if (btn) btn.onclick = () => {
      setMood(moodMap[i]);
      location.reload();
    };
  });
  

  // Calendar Section
  function getCalMemories() {
    return JSON.parse(localStorage.getItem("calMemories") || "{}");
  }
  function setCalMemories(memories) {
    localStorage.setItem("calMemories", JSON.stringify(memories));
  }
  
  // --- Calendar rendering ---
  function renderCalendar(selectedDate = null) {
    const cal = document.getElementById('calendar');
    if (!cal) return;
    const today = new Date();
    const dateObj = selectedDate ? new Date(selectedDate) : new Date(today.getFullYear(), today.getMonth());
    const month = dateObj.getMonth();
    const year = dateObj.getFullYear();
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const monthNames = ["January", "February", "March","April","May","June","July","August","September","October","November","December"];
    const memories = getCalMemories();
  
    cal.innerHTML = '';
    // Header with prev/next
    let header = document.createElement('div');
    header.className = 'calendar-header';
    header.style.gridColumn = "span 7";
    header.innerHTML = `<button id="prev-month" style="background:none;border:none;font-size:1.25em;cursor:pointer;color:#885cff">&#8592;</button>
       ${monthNames[month]} ${year}
      <button id="next-month" style="background:none;border:none;font-size:1.25em;cursor:pointer;color:#885cff">&#8594;</button>`;
    cal.appendChild(header);
    // Weekday names
    for (const d of days) {
      let dayCell = document.createElement('div');
      dayCell.className = 'calendar-header';
      dayCell.textContent = d;
      cal.appendChild(dayCell);
    }
    // Where month starts
    let startDay = new Date(year, month, 1).getDay();
    let daysInMonth = 32 - new Date(year, month, 32).getDate();
    for (let i = 0; i < startDay; ++i) {
      let empty = document.createElement('div');
      empty.className = 'calendar-day';
      cal.appendChild(empty);
    }
    // Each date cell
    for (let date = 1; date <= daysInMonth; ++date) {
      let cell = document.createElement('div');
      cell.className = 'calendar-date';
      let isoDate = new Date(year, month, date).toISOString().split('T')[0];
      cell.dataset.date = isoDate;
      cell.textContent = date;
      // Today highlight
      if (
        year === today.getFullYear() &&
        month === today.getMonth() &&
        date === today.getDate()
      ) cell.classList.add("today");
      // Notes
      if (memories[isoDate]) cell.classList.add("has-note");
      // Selected
      if (selectedDate === isoDate) cell.classList.add("selected");
      cell.onclick = () => showCalendarNoteModal(isoDate);
      cal.appendChild(cell);
    }
    // Prev/next controls
    document.getElementById('prev-month').onclick = () => {
      const prev = new Date(year, month - 1, 1);
      renderCalendar(prev.toISOString().split("T")[0]);
      renderCalMemories(null);
    };
    document.getElementById('next-month').onclick = () => {
      const next = new Date(year, month + 1, 1);
      renderCalendar(next.toISOString().split("T")[0]);
      renderCalMemories(null);
    };
  }
  
  // --- Popup modal logic for adding/editing note ---
  function showCalendarNoteModal(date) {
    const modal = document.getElementById("calendar-note-modal");
    const label = document.getElementById("cal-modal-label");
    const textarea = document.getElementById("cal-modal-text");
    const saveBtn = document.getElementById("save-cal-modal");
    const closeBtn = document.getElementById("close-cal-modal");
    const memories = getCalMemories();
  
    label.textContent = "Memory for " + date;
    textarea.value = memories[date] || "";
    modal.classList.remove("hide");
    textarea.focus();
    closeBtn.onclick = () => modal.classList.add("hide");
    saveBtn.onclick = () => {
      let note = textarea.value.trim();
      if (note) {
        memories[date] = note;
      } else {
        delete memories[date];
      }
      setCalMemories(memories);
      modal.classList.add("hide");
      renderCalendar(date);
      renderCalMemories(date);
    };
  }
  
  // --- Memories rendering below ---
  function renderCalMemories(selectedDate = null) {
    const memDiv = document.getElementById('calendar-memories');
    if (!memDiv) return;
    const memories = getCalMemories();
    memDiv.innerHTML = '';
    let entries = Object.keys(memories);
    // Show this date’s note if in focus, else all (latest first)
    if (selectedDate && memories[selectedDate]) entries = [selectedDate];
    else entries = entries.sort().reverse();
  
    if (entries.length === 0) {
      memDiv.innerHTML = `<span style="color:#ed3a7a;font-size:1.1em;">No calendar notes yet. Make your first memory!</span>`;
      return;
    }
  
    for (const d of entries) {
      const box = document.createElement('div');
      box.className = 'memory-box';
      box.innerHTML = `<span class="memory-date">${d}</span>
        <span>${memories[d]}</span>
        <button class="del-mem" title="Delete">&#10006;</button>`;
      box.querySelector('.del-mem').onclick = () => {
        delete memories[d];
        setCalMemories(memories);
        renderCalMemories();
        renderCalendar(selectedDate);
      };
      memDiv.appendChild(box);
    }
  }
  
  // --- Initialization on page ready ---
  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", function() {
      renderCalendar();
      renderCalMemories();
    });
  } else {
    renderCalendar();
    renderCalMemories();
  }
  
  function activateTab(targetId) {
    console.log("Activating tab:", targetId);
    clearActive();
    const section = document.getElementById(targetId);
    if (section) {
      section.classList.add('show');
    } else {
      console.warn("No section found with id:", targetId);
    }
    const tab = document.querySelector(`[data-target="${targetId}"]`);
    if (tab) {
      tab.classList.add('selected');
    } else {
      console.warn("No tab button found with data-target:", targetId);
    }

  

backBtn.onclick = () => {
    selectedFolder = ALL;
    save("sel", selectedFolder);
    drawFolders();
    drawPhotos();
}
  }

