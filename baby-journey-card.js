const DAY_MS = 86400000;
const WEEK_INSIGHTS = [
  "Pregnancy dating begins with the first day of the last menstrual period, before conception.",
  "Ovulation and fertilisation usually occur near the end of this week in a typical cycle.",
  "The fertilised egg divides, travels toward the uterus and may begin implantation.",
  "The developing baby is extremely small as rapidly dividing cells start forming body systems.",
  "The neural tube is developing; it will become the brain and spinal cord.",
  "The embryo is about 3 mm long and pregnancy hormones are increasing.",
  "The heart is beating while the placenta and amniotic sac continue developing.",
  "The embryo is about 1.3 cm long; the head and spinal cord are growing rapidly.",
  "Eyes, mouth and tongue are forming, muscles begin moving and the liver makes blood cells.",
  "Now called a fetus, the baby is about 2.5 cm long; organs are formed and fingers and toes emerge.",
  "Tooth buds are forming beneath the gums and the tiny heart continues developing.",
  "Fingers and toes are recognisable; first-trimester screening may be offered around this time.",
  "The second trimester begins; the fetus is over 7 cm and moving vigorously.",
  "Eyes are developed beneath closed lids; vocal cords, nails and thumb-sucking movements develop.",
  "Growth continues quickly and the face, limbs and movements become more defined.",
  "The fetus is about 14 cm long; eyelashes, eyebrows and taste buds have appeared.",
  "Bones and muscles strengthen, and some people may soon notice early movements.",
  "The morphology ultrasound period begins, checking anatomy, placenta position and multiple pregnancy.",
  "Hearing and movement continue developing; fetal hiccups may sometimes be seen on ultrasound.",
  "About 21 cm long, the fetus can hear muffled sounds and has fingerprints; anatomy may be visible on ultrasound.",
  "Movements are often easier to recognise as growth and sensory development continue.",
  "Body systems mature and the baby becomes more responsive to sound and movement.",
  "The baby practises breathing movements while the lungs continue developing.",
  "About 33 cm long, the eyes can open and close; lanugo and vernix protect the skin.",
  "Rapid growth continues; gestational diabetes screening is commonly offered between weeks 24 and 28.",
  "The lungs, nervous system and senses continue maturing as weight increases.",
  "The second trimester ends with rapid brain growth and stronger, more coordinated movement.",
  "The third trimester begins; the baby weighs about 1 kg and looks more proportionate.",
  "Fat stores build and the baby responds increasingly to light, sound and movement.",
  "The brain and lungs mature rapidly while movements may feel stronger.",
  "Steady weight gain continues and the baby regularly practises breathing.",
  "The baby sleeps much of the time; movements are strong and a head-down position may develop.",
  "Bones are formed but remain flexible, while the lungs and immune system continue maturing.",
  "There is less room for movement, but the usual pattern of movement should continue.",
  "The baby continues gaining weight and may move lower in preparation for birth.",
  "About 46 cm long, the baby may settle head-down in the pelvis while lung development accelerates.",
  "The full-term window begins; development is largely complete and weight gain continues.",
  "The baby continues preparing for birth while the brain, lungs and nervous system mature.",
  "Most organs are ready for life outside the womb and the baby continues gaining weight.",
  "Around 51 cm long, the baby is ready to be born near the estimated due date.",
  "Pregnancy can normally continue beyond the due date with monitoring from the maternity care team.",
  "Birth through this week can still fall within the recognised term window.",
];

class BabyJourneyCard extends HTMLElement {
  setConfig(config) {
    if (!config.lmp_entity) throw new Error("Baby Journey Card requires lmp_entity");
    this.config = {
      weeks_visible_min: 4,
      weeks_visible_max: 6,
      max_week: 41,
      offset_entity: "input_number.baby_calendar_week_offset",
      calendar_entity: "calendar.calendar",
      theme_entity: "input_select.baby_journey_theme",
      ...config,
    };
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
  }

  set hass(hass) {
    this._hass = hass;
    const active = this.shadowRoot?.activeElement;
    if (active?.matches("select,input,textarea") || this.shadowRoot?.querySelector(".appointment-modal")) {
      this._renderPending = true;
      return;
    }
    this.render();
    const lmp = this.parseDate(hass.states[this.config?.lmp_entity]?.state);
    if (lmp) this.loadAppointments(lmp);
  }

  getCardSize() {
    return 8;
  }

  static getStubConfig() {
    return { lmp_entity: "input_datetime.baby_lmp_date" };
  }

