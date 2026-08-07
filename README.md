# Online Tools

Collection of free online tools for developers. No login, no tracking, all calculations happen in your browser.

## Features

- **Zero dependencies**: vanilla HTML/CSS/JavaScript, no frameworks, no build step
- **Privacy-first**: all calculations happen client-side, no data is sent to external servers
- **Performance**: no JavaScript frameworks to download, only the necessary code
- **Scalable**: adding new tools requires only 3 files and one line in `tools.json`
- **Automatic deployment**: Cloudflare Pages integration, automatic deployment on every push

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Hosting**: Cloudflare Pages (static)
- **Versioning**: GitHub
- **Build**: none (static files served directly)

## Project Structure example

    online-tools/
    ├── index.html              # Homepage (dynamically generated from tools.json)
    ├── tools.json              # Registry of all tools
    ├── sql-formatter.html      # Tool: SQL Formatter
    ├── sql-to-jxsql.html       # Tool: SQL to JXSQL Translator
    ├── cron-generator.html     # Tool: Cron Generator
    ├── subnet-calculator.html  # Tool: Subnet Calculator
    ├── css/
    │   └── style.css           # Common styles
    └── js/
        ├── common.js           # Centralized header/footer
        ├── homepage.js         # Homepage logic (reads tools.json, filters)
        ├── sql-formatter.js    # SQL Formatter logic
        ├── sql-to-jxsql.js     # SQL to JXSQL Translator logic
        ├── cron-generator.js   # Cron Generator logic
        └── subnet-calculator.js # Subnet Calculator logic

## Available Tools

### SQL Formatter
Format complex SQL queries with JOINs and subqueries to make them readable. Supports MySQL, PostgreSQL, SQLite.

### SQL to JXSQL Translator
Convert PostgreSQL or MSSQL queries to JXSQL (Janox SQL) syntax. Automatically translates table and column references to `JXTAB()` and `JXCOL()`, and converts concatenations and substring functions to their JXSQL equivalents.

### Cron Generator
Visual interface to build cron expressions with a preview of the next 5 executions. Pure JavaScript implementation, no external dependencies.

### Subnet Calculator
Calculate IPv4 subnets: network address, broadcast, usable hosts, subnet mask, and binary representation.

## Example of how to Add a New Tool

1. **Create the HTML page** for the tool (e.g., `json-validator.html`):
   - Copy the structure from an existing tool
   - Modify title, description, "How to use" section
   - Include `css/style.css`, `js/common.js`, and the tool-specific JS

2. **Create the JavaScript file** (e.g., `js/json-validator.js`):
   - Implement the tool logic
   - Handle events, input validation, output

3. **Update `tools.json`**:

    {
      "id": "json-validator",
      "name": "JSON Validator",
      "description": "Validate and format JSON files with error highlighting.",
      "url": "json-validator.html",
      "category": "devops",
      "tags": ["json", "validator", "formatter"],
      "status": "live"
    }

4. **Push to GitHub**: Cloudflare Pages deploys automatically.

The homepage updates itself by reading the new entry in `tools.json`.

## Deployment

The project is configured for automatic deployment on Cloudflare Pages:

1. Connect the GitHub repository to Cloudflare Pages
2. Build configuration:
   - **Build command**: *(empty)*
   - **Build output directory**: `/`
   - **Framework preset**: None
3. On every push to `main`, Cloudflare Pages deploys automatically

## Architecture

### Dynamic Homepage
The homepage (`index.html`) is an empty skeleton. On load, `homepage.js`:
- Reads `tools.json` via `fetch()`
- Dynamically generates tool cards
- Automatically creates category filters
- Supports "live" status (active tool) and "wip" (coming soon)

### Static Tool Pages
Each tool has its own static HTML page with:
- Specific SEO meta tags
- "How to use" section
- Input/output area
- Tool-specific JavaScript for logic

### Centralization
- Header/footer defined once in `common.js`
- Common styles in `style.css`
- Layout changes require updating only one file

## SEO

- **Tool pages**: pure static HTML with specific meta tags, optimized for indexing
- **Homepage**: list generated via JavaScript, with `<noscript>` fallback for crawlers that don't execute JS
- **Sitemap**: can be added as a static `sitemap.xml` file in the root

## Technical Notes

- All calculations happen in the user's browser (zero server load)
- No database, no sessions, no backend
- Compatible with all modern browsers (Chrome, Firefox, Safari, Edge)
- Responsive: 3 columns desktop, 2 tablet, 1 mobile

## License

MIT

---

**Author**: Krilliam  
**Repository**: https://github.com/Krilliam/online-tools  
**Demo**: https://online-tools.pages.dev
