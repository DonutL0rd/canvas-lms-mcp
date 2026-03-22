import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod/v3";

const CANVAS_BASE_URL = process.env.CANVAS_BASE_URL ?? "https://canvas.instructure.com/api/v1";
const CANVAS_API_TOKEN = process.env.CANVAS_API_TOKEN;

if (!CANVAS_API_TOKEN) {
  console.error("Error: CANVAS_API_TOKEN environment variable is not set.");
  process.exit(1);
}

async function canvasFetch(path: string): Promise<unknown> {
  const url = `${CANVAS_BASE_URL}${path}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${CANVAS_API_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Canvas API request failed: ${response.status} ${response.statusText} for ${url}`
    );
  }

  return response.json();
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

const server = new McpServer({
  name: "canvas-lms-mcp",
  version: "1.0.0",
});

// Tool 1: list_courses
server.registerTool(
  "list_courses",
  {
    description:
      "List all active enrolled courses with id, name, and course_code",
  },
  async () => {
    const courses = (await canvasFetch(
      "/courses?enrollment_state=active&per_page=50"
    )) as Array<{
      id: number;
      name: string;
      course_code: string;
    }>;

    const result = courses.map((c) => ({
      id: c.id,
      name: c.name,
      course_code: c.course_code,
    }));

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result),
        },
      ],
    };
  }
);

// Tool 2: list_assignments
server.registerTool(
  "list_assignments",
  {
    description:
      "List assignments for a course with id, name, due_at, points_possible, and description",
    inputSchema: {
      course_id: z.string().describe("The Canvas course ID"),
    },
  },
  async ({ course_id }) => {
    const assignments = (await canvasFetch(
      `/courses/${course_id}/assignments?per_page=50`
    )) as Array<{
      id: number;
      name: string;
      due_at: string | null;
      points_possible: number | null;
      description: string | null;
    }>;

    const result = assignments.map((a) => ({
      id: a.id,
      name: a.name,
      due_at: a.due_at,
      points_possible: a.points_possible,
      description: a.description ? stripHtml(a.description) : a.description,
    }));

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result),
        },
      ],
    };
  }
);

// Tool 3: list_announcements
server.registerTool(
  "list_announcements",
  {
    description: "List recent announcements for a course",
    inputSchema: {
      course_id: z.string().describe("The Canvas course ID"),
    },
  },
  async ({ course_id }) => {
    const announcements = (await canvasFetch(
      `/courses/${course_id}/discussion_topics?only_announcements=true&per_page=20`
    )) as Array<{
      id: number;
      title: string;
      message: string | null;
      posted_at: string | null;
      author: { display_name?: string } | null;
    }>;

    const result = announcements.map((a) => ({
      id: a.id,
      title: a.title,
      message: a.message ? stripHtml(a.message) : a.message,
      posted_at: a.posted_at,
      author: a.author?.display_name ?? null,
    }));

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result),
        },
      ],
    };
  }
);

// Tool 4: get_grades
server.registerTool(
  "get_grades",
  {
    description: "Get current grades and scores for a course",
    inputSchema: {
      course_id: z.string().describe("The Canvas course ID"),
    },
  },
  async ({ course_id }) => {
    const enrollments = (await canvasFetch(
      `/courses/${course_id}/enrollments?user_id=self`
    )) as Array<{
      id: number;
      type: string;
      enrollment_state: string;
      grades: {
        current_grade: string | null;
        current_score: number | null;
        final_grade: string | null;
        final_score: number | null;
      } | null;
      course_id: number;
    }>;

    const result = enrollments.map((e) => ({
      id: e.id,
      type: e.type,
      enrollment_state: e.enrollment_state,
      course_id: e.course_id,
      current_grade: e.grades?.current_grade ?? null,
      current_score: e.grades?.current_score ?? null,
      final_grade: e.grades?.final_grade ?? null,
      final_score: e.grades?.final_score ?? null,
    }));

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result),
        },
      ],
    };
  }
);

// Tool 5: list_files
server.registerTool(
  "list_files",
  {
    description: "List course files with name, url, and content-type",
    inputSchema: {
      course_id: z.string().describe("The Canvas course ID"),
    },
  },
  async ({ course_id }) => {
    const files = (await canvasFetch(
      `/courses/${course_id}/files?per_page=50`
    )) as Array<{
      id: number;
      display_name: string;
      filename: string;
      url: string;
      "content-type": string;
      size: number;
      updated_at: string | null;
    }>;

    const result = files.map((f) => ({
      id: f.id,
      name: f.display_name,
      filename: f.filename,
      url: f.url,
      content_type: f["content-type"],
      size: f.size,
      updated_at: f.updated_at,
    }));

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result),
        },
      ],
    };
  }
);

// Tool 6: get_assignment_details
server.registerTool(
  "get_assignment_details",
  {
    description: "Get full details and rubric for a specific assignment",
    inputSchema: {
      course_id: z.string().describe("The Canvas course ID"),
      assignment_id: z.string().describe("The Canvas assignment ID"),
    },
  },
  async ({ course_id, assignment_id }) => {
    const assignment = (await canvasFetch(
      `/courses/${course_id}/assignments/${assignment_id}`
    )) as {
      id: number;
      name: string;
      description: string | null;
      due_at: string | null;
      points_possible: number | null;
      submission_types: string[];
      allowed_attempts: number | null;
      grading_type: string;
      html_url: string;
      rubric?: Array<{
        id: string;
        description: string;
        long_description: string | null;
        points: number;
        ratings: Array<{
          id: string;
          description: string;
          long_description: string | null;
          points: number;
        }>;
      }>;
      rubric_settings?: {
        id: number;
        title: string;
        points_possible: number;
        free_form_criterion_comments: boolean;
      };
    };

    const result = {
      id: assignment.id,
      name: assignment.name,
      description: assignment.description ? stripHtml(assignment.description) : assignment.description,
      due_at: assignment.due_at,
      points_possible: assignment.points_possible,
      submission_types: assignment.submission_types,
      allowed_attempts: assignment.allowed_attempts,
      grading_type: assignment.grading_type,
      html_url: assignment.html_url,
      rubric: assignment.rubric
        ? assignment.rubric.map((criterion) => ({
            ...criterion,
            description: stripHtml(criterion.description),
            long_description: criterion.long_description ? stripHtml(criterion.long_description) : criterion.long_description,
          }))
        : null,
      rubric_settings: assignment.rubric_settings ?? null,
    };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result),
        },
      ],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Canvas LMS MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