  parseDate(value) {
    if (!value || ["unknown", "unavailable"].includes(value)) return null;
    const date = new Date(`${value.slice(0, 10)}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  dateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  format(date, options) {
    return new Intl.DateTimeFormat(undefined, options).format(date);
  }

  trimesterForWeek(week) {
    if (week <= 12) return 1;
    if (week <= 27) return 2;
    return 3;
  }

  insightForWeek(week) {
    return WEEK_INSIGHTS[Math.max(0, Math.min(WEEK_INSIGHTS.length - 1, week - 1))];
  }

  escape(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  render() {
    if (!this._hass || !this.config || !this.shadowRoot) return;
    const lmpState = this._hass.states[this.config.lmp_entity];
    const lmp = this.parseDate(lmpState?.state);
    if (!lmp) {
      this.shadowRoot.innerHTML = `<ha-card><div class="error">Set a valid date in ${this.escape(this.config.lmp_entity)}.</div></ha-card>`;
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Math.max(0, Math.floor((today - lmp) / DAY_MS));
    const completedWeeks = Math.floor(days / 7);
    const currentWeek = completedWeeks + 1;
    const progress = Math.min(100, (days / 280) * 100);
    const dueDate = this.addDays(lmp, 280);
    const offsetState = this._hass.states[this.config.offset_entity];
    const offset = Number(offsetState?.state || 0);
    const minOffset = Number(offsetState?.attributes?.min ?? -40);
    const maxOffset = Math.max(0, (this.config.max_week - 2) - completedWeeks);
    const events = this._events || [];
    const appointmentDates = new Set(events.map((event) => String(event.start || "").slice(0, 10)));
    const now = new Date();
    const isUpcoming = (event) => new Date(event.end || event.start) >= now;
    const upcomingEvents = events.filter(isUpcoming);
    const pastEvents = events.filter((event) => !isUpcoming(event)).reverse();
    const themeState = this._hass.states[this.config.theme_entity]?.state || "Pink";
    const theme = themeState === "Blue" ? "blue" : "pink";
    const appointmentRows = (items, past = false) => items.length ? items.map((event) => {
      const start = new Date(event.start);
      const timed = String(event.start || "").includes("T");
      const time = timed ? this.format(start, { weekday: "short", hour: "numeric", minute: "2-digit" }) : "All day";
      const note = String(event.description || "").trim();
      const index = events.indexOf(event);
      return `
        <button class="appt-row${past ? " past" : ""}" data-event-index="${index}" title="Edit or delete ${this.escape(event.summary)}">
          <span class="appt-date">
            <span class="appt-day">${this.format(start, { day: "2-digit" })}</span>
            <span class="appt-month">${this.format(start, { month: "short" })}</span>
          </span>
          <span class="appt-info">
            <span class="appt-name">${this.escape(event.summary)}</span>
            <span class="appt-meta">
              <span class="appt-time">${this.escape(time)}</span>
              ${note ? `<span class="appt-note">${this.escape(note)}</span>` : ""}
              ${event.location ? `<span class="appt-location">· ${this.escape(event.location)}</span>` : ""}
            </span>
          </span>
        </button>`;
    }).join("") : `
      <div class="appt-empty">
        <ha-icon icon="mdi:calendar-heart"></ha-icon>
        <span>${past ? "No past appointments." : "No upcoming appointments."}</span>
      </div>`;

    const weeksVisible = Math.max(
      this.config.weeks_visible_min,
      this.config.weeks_visible_max
    );
    const weeks = Array.from({ length: weeksVisible }, (_, index) => {
      const shownOffset = offset + index - 1;
      const start = this.addDays(lmp, (completedWeeks + shownOffset) * 7);
      const weekNumber = currentWeek + shownOffset;
      const end = this.addDays(start, 6);
      const isCurrent = shownOffset === 0;
      const isDue = start <= dueDate && dueDate <= end;
      const names = Array.from({ length: 7 }, (_, day) =>
        `<span class="day-name">${this.format(this.addDays(start, day), { weekday: "short" })}</span>`
      ).join("");
      const dates = Array.from({ length: 7 }, (_, day) => {
        const date = this.addDays(start, day);
        const key = this.dateKey(date);
        const classes = [
          "day-num",
          key === this.dateKey(today) ? "today" : "",
          appointmentDates.has(key) ? "appointment" : "",
        ].filter(Boolean).join(" ");
        return `<button class="${classes}" data-date="${key}" title="Add appointment on ${this.escape(this.format(date, { dateStyle: "long" }))}">${date.getDate()}</button>`;
      }).join("");
      return `
        <section class="week ${isCurrent ? "current" : ""} ${isDue ? "due" : ""}">
          <div class="week-head">
            <span class="week-name">Week ${weekNumber}${isCurrent ? " - Current" : ""}${isDue ? '<span class="due-label">Due Week</span>' : ""}</span>
            <span class="week-range">${this.format(start, { day: "2-digit", month: "short" })} - ${this.format(end, { day: "2-digit", month: "short", year: "numeric" })}</span>
          </div>
          <div class="day-grid">${names}${dates}</div>
          <div class="week-insight">
            <ha-icon icon="mdi:information-outline"></ha-icon>
            <span>${this.escape(this.insightForWeek(weekNumber))}</span>
          </div>
        </section>`;
    }).join("");

    this.shadowRoot.innerHTML = `
      <style>${this.styles()}</style>
      <ha-card>
        <div class="wrap theme-${theme}">
          <div class="summary">
            <div class="primary" style="--progress:${progress}%">
              <button class="print-journey" type="button" aria-label="Print or save PDF" title="Print / Save PDF">
                <ha-icon icon="mdi:printer-outline"></ha-icon>
              </button>
              <div class="eyebrow">Gestational Age</div>
              <div class="age">${completedWeeks}w ${days % 7}d <span>completed</span></div>
              <div class="progress">${progress.toFixed(1)}%</div>
            </div>
            <div class="stat">
              <div class="label">Pregnancy Week</div>
              <div class="value">Week ${currentWeek}</div>
            </div>
            <button class="stat due-jump" title="Jump to due-date week">
              <div class="label">Estimated Due Date</div>
              <div class="value">${this.format(dueDate, { day: "2-digit", month: "short", year: "numeric" })}</div>
            </button>
          </div>
          <div class="settings-row">
            <label>First Day Of Last Period<div class="date-control"><span id="lmp-weekday" class="weekday">${this.weekday(this.dateKey(lmp))}</span><input id="lmp-date" type="date" value="${this.dateKey(lmp)}"></div></label>
            <label>Color Theme<select id="theme-select">
              ${["Pink", "Blue", "Auto"].map((option) => `<option${themeState === option ? " selected" : ""}>${option}</option>`).join("")}
            </select></label>
          </div>
          <div class="journey-layout">
            <aside class="trimester-track" aria-label="Pregnancy trimesters">
              <div class="rail-title">Journey</div>
              ${[
                { number: 1, label: "First", range: "Weeks 1–12" },
                { number: 2, label: "Second", range: "Weeks 13–27" },
                { number: 3, label: "Third", range: "Weeks 28–40+" },
              ].map((item) => `
                <div class="trimester ${this.trimesterForWeek(currentWeek) === item.number ? "active" : ""}">
                  <span>${item.number}</span><div><strong>${item.label}</strong><small>${item.range}</small></div>
                </div>`).join("")}
            </aside>
            <div class="journey-main">
              <div class="current-insight">
                <ha-icon icon="mdi:baby-face-outline"></ha-icon>
                <div><strong>Week ${currentWeek}</strong><span>${this.escape(this.insightForWeek(currentWeek))}</span></div>
              </div>
              <div class="nav">
                <button class="nav-btn prev" ${offset <= minOffset ? "disabled" : ""} aria-label="Previous week">&#8249;</button>
                <button class="nav-btn current-btn ${offset === 0 ? "selected" : ""}">Current</button>
                <button class="nav-btn next" ${offset >= maxOffset ? "disabled" : ""} aria-label="Next week">&#8250;</button>
              </div>
              <div class="weeks">${weeks}</div>
            </div>
          </div>
          <div class="appointments">
            <div class="appt-head">
              <div>
                <div class="appt-title">Maternity Appointments</div>
                <div class="appt-subtitle">Scans, antenatal visits, and other pregnancy appointments</div>
              </div>
              <span class="appt-count">${upcomingEvents.length} upcoming</span>
            </div>
            <div class="appt-list">${appointmentRows(upcomingEvents)}</div>
            <details class="past-appointments"${this._pastAppointmentsOpen ? " open" : ""}${pastEvents.length ? "" : " disabled"}>
              <summary>Past Appointments <span>${pastEvents.length}</span></summary>
              <div class="appt-list">${appointmentRows(pastEvents, true)}</div>
            </details>
            <button class="add-appt">
              <ha-icon icon="mdi:calendar-plus"></ha-icon>
              <span><strong>Add Maternity Appointment</strong><small>Add directly without leaving this page</small></span>
            </button>
          </div>
          <div class="info-source">
            General pregnancy information only. Sources:
            <a href="https://www.betterhealth.vic.gov.au/health/healthyliving/pregnancy-week-by-week" target="_blank" rel="noopener">Better Health Channel</a>
            and <a href="https://www.pregnancybirthbaby.org.au/pregnancy-week-by-week" target="_blank" rel="noopener">Pregnancy, Birth and Baby</a>.
            For urgent symptoms call 000; for Australian health advice call Healthdirect on 1800 022 222 or contact your maternity care team.
          </div>
        </div>
      </ha-card>`;

    this.shadowRoot.querySelector("#lmp-date").addEventListener("change", (event) => {
      this.shadowRoot.querySelector("#lmp-weekday").textContent = this.weekday(event.target.value);
      this.setLmp(event.target.value);
    });
    this.shadowRoot.querySelector("#theme-select").addEventListener("change", (event) => {
      const option = event.target.value;
      const wrap = this.shadowRoot.querySelector(".wrap");
      wrap.classList.toggle("theme-blue", option === "Blue");
      wrap.classList.toggle("theme-pink", option !== "Blue");
      this.setTheme(option);
    });
    this.shadowRoot.querySelector(".print-journey").addEventListener("click", () =>
      this.openPrintView({ lmp, dueDate, currentWeek, events, theme })
    );
    this.shadowRoot.querySelectorAll(".settings-row input,.settings-row select").forEach((control) =>
      control.addEventListener("blur", () => {
        if (this._renderPending) {
          this._renderPending = false;
          this.render();
        }
      })
    );
    this.shadowRoot.querySelector(".prev").addEventListener("click", () => this.setOffset(Math.max(minOffset, offset - 1)));
    this.shadowRoot.querySelector(".next").addEventListener("click", () => this.setOffset(Math.min(maxOffset, offset + 1)));
    this.shadowRoot.querySelector(".current-btn").addEventListener("click", () => this.setOffset(0));
    this.shadowRoot.querySelector(".due-jump").addEventListener("click", () => this.setOffset(maxOffset));
    this.shadowRoot.querySelectorAll(".day-num").forEach((button) =>
      button.addEventListener("click", () => this.openAppointment(button.dataset.date))
    );
    this.shadowRoot.querySelectorAll(".appt-row").forEach((button) =>
      button.addEventListener("click", () => this.editAppointment(events[Number(button.dataset.eventIndex)]))
    );
    this.shadowRoot.querySelector(".past-appointments")?.addEventListener("toggle", (event) => {
      this._pastAppointmentsOpen = event.currentTarget.open;
    });
    this.shadowRoot.querySelector(".add-appt").addEventListener("click", () => this.openAppointment(this.dateKey(today)));
  }

  async setLmp(date) {
    if (!date) return;
    await this._hass.callService("input_datetime", "set_datetime", {
      entity_id: this.config.lmp_entity,
      date,
    });
    await this.setOffset(0);
  }

  weekday(date) {
    if (!date) return "";
    const [year, month, day] = date.split("-").map(Number);
    return new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(new Date(year, month - 1, day));
  }

  setOffset(value) {
    return this._hass.callService("input_number", "set_value", {
      entity_id: this.config.offset_entity,
      value,
    });
  }

  setTheme(option) {
    return this._hass.callService("input_select", "select_option", {
      entity_id: this.config.theme_entity,
      option,
    });
  }

  async loadAppointments(lmp, force = false) {
    const rangeStart = this.addDays(lmp, -7);
    const rangeEnd = this.addDays(lmp, 294);
    const rangeKey = `${this.config.calendar_entity}:${this.dateKey(rangeStart)}:${this.dateKey(rangeEnd)}`;
    if (!force && (this._appointmentRangeKey === rangeKey || this._appointmentsLoading)) return;
    this._appointmentsLoading = true;
    try {
      const items = await this._hass.callApi(
        "GET",
        `calendars/${this.config.calendar_entity}?start=${encodeURIComponent(rangeStart.toISOString())}&end=${encodeURIComponent(rangeEnd.toISOString())}`
      );
      this._events = items.map((item) => ({
        uid: item.uid,
        summary: item.summary || "Appointment",
        start: item.start?.dateTime || item.start?.date || "",
        end: item.end?.dateTime || item.end?.date || "",
        location: item.location || "",
        description: item.description || "",
      })).filter((item) => item.start).sort((a, b) => new Date(a.start) - new Date(b.start));
      this._appointmentRangeKey = rangeKey;
      this.render();
    } catch (error) {
      console.error("Baby appointment calendar load:", error);
      this._events = [];
      this._appointmentRangeKey = rangeKey;
      this.render();
    } finally {
      this._appointmentsLoading = false;
    }
  }

  async openAppointment(date) {
    this.showAppointmentModal({
      mode: "add",
      summary: "Maternity Appointment",
      start: `${date}T09:00`,
      end: `${date}T10:00`,
      location: "",
      description: "",
    });
  }

  async editAppointment(event) {
    try {
      const wantedStart = String(event.start || "");
      const wantedEnd = String(event.end || "");
      const summary = String(event.summary || "");
      let uid = event.uid;
      if (!uid) {
        const from = this.addDays(new Date(wantedStart), -1);
        const to = this.addDays(new Date(wantedStart), 2);
        const items = await this._hass.callApi(
          "GET",
          `calendars/${this.config.calendar_entity}?start=${encodeURIComponent(from.toISOString())}&end=${encodeURIComponent(to.toISOString())}`
        );
        uid = items.find((item) =>
          item.summary === summary && (item.start?.dateTime || item.start?.date) === wantedStart
        )?.uid;
      }
      if (!uid) throw new Error("Appointment UID not found");
      this.showAppointmentModal({
        mode: "edit",
        uid,
        summary,
        start: wantedStart.slice(0, 16),
        end: wantedEnd.slice(0, 16),
        location: event.location || "",
        description: event.description || "",
      });
    } catch (error) {
      console.error("Baby appointment editor:", error);
      alert("Could not open this appointment. Refresh the dashboard and try again.");
    }
  }

  showAppointmentModal(data) {
    this.shadowRoot.querySelector(".appointment-modal")?.remove();
    const modal = document.createElement("div");
    const blue = this._hass.states[this.config.theme_entity]?.state === "Blue";
    modal.className = `appointment-modal theme-${blue ? "blue" : "pink"}`;
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <form class="modal-panel">
        <div class="modal-head">
          <div><strong>${data.mode === "add" ? "Add" : "Edit"} Maternity Appointment</strong><small>Saved directly to ${this.escape(this.config.calendar_entity)}</small></div>
          <button type="button" class="modal-close" aria-label="Close">&times;</button>
        </div>
        <label>Appointment Type
          <input name="summary" list="maternity-appointment-types" required value="${this.escape(data.summary)}" placeholder="Choose or type a custom title">
          <datalist id="maternity-appointment-types">
            <option value="Antenatal Appointment"></option>
            <option value="Blood Test"></option>
            <option value="Ultrasound Scan"></option>
            <option value="Dating Scan"></option>
            <option value="Nuchal Translucency Scan"></option>
            <option value="Morphology Scan"></option>
            <option value="Glucose Tolerance Test"></option>
            <option value="Midwife Appointment"></option>
            <option value="Obstetrician Appointment"></option>
            <option value="Hospital Appointment"></option>
          </datalist>
        </label>
        <div class="modal-grid">
          <label>Starts<input name="start" type="datetime-local" required value="${this.escape(data.start)}"></label>
          <label>Ends<input name="end" type="datetime-local" required value="${this.escape(data.end)}"></label>
        </div>
        <label>Location<input name="location" value="${this.escape(data.location)}"></label>
        <label>Notes<textarea name="description" rows="3">${this.escape(data.description)}</textarea></label>
        <div class="modal-error" role="alert"></div>
        <div class="modal-actions">
          ${data.mode === "edit" ? '<button type="button" class="modal-delete">Delete</button>' : ""}
          <button type="button" class="modal-cancel">Cancel</button>
          <button type="submit" class="modal-save">${data.mode === "add" ? "Add Appointment" : "Save Changes"}</button>
        </div>
      </form>`;
    this.shadowRoot.append(modal);
    const close = () => modal.remove();
    modal.querySelector(".modal-backdrop").addEventListener("click", close);
    modal.querySelector(".modal-close").addEventListener("click", close);
    modal.querySelector(".modal-cancel").addEventListener("click", close);
    const startInput = modal.querySelector('[name="start"]');
    const endInput = modal.querySelector('[name="end"]');
    startInput.addEventListener("change", () => {
      const start = new Date(startInput.value);
      const end = new Date(endInput.value);
      if (!Number.isNaN(start.getTime()) && (Number.isNaN(end.getTime()) || end <= start)) {
        const adjusted = new Date(start.getTime() + 60 * 60 * 1000);
        const local = new Date(adjusted.getTime() - adjusted.getTimezoneOffset() * 60000);
        endInput.value = local.toISOString().slice(0, 16);
      }
    });
    modal.querySelector("form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const appointment = {
        summary: String(form.get("summary")).trim(),
        dtstart: String(form.get("start")),
        dtend: String(form.get("end")),
        location: String(form.get("location")).trim(),
        description: String(form.get("description")).trim(),
      };
      if (!appointment.summary || new Date(appointment.dtend) <= new Date(appointment.dtstart)) {
        modal.querySelector(".modal-error").textContent = "Enter a title and make the end time later than the start time.";
        return;
      }
      await this.saveAppointment(data, appointment, modal);
    });
    modal.querySelector(".modal-delete")?.addEventListener("click", () => this.deleteAppointment(data.uid, modal));
    modal.querySelector('[name="summary"]').focus();
  }

  async saveAppointment(data, event, modal) {
    this.setModalBusy(modal, true, data.mode === "add" ? "Adding appointment…" : "Saving changes…");
    try {
      const message = {
        type: data.mode === "add" ? "calendar/event/create" : "calendar/event/update",
        entity_id: this.config.calendar_entity,
        event,
      };
      if (data.uid) message.uid = data.uid;
      await this._hass.connection.sendMessagePromise(message);
      modal.remove();
      this.refreshAppointments().catch((error) => console.error("Baby appointment refresh:", error));
    } catch (error) {
      console.error("Baby appointment save:", error);
      this.setModalBusy(modal, false);
      modal.querySelector(".modal-error").textContent = "Could not save the appointment. Please try again.";
    }
  }

  async deleteAppointment(uid, modal) {
    if (!confirm("Delete this appointment permanently?")) return;
    this.setModalBusy(modal, true, "Deleting appointment…");
    try {
      await this._hass.connection.sendMessagePromise({
        type: "calendar/event/delete",
        entity_id: this.config.calendar_entity,
        uid,
      });
      modal.remove();
      this.refreshAppointments().catch((error) => console.error("Baby appointment refresh:", error));
    } catch (error) {
      console.error("Baby appointment delete:", error);
      this.setModalBusy(modal, false);
      modal.querySelector(".modal-error").textContent = "Could not delete the appointment. Please try again.";
    }
  }

  setModalBusy(modal, busy, message = "") {
    if (!modal?.isConnected) return;
    modal.classList.toggle("busy", busy);
    modal.querySelectorAll("button,input,textarea").forEach((control) => {
      control.disabled = busy;
    });
    modal.querySelector(".modal-error").textContent = message;
  }

  refreshAppointments() {
    const lmp = this.parseDate(this._hass.states[this.config.lmp_entity]?.state);
    if (!lmp) return Promise.resolve();
    return this.loadAppointments(lmp, true);
  }

  openPrintView({ lmp, dueDate, currentWeek, events, theme }) {
    const accent = theme === "blue" ? "#1976d2" : "#d81b60";
    const soft = theme === "blue" ? "#e3f2fd" : "#fce4ec";
    const weeks = Array.from({ length: 42 }, (_, index) => {
      const week = index + 1;
      const start = this.addDays(lmp, index * 7);
      const end = this.addDays(start, 6);
      const days = Array.from({ length: 7 }, (_, dayIndex) => {
        const date = this.addDays(start, dayIndex);
        return `<div class="print-day"><strong>${this.format(date, { weekday: "short" })}</strong><span>${this.format(date, { day: "numeric", month: "short" })}</span><i></i></div>`;
      }).join("");
      return `
        <article class="print-week trimester-${this.trimesterForWeek(week)}${week === 41 ? " due" : ""}">
          <header><strong>Week ${week}</strong><span>${this.format(start, { day: "2-digit", month: "short" })} – ${this.format(end, { day: "2-digit", month: "short", year: "numeric" })}</span></header>
          <div class="print-days">${days}</div>
        </article>`;
    }).join("");
    const now = new Date();
    const printAppointments = (items, emptyMessage) => items.length
      ? items.map((event) => {
          const start = new Date(event.start);
          return `<li><strong>${this.escape(event.summary)}</strong> — ${this.escape(this.format(start, { dateStyle: "medium", timeStyle: String(event.start).includes("T") ? "short" : undefined }))}${event.location ? ` · ${this.escape(event.location)}` : ""}</li>`;
        }).join("")
      : `<li>${emptyMessage}</li>`;
    const upcomingAppointments = events.filter((event) => new Date(event.end || event.start) >= now);
    const pastAppointments = events.filter((event) => new Date(event.end || event.start) < now).reverse();
    const generated = this.format(new Date(), { dateStyle: "long", timeStyle: "short" });
    const printHtml = `<!doctype html>
      <html><head><meta charset="utf-8"><title>Baby Journey Keepsake</title>
      <style id="page-style">@page { size: A4 portrait; margin: 8mm; }</style>
      <style>
        :root{--accent:${accent};--soft:${soft}}*{box-sizing:border-box}
        body{margin:0;font-family:Arial,sans-serif;color:#25212a;background:#eee}
        .toolbar{position:sticky;top:0;z-index:2;display:flex;justify-content:center;gap:8px;padding:10px;background:#25212a}
        .toolbar button{padding:9px 13px;border:0;border-radius:8px;font-weight:700;cursor:pointer}
        .paper{width:210mm;min-height:297mm;margin:12px auto;padding:8mm;background:white;box-shadow:0 4px 24px #0003}
        .hero{display:grid;grid-template-columns:1.4fr repeat(3,1fr);gap:7px;margin-bottom:7px}
        .title,.metric{padding:9px;border:1px solid #ddd;border-radius:9px;background:var(--soft)}
        .title h1{margin:0;color:var(--accent);font-size:21px}.title p,.metric small{margin:4px 0 0;color:#666;font-size:9px}
        .metric strong{display:block;margin-top:5px;font-size:13px}.trimester-head{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:7px}
        .trimester-head div{padding:5px 8px;border-left:4px solid var(--trimester-color);background:var(--trimester-soft);font-size:9px}
        .trimester-1{--trimester-color:#d81b60;--trimester-soft:#fce4ec}
        .trimester-2{--trimester-color:#7e57c2;--trimester-soft:#ede7f6}
        .trimester-3{--trimester-color:#1976d2;--trimester-soft:#e3f2fd}
        .weeks{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}
        .print-week{break-inside:avoid;padding:5px 6px;border:1px solid var(--trimester-color);border-radius:7px;min-height:30mm;background:linear-gradient(180deg,var(--trimester-soft) 0 8mm,#fff 8mm)}
        .print-week.due{box-shadow:inset 0 0 0 2px #7e57c2}
        .print-week header{display:flex;justify-content:space-between;gap:5px;align-items:baseline;border-bottom:1px solid color-mix(in srgb,var(--trimester-color) 30%,#ddd);padding-bottom:3px}
        .print-week header strong{font-size:9px;color:var(--trimester-color)}.print-week header span{font-size:6.5px;color:#666;text-align:right}
        .print-days{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-top:4px}
        .print-day{display:flex;flex-direction:column;align-items:center;min-width:0;height:18mm;padding:2px 1px;border:1px solid #ddd;border-radius:3px;background:#fff}
        .print-day strong{font-size:5.5px;color:#666;text-transform:uppercase}.print-day span{margin-top:1px;font-size:6.5px;font-weight:700;white-space:nowrap}
        .print-day i{display:block;flex:1;width:100%;margin-top:2px;border-top:1px dotted #ccc}
        .appointments{margin-top:7px;padding:7px 9px;border:1px solid #ddd;border-radius:8px}.appointments h2{margin:0 0 4px;font-size:11px;color:var(--accent)}
        .appointments h3{margin:6px 0 3px;font-size:8px;color:#555}.appointments .past{color:#777}
        .appointments ul{columns:2;margin:0;padding-left:16px;font-size:7.5px;line-height:1.45}
        footer{display:flex;justify-content:space-between;gap:10px;margin-top:6px;color:#777;font-size:6.5px}
        body.a3 .paper{width:420mm;min-height:297mm;padding:10mm}body.a3 .weeks{grid-template-columns:repeat(7,1fr)}
        body.a3 .print-week{min-height:35mm;padding:7px}body.a3 .print-week header strong{font-size:11px}body.a3 .print-week header span{font-size:8px}
        body.a3 .print-day{height:22mm}body.a3 .print-day strong{font-size:6.5px}body.a3 .print-day span{font-size:7.5px}
        @media print{body{background:white}.toolbar{display:none}.paper{margin:0;box-shadow:none;width:auto;min-height:0;padding:0}}
      </style></head>
      <body><div class="toolbar">
        <button onclick="setPage('A4')">Print A4 · 2-sided / 2 pages</button>
        <button onclick="setPage('A3')">Print A3 · 1 page</button>
        <button onclick="history.length > 1 ? history.back() : window.close()">Back / Close</button>
      </div>
      <main class="paper">
        <section class="hero">
          <div class="title"><h1>Baby Journey</h1><p>A frozen keepsake of this pregnancy</p></div>
          <div class="metric"><small>First Day Of Last Period</small><strong>${this.escape(this.format(lmp, { dateStyle: "long" }))}</strong></div>
          <div class="metric"><small>Estimated Due Date</small><strong>${this.escape(this.format(dueDate, { dateStyle: "long" }))}</strong></div>
          <div class="metric"><small>Snapshot At</small><strong>Week ${currentWeek}</strong></div>
        </section>
        <section class="trimester-head"><div class="trimester-1"><strong>First Trimester</strong> · Weeks 1–12</div><div class="trimester-2"><strong>Second Trimester</strong> · Weeks 13–27</div><div class="trimester-3"><strong>Third Trimester</strong> · Weeks 28–42</div></section>
        <section class="weeks">${weeks}</section>
        <section class="appointments">
          <h2>Maternity Appointments</h2>
          <h3>Upcoming</h3><ul>${printAppointments(upcomingAppointments, "No upcoming appointments.")}</ul>
          <h3>Past</h3><ul class="past">${printAppointments(pastAppointments, "No past appointments.")}</ul>
        </section>
        <footer><span>Generated ${this.escape(generated)}. Save as PDF from the print dialog for a permanent copy.</span><span>General information only · Better Health Channel · Pregnancy, Birth and Baby</span></footer>
      </main>
      <script>
        function setPage(size){
          document.body.classList.toggle('a3',size==='A3');
          document.getElementById('page-style').textContent='@page { size: '+size+' '+(size==='A3'?'landscape':'portrait')+'; margin: 8mm; }';
          setTimeout(()=>window.print(),100);
        }
      </script></body></html>`;
    const printUrl = URL.createObjectURL(new Blob([printHtml], { type: "text/html;charset=utf-8" }));
    const printWindow = window.open(printUrl, "_blank");
    if (printWindow) {
      printWindow.opener = null;
    } else {
      const link = document.createElement("a");
      link.href = printUrl;
      link.target = "_blank";
      link.rel = "noopener external";
      link.click();
    }
    window.setTimeout(() => URL.revokeObjectURL(printUrl), 300000);
  }

  styles() {
    return `
      :host { display:block; }
      ha-card { border-radius:20px; overflow:hidden; }
      button,input { font:inherit; }
      .wrap { --baby-soft:#f48fb1; --baby-secondary:#ab47bc; --baby-primary:#ec407a; --baby-strong:#e91e63; --baby-dark:#ad1457; --baby-dot:#7e57c2; --baby-rgb:233,30,99; container-type:inline-size; padding:18px; color:var(--primary-text-color); background:linear-gradient(145deg,color-mix(in srgb,var(--card-background-color) 74%,var(--baby-soft) 26%),color-mix(in srgb,var(--card-background-color) 86%,var(--baby-secondary) 14%)); border:1px solid color-mix(in srgb,var(--baby-soft) 58%,var(--divider-color)); border-radius:20px; box-shadow:0 10px 30px rgba(var(--baby-rgb),.12); }
      .wrap.theme-blue { --baby-soft:#64b5f6; --baby-secondary:#5c6bc0; --baby-primary:#42a5f5; --baby-strong:#1e88e5; --baby-dark:#1565c0; --baby-dot:#3949ab; --baby-rgb:30,136,229; }
      .summary { display:grid; grid-template-columns:minmax(0,1.35fr) repeat(2,minmax(0,1fr)); gap:10px; }
      .primary,.stat { position:relative; box-sizing:border-box; padding:14px 15px; min-height:76px; border-radius:15px; color:var(--primary-text-color); text-align:left; background:color-mix(in srgb,var(--card-background-color) 91%,var(--baby-soft) 9%); border:1px solid color-mix(in srgb,var(--baby-soft) 30%,var(--divider-color)); overflow:hidden; }
      .primary { padding-right:48px; }
      .primary::before { content:""; position:absolute; inset:0 auto 0 0; width:var(--progress); background:linear-gradient(90deg,rgba(var(--baby-rgb),.24),color-mix(in srgb,var(--baby-soft) 38%,transparent)); border-right:1px solid rgba(var(--baby-rgb),.32); }
      .primary>* { position:relative; }
      .eyebrow,.label { font-size:.68rem; line-height:1; text-transform:uppercase; letter-spacing:.1em; color:var(--secondary-text-color); font-weight:700; }
      .age { margin-top:7px; font-size:1.7rem; line-height:1; font-weight:800; letter-spacing:-.03em; }
      .age span { font-size:.78rem; font-weight:650; letter-spacing:0; color:var(--secondary-text-color); }
      .progress { position:absolute; right:11px; bottom:8px; padding:2px 7px; border-radius:999px; font-size:.66rem; font-weight:800; color:var(--baby-dark); background:rgba(255,255,255,.76); }
      .value { margin-top:8px; font-size:1rem; line-height:1.25; font-weight:750; }
      .due-jump { cursor:pointer; transition:.14s ease; }
      .due-jump:hover { transform:translateY(-1px); border-color:color-mix(in srgb,var(--baby-secondary) 55%,transparent); box-shadow:0 5px 14px rgba(var(--baby-rgb),.14); }
      .settings-row { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:11px; padding:9px 11px; border-radius:12px; background:color-mix(in srgb,var(--card-background-color) 92%,var(--baby-soft) 8%); border:1px solid color-mix(in srgb,var(--baby-soft) 28%,var(--divider-color)); }
      .settings-row label { display:flex; justify-content:space-between; align-items:center; gap:8px; font-size:.75rem; color:var(--secondary-text-color); font-weight:700; }
      .date-control { display:flex; align-items:center; gap:7px; }
      .weekday { min-width:2.5em; color:var(--primary-text-color); font-size:.78rem; text-align:right; }
      .settings-row input,.settings-row select { max-width:150px; padding:6px 8px; color:var(--primary-text-color); color-scheme:light dark; background:var(--card-background-color); border:1px solid var(--divider-color); border-radius:9px; }
      .print-journey { position:absolute; z-index:2; top:9px; right:9px; display:grid; place-items:center; width:30px; height:30px; padding:0; color:#fff; background:linear-gradient(135deg,var(--baby-primary),var(--baby-secondary)); border:0; border-radius:9px; box-shadow:0 3px 9px rgba(var(--baby-rgb),.24); cursor:pointer; }
      .print-journey ha-icon { --mdc-icon-size:18px; }
      .journey-layout { display:grid; gap:10px; margin-top:12px; }
      .journey-main { min-width:0; }
      .trimester-track { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; padding:10px; border-radius:15px; background:color-mix(in srgb,var(--card-background-color) 92%,var(--baby-soft) 8%); border:1px solid color-mix(in srgb,var(--baby-soft) 28%,var(--divider-color)); }
      .rail-title { display:none; }
      .trimester { position:relative; display:flex; align-items:center; gap:7px; padding:8px 6px; border-radius:11px; opacity:.58; background:color-mix(in srgb,var(--card-background-color) 96%,var(--baby-soft) 4%); border:1px solid transparent; }
      .trimester:not(:last-child)::after { content:""; position:absolute; left:100%; top:50%; width:9px; height:2px; background:color-mix(in srgb,var(--baby-soft) 45%,var(--divider-color)); transform:translateY(-50%); }
      .trimester>span { display:grid; place-items:center; flex:none; width:25px; height:25px; border-radius:50%; color:var(--secondary-text-color); background:var(--secondary-background-color); font-weight:850; }
      .trimester div { display:flex; min-width:0; flex-direction:column; gap:2px; }
      .trimester strong { font-size:.72rem; line-height:1.1; }
      .trimester small { color:var(--secondary-text-color); font-size:.59rem; white-space:nowrap; }
      .trimester.active { opacity:1; border-color:var(--baby-soft); background:color-mix(in srgb,var(--card-background-color) 78%,var(--baby-soft) 22%); box-shadow:0 4px 13px rgba(var(--baby-rgb),.13); }
      .trimester.active>span { color:#fff; background:linear-gradient(135deg,var(--baby-primary),var(--baby-secondary)); }
      .current-insight { display:flex; align-items:flex-start; gap:10px; padding:11px 12px; border-radius:12px; background:color-mix(in srgb,var(--card-background-color) 88%,var(--baby-soft) 12%); border-left:3px solid var(--baby-primary); }
      .current-insight ha-icon { flex:none; color:var(--baby-primary); }
      .current-insight div { display:flex; flex-direction:column; gap:3px; }
      .current-insight strong { font-size:.78rem; }
      .current-insight span { color:var(--secondary-text-color); font-size:.74rem; line-height:1.35; }
      .nav { display:flex; justify-content:center; align-items:center; gap:8px; margin-top:15px; }
      .nav-btn { height:34px; min-width:38px; padding:0 11px; border-radius:11px; color:var(--primary-text-color); background:color-mix(in srgb,var(--card-background-color) 90%,var(--baby-soft) 10%); border:1px solid color-mix(in srgb,var(--baby-soft) 35%,var(--divider-color)); font-size:.76rem; font-weight:750; cursor:pointer; }
      .nav-btn.selected { color:#fff; background:linear-gradient(135deg,var(--baby-primary),var(--baby-secondary)); border-color:transparent; }
      .nav-btn:disabled { opacity:.35; cursor:not-allowed; }
      .weeks { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; margin-top:17px; }
      .week:nth-child(n+5) { display:none; }
      .week { padding:13px; border-radius:15px; background:color-mix(in srgb,var(--card-background-color) 92%,var(--baby-soft) 8%); border:1px solid color-mix(in srgb,var(--divider-color) 72%,var(--baby-soft) 28%); box-shadow:0 3px 12px rgba(35,20,30,.06); }
      .week.current { background:linear-gradient(135deg,color-mix(in srgb,var(--card-background-color) 62%,var(--baby-soft) 38%),color-mix(in srgb,var(--card-background-color) 86%,#ffc107 14%)); border:2px solid var(--baby-soft); }
      .week.due { background:linear-gradient(135deg,color-mix(in srgb,var(--card-background-color) 64%,var(--baby-secondary) 36%),color-mix(in srgb,var(--card-background-color) 84%,#ffd54f 16%)); border:2px solid var(--baby-secondary); }
      .due-label { margin-left:5px; padding:2px 6px; border-radius:999px; font-size:.62rem; color:#fff; background:linear-gradient(135deg,var(--baby-secondary),var(--baby-primary)); }
      .week-head { display:flex; justify-content:space-between; gap:8px; align-items:baseline; margin-bottom:11px; }
      .week-name { font-weight:750; }
      .week-range { font-size:.78rem; color:var(--secondary-text-color); }
      .day-grid { display:grid; grid-template-columns:repeat(7,minmax(0,1fr)); text-align:center; gap:3px; }
      .day-name { font-size:.68rem; color:var(--secondary-text-color); }
      .day-num { position:relative; display:flex; align-items:center; justify-content:center; min-width:28px; height:28px; margin:4px auto 0; padding:0; border:0; border-radius:999px; color:var(--primary-text-color); background:transparent; font-weight:650; cursor:pointer; transition:.14s ease; }
      .day-num:hover { transform:translateY(-1px) scale(1.08); background:color-mix(in srgb,var(--baby-soft) 18%,transparent); }
      .day-num.today { color:#fff; background:var(--baby-strong); box-shadow:0 0 0 3px rgba(var(--baby-rgb),.2),0 0 9px rgba(var(--baby-rgb),.65); }
      .day-num.appointment { box-shadow:inset 0 0 0 2px var(--baby-secondary); }
      .day-num.appointment::after { content:""; position:absolute; right:-1px; top:-1px; width:7px; height:7px; border-radius:50%; background:var(--baby-dot); border:1.5px solid var(--card-background-color); }
      .week-insight { display:grid; grid-template-columns:16px minmax(0,1fr); align-items:start; column-gap:8px; margin-top:10px; padding-top:9px; color:var(--secondary-text-color); border-top:1px solid var(--divider-color); font-size:.68rem; line-height:1.35; }
      .week-insight ha-icon { display:block; width:16px; height:16px; margin-top:0; align-self:start; color:var(--baby-primary); --mdc-icon-size:16px; }
      .week-insight span { display:block; min-width:0; }
      .appointments { margin-top:20px; padding-top:18px; border-top:1px solid color-mix(in srgb,var(--baby-soft) 38%,var(--divider-color)); }
      .appt-head { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:12px; }
      .appt-title { font-size:1rem; font-weight:800; }
      .appt-subtitle { margin-top:3px; font-size:.72rem; color:var(--secondary-text-color); }
      .appt-count { flex:none; padding:3px 8px; border-radius:999px; font-size:.68rem; font-weight:800; color:var(--baby-dark); background:rgba(255,255,255,.72); border:1px solid rgba(var(--baby-rgb),.22); }
      .appt-list { display:grid; gap:8px; }
      .appt-row { display:grid; grid-template-columns:58px minmax(0,1fr); gap:11px; align-items:center; width:100%; padding:11px; color:var(--primary-text-color); text-align:left; border-radius:14px; background:color-mix(in srgb,var(--card-background-color) 91%,var(--baby-soft) 9%); border:1px solid color-mix(in srgb,var(--baby-soft) 28%,var(--divider-color)); cursor:pointer; transition:.14s ease; }
      .appt-row:hover { transform:translateY(-1px); border-color:color-mix(in srgb,var(--baby-secondary) 55%,transparent); box-shadow:0 5px 14px rgba(var(--baby-rgb),.14); }
      .appt-row.past { opacity:.62; filter:saturate(.55); }
      .past-appointments { margin-top:11px; padding-top:10px; border-top:1px solid var(--divider-color); }
      .past-appointments summary { display:flex; align-items:center; justify-content:space-between; padding:7px 3px; color:var(--secondary-text-color); font-size:.74rem; font-weight:800; cursor:pointer; }
      .past-appointments summary span { padding:2px 7px; border-radius:999px; background:var(--secondary-background-color); }
      .past-appointments[disabled] summary { opacity:.5; cursor:default; pointer-events:none; }
      .past-appointments .appt-list { margin-top:7px; }
      .appt-date { display:flex; flex-direction:column; text-align:center; padding:7px 4px; border-radius:11px; color:#fff; background:linear-gradient(145deg,var(--baby-primary),var(--baby-secondary)); }
      .appt-day { font-size:1.08rem; line-height:1; font-weight:850; }
      .appt-month { margin-top:3px; font-size:.62rem; line-height:1; text-transform:uppercase; letter-spacing:.08em; }
      .appt-info { display:flex; flex-direction:column; min-width:0; }
      .appt-name { font-size:.88rem; font-weight:780; line-height:1.25; }
      .appt-meta { display:flex; align-items:center; flex-wrap:wrap; gap:5px; margin-top:5px; font-size:.72rem; color:var(--secondary-text-color); }
      .appt-time { flex:none; padding:3px 7px; border-radius:999px; color:#fff; background:linear-gradient(135deg,var(--baby-primary),var(--baby-secondary)); border:1px solid rgba(255,255,255,.24); box-shadow:0 2px 6px rgba(var(--baby-rgb),.18); font-size:.66rem; font-weight:800; }
      .appt-note { min-width:0; color:var(--primary-text-color); }
      .appt-location { color:var(--secondary-text-color); }
      .appt-empty { display:flex; flex-direction:column; align-items:center; gap:7px; padding:22px 12px; text-align:center; border-radius:14px; color:var(--secondary-text-color); background:color-mix(in srgb,var(--card-background-color) 94%,var(--baby-soft) 6%); border:1px dashed color-mix(in srgb,var(--baby-soft) 38%,var(--divider-color)); }
      .appt-empty ha-icon { color:var(--baby-primary); }
      .add-appt { display:flex; align-items:center; gap:12px; width:100%; margin-top:10px; padding:13px 15px; color:var(--primary-text-color); text-align:left; border-radius:15px; background:linear-gradient(135deg,color-mix(in srgb,var(--baby-primary) 20%,transparent),color-mix(in srgb,var(--baby-secondary) 14%,transparent)); border:1px solid color-mix(in srgb,var(--baby-soft) 55%,transparent); cursor:pointer; }
      .add-appt ha-icon { color:var(--baby-primary); }
      .add-appt span { display:flex; flex-direction:column; gap:3px; }
      .add-appt small { color:var(--secondary-text-color); }
      .info-source { margin-top:14px; color:var(--secondary-text-color); font-size:.64rem; line-height:1.4; text-align:center; }
      .info-source a { color:var(--baby-dark); }
      .appointment-modal { --baby-soft:#f48fb1; --baby-secondary:#ab47bc; --baby-primary:#ec407a; position:fixed; inset:0; z-index:9999; display:grid; place-items:center; padding:18px; }
      .appointment-modal.theme-blue { --baby-soft:#64b5f6; --baby-secondary:#5c6bc0; --baby-primary:#42a5f5; }
      .modal-backdrop { position:absolute; inset:0; background:rgba(0,0,0,.55); backdrop-filter:blur(3px); }
      .modal-panel { position:relative; display:grid; gap:12px; width:min(520px,calc(100vw - 36px)); max-height:calc(100vh - 36px); overflow:auto; box-sizing:border-box; padding:20px; color:var(--primary-text-color); background:var(--card-background-color); border:1px solid color-mix(in srgb,var(--baby-soft) 50%,var(--divider-color)); border-radius:20px; box-shadow:0 18px 60px rgba(0,0,0,.35); }
      .modal-head { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
      .modal-head div { display:flex; flex-direction:column; gap:3px; }
      .modal-head strong { font-size:1.05rem; }
      .modal-head small { color:var(--secondary-text-color); }
      .modal-close { padding:0; width:32px; height:32px; color:var(--secondary-text-color); background:transparent; border:0; border-radius:50%; font-size:1.6rem; cursor:pointer; }
      .modal-panel label { display:grid; gap:5px; color:var(--secondary-text-color); font-size:.75rem; font-weight:700; }
      .modal-panel input,.modal-panel textarea { box-sizing:border-box; width:100%; padding:10px 11px; color:var(--primary-text-color); color-scheme:light dark; background:color-mix(in srgb,var(--card-background-color) 92%,var(--baby-soft) 8%); border:1px solid var(--divider-color); border-radius:10px; resize:vertical; }
      .appointment-modal.busy .modal-panel { pointer-events:none; }
      .appointment-modal.busy .modal-panel>*:not(.modal-error) { opacity:.42; filter:blur(.7px); transition:opacity .15s ease,filter .15s ease; }
      .appointment-modal.busy .modal-error { position:sticky; bottom:0; z-index:2; padding:10px 12px; color:var(--primary-text-color); text-align:center; background:color-mix(in srgb,var(--card-background-color) 82%,var(--baby-soft) 18%); border:1px solid color-mix(in srgb,var(--baby-soft) 48%,var(--divider-color)); border-radius:11px; font-weight:800; }
      .modal-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
      .modal-actions { display:flex; justify-content:flex-end; gap:9px; margin-top:2px; }
      .modal-actions button { padding:10px 13px; border:0; border-radius:11px; font-weight:800; cursor:pointer; }
      .modal-save { color:#fff; background:linear-gradient(135deg,var(--baby-primary),var(--baby-secondary)); }
      .modal-delete { margin-right:auto; color:#fff; background:linear-gradient(135deg,#ef5350,#c62828); }
      .modal-cancel { color:var(--primary-text-color); background:var(--secondary-background-color); }
      .modal-error { min-height:1em; color:var(--error-color); font-size:.76rem; }
      .error { padding:20px; color:var(--error-color); }
      @media(min-width:1100px) {
        .weeks { grid-template-columns:repeat(3,minmax(0,1fr)); }
      }
      @container (min-width:900px) {
        .week:nth-child(n+5) { display:block; }
      }
      @media(max-width:900px) { .trimester:not(:last-child)::after { display:none; } }
      @media(max-width:650px) { .summary { grid-template-columns:1fr 1fr; } .primary { grid-column:1/-1; } .weeks { grid-template-columns:1fr; } .settings-row,.modal-grid { grid-template-columns:1fr; } }
    `;
  }
}

if (!customElements.get("baby-journey-card")) {
  customElements.define("baby-journey-card", BabyJourneyCard);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "baby-journey-card",
    name: "Baby Journey Card",
    description: "Pregnancy progress, due date, weekly calendar, and maternity appointments.",
  });
}
