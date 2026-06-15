# Baby Journey Card

A standalone Home Assistant dashboard card for following pregnancy progress,
weekly development, maternity appointments, and a printable pregnancy
keepsake.

## Features

- Gestational age, estimated due date, progress, and current trimester
- Weekly calendar with concise development information
- Pink and blue themes with light and dark mode support
- Direct appointment management through a writable Home Assistant calendar
- Maternity appointment presets with custom titles, notes, and locations
- Separate upcoming and past appointment lists
- A4 and A3 printable keepsake with daily writing spaces
- No custom integration or appointment sensor required

## Installation With HACS

1. Open HACS in Home Assistant.
2. Open the three-dot menu and select **Custom repositories**.
3. Add this repository:
   `https://github.com/Lilydales/baby-journey-card`
4. Select **Dashboard** as the category.
5. Install **Baby Journey Card**.
6. Refresh the browser or restart the Home Assistant companion app.

HACS should add the frontend resource automatically. If it does not, add this
JavaScript module under **Settings > Dashboards > Resources**:

```text
/hacsfiles/baby-journey-card/baby-journey-card.js
```

## Home Assistant Setup

Create these helpers under **Settings > Devices & Services > Helpers**:

1. **Date**
   - Entity ID: `input_datetime.baby_lmp_date`
   - Date only
2. **Number**
   - Entity ID: `input_number.baby_calendar_week_offset`
   - Minimum: `-40`
   - Maximum: `40`
   - Step: `1`
3. **Dropdown**
   - Entity ID: `input_select.baby_journey_theme`
   - Options: `Pink`, `Blue`, `Auto`

The card also needs a writable calendar entity. A Local Calendar created from
the Home Assistant UI works well.

## Card Configuration

Add a Manual card:

```yaml
type: custom:baby-journey-card
lmp_entity: input_datetime.baby_lmp_date
offset_entity: input_number.baby_calendar_week_offset
theme_entity: input_select.baby_journey_theme
calendar_entity: calendar.calendar
```

Replace `calendar.calendar` with the writable calendar entity on your system.

## Printing

The printer icon opens a standalone printable document. Choose:

- **A4** for a two-page layout suitable for double-sided printing
- **A3** for a larger single-sheet layout

Use the browser print dialog to print or save a permanent PDF.

The Home Assistant companion app may keep the printable document inside its
own web view. For reliable printing from a phone, open the dashboard in the
system browser first. Desktop browsers provide the best print experience.

## Manual Installation

1. Download `baby-journey-card.js`.
2. Copy it to `/config/www/baby-journey-card.js`.
3. Add `/local/baby-journey-card.js` as a JavaScript Module dashboard
   resource.
4. Refresh the browser.

## Disclaimer

The pregnancy information is general educational information only and does
not replace advice from a doctor, midwife, obstetrician, or other qualified
health professional.

## License

MIT
