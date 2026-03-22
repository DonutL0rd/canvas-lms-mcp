# canvas-lms-mcp

A [Model Context Protocol](https://modelcontextprotocol.io/) server that connects AI assistants like Claude directly to your Canvas LMS — so you can ask natural language questions about your courses, assignments, grades, and files.

I built this because I was tired of switching tabs to check what's due next or hunting through Canvas's UI just to read an announcement. Now I just ask Claude.

---

## What it does

Expose your Canvas data as MCP tools that any MCP-compatible AI client can call:

| Tool | What it returns |
|------|----------------|
| `list_courses` | All your active enrolled courses |
| `list_assignments` | Assignments for a course with due dates and descriptions |
| `list_announcements` | Recent announcements from your professor |
| `get_grades` | Current and final scores for a course |
| `list_files` | Files posted in a course |
| `get_assignment_details` | Full assignment description + rubric breakdown |

---

## Quick start

### 1. Get a Canvas API token

In Canvas: **Account → Settings → Approved Integrations → New Access Token**

### 2. Clone and install

```bash
git clone https://github.com/DonutL0rd/canvas-lms-mcp.git
cd canvas-lms-mcp
npm install
```

### 3. Configure

```bash
cp .env.example .env
```

Edit `.env`:

```
CANVAS_API_TOKEN=your_token_here
CANVAS_BASE_URL=https://canvas.youruniversity.edu/api/v1
```

### 4. Build

```bash
npm run build
```

---

## Use with Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "canvas-lms": {
      "command": "node",
      "args": ["/absolute/path/to/canvas-lms-mcp/dist/index.js"],
      "env": {
        "CANVAS_API_TOKEN": "your_token_here",
        "CANVAS_BASE_URL": "https://canvas.youruniversity.edu/api/v1"
      }
    }
  }
}
```

Then restart Claude Desktop. You can now ask things like:
- *"What assignments do I have due this week?"*
- *"Show me my grades for CS 301"*
- *"Any new announcements in my classes?"*
- *"What's the rubric for the final project in ENGL 200?"*

---

## Development

```bash
npm run dev   # watch mode
npm run build # production build
npm start     # run the server
```

---

## Notes

- **Read-only** — this server only reads data. It cannot submit assignments or post to Canvas.
- **Works with any Canvas instance** — just set `CANVAS_BASE_URL` to your school's API endpoint.
- Requires Node.js 18+ for built-in `fetch`.

---

## License

MIT
