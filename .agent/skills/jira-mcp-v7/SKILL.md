---
name: jira-mcp-v7
description: Expert guide for using the Jira MCP server with Jira Server 7.x (self-hosted) REST API v2. Triggers when user mentions Jira, tickets, issues, bugs, tasks, stories, epics, JQL queries, issue transitions, or project management. Also triggers on natural language like "todo tickets", "to do items", "my tickets", "assigned to me", "new tickets", "open issues", "in progress", "done tickets", "backlog", or any search for work items. CRITICAL - covers JQL gotchas where "To Do" is a statusCategory NOT an issue type, preventing common "value does not exist" errors. Use this skill whenever interacting with jira-mcp tools.
---

# Jira MCP Server for Jira Server 7.x (Self-Hosted)

This skill provides expert guidance for using the **Jira MCP server** (`mcpm_jira-mcp`) with self-hosted Jira Server 7.x instances using the REST API v2.

## Available MCP Tools

The Jira MCP server provides these tools:

| Tool | Purpose |
|------|---------|
| `jira_get_current_user` | Get logged-in user info |
| `jira_get_user` | Look up a specific user |
| `jira_list_projects` | List all accessible projects |
| `jira_get_project` | Get project details by key |
| `jira_search` | Search issues using JQL |
| `jira_get_issue` | Get full issue details |
| `jira_create_issue` | Create new issues |
| `jira_update_issue` | Update issue fields |
| `jira_delete_issue` | Delete issues (permanent) |
| `jira_get_transitions` | Get available workflow transitions |
| `jira_transition_issue` | Change issue status |
| `jira_get_comments` | Get comments on an issue |
| `jira_add_comment` | Add comment to an issue |

---

## JQL (Jira Query Language) Reference

### Basic Syntax
```
field operator value [AND/OR field operator value]
```

### Common Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `=` | Equals (exact match) | `project = "PROJ"` |
| `!=` | Not equals | `status != Done` |
| `~` | Contains (text fields) | `summary ~ "crash"` |
| `!~` | Does not contain | `description !~ "test"` |
| `IN` | Multiple values | `status IN ("Open", "In Progress")` |
| `NOT IN` | Exclude multiple values | `priority NOT IN (Low, Lowest)` |
| `IS EMPTY` | Field has no value | `assignee IS EMPTY` |
| `IS NOT EMPTY` | Field has a value | `resolution IS NOT EMPTY` |
| `>`, `<`, `>=`, `<=` | Comparison (dates, numbers) | `created >= -7d` |
| `WAS` | Historical value | `status WAS "Open"` |
| `CHANGED` | Field was modified | `status CHANGED` |

### Key Fields

| Field | Description | Example |
|-------|-------------|---------|
| `project` | Project key/name | `project = XESM` |
| `status` | Workflow status (exact name) | `status = "In Progress"` |
| `statusCategory` | Status category (To Do/In Progress/Done) | `statusCategory = "To Do"` |
| `assignee` | Assigned user | `assignee = currentUser()` |
| `reporter` | Issue creator | `reporter = "john.doe"` |
| `issuetype` / `type` | Issue type | `type = Bug` |
| `priority` | Priority level | `priority = High` |
| `resolution` | How issue was resolved | `resolution = Fixed` |
| `created` | Creation date | `created >= 2026-01-01` |
| `updated` | Last update date | `updated >= -1w` |
| `duedate` | Due date | `duedate < now()` |
| `labels` | Issue labels | `labels = "production"` |
| `component` | Project component | `component = "Backend"` |
| `fixVersion` | Target fix version | `fixVersion = "1.0.0"` |

### Useful Functions

| Function | Description | Example |
|----------|-------------|---------|
| `currentUser()` | Logged-in user | `assignee = currentUser()` |
| `now()` | Current datetime | `duedate < now()` |
| `startOfDay()` | Start of today | `created >= startOfDay()` |
| `startOfWeek()` | Start of this week | `updated >= startOfWeek()` |
| `startOfMonth()` | Start of this month | `created >= startOfMonth()` |
| `endOfDay()` | End of today | `duedate <= endOfDay()` |
| `membersOf("group")` | Users in a group | `assignee IN membersOf("developers")` |

### Relative Date Syntax

Use shorthand for relative dates:
- `-1d` = 1 day ago
- `-7d` or `-1w` = 1 week ago
- `-30d` or `-1M` = 1 month ago
- `+1w` = 1 week from now

**Examples:**
```jql
created >= -7d                    # Created in last 7 days
updated >= -1w AND updated < now()  # Updated this week
duedate <= +3d                    # Due within next 3 days
```

---

## ⚠️ Critical Gotchas

### 1. `status` vs `statusCategory`

**IMPORTANT:** These are DIFFERENT concepts!

| Concept | Description | Values |
|---------|-------------|--------|
| `status` | Exact workflow status name | Project-specific (e.g., "Open", "In Review", "QA Testing") |
| `statusCategory` | Category grouping | Only 3 values: `"To Do"`, `"In Progress"`, `"Done"` |

**Status Category API Keys (language-agnostic):**
- `new` → "To Do"
- `indeterminate` → "In Progress"  
- `done` → "Done"

**Common Error:**
```
❌ type = "To Do"  → ERROR: "The value 'To Do' does not exist for the field 'type'"
```
This fails because `"To Do"` is a **status category**, not an **issue type**.

**Correct Usage:**
```jql
# Search by status category (broad)
statusCategory = "To Do"

# Search by exact status (specific)
status = "Open"
status IN ("Open", "Reopened", "Backlog")
```

### 2. Issue Types are Instance-Specific

Standard issue types vary by Jira instance. Common types include:

| Type | Description |
|------|-------------|
| `Bug` | Defects/problems |
| `Task` | Work items |
| `Story` | User stories (Agile) |
| `Epic` | Large initiatives |
| `Sub-task` | Child tasks |

**To discover available types**, check the error message or project configuration.

**Special numeric codes in JQL:**
- `-1` = All standard issue types
- `-2` = All subtask issue types

### 3. Status Names are NOT Unique

Different projects can have statuses with the same name but different IDs. Always use status ID for programmatic logic when possible.

### 4. Permissions Affect Results

JQL queries only return issues the authenticated user can view. A query returning empty results might indicate permission issues, not missing data.

---

## Common Patterns

### Find My Open Issues
```jql
assignee = currentUser() AND resolution IS EMPTY ORDER BY priority DESC
```

### Find Unassigned Bugs
```jql
project = PROJ AND type = Bug AND assignee IS EMPTY
```

### Find Issues Updated This Week
```jql
project = PROJ AND updated >= startOfWeek() ORDER BY updated DESC
```

### Find High Priority Items Due Soon
```jql
priority IN (High, Highest) AND duedate <= +7d AND resolution IS EMPTY
```

### Find Issues in "To Do" Category
```jql
project = PROJ AND statusCategory = "To Do"
```

### Find Recently Created Bugs
```jql
type = Bug AND created >= -7d ORDER BY created DESC
```

### Find Issues Assigned to Team
```jql
assignee IN membersOf("development-team") AND resolution IS EMPTY
```

---

## Workflow: Transitioning Issues

To change an issue's status, follow this two-step process:

### Step 1: Get Available Transitions
```
Call: jira_get_transitions(issueKey: "PROJ-123")
```

Returns valid transitions with their IDs based on current status.

### Step 2: Apply Transition
```
Call: jira_transition_issue(
  issueKey: "PROJ-123",
  transitionId: "31",
  comment: "Moving to In Progress"
)
```

**IMPORTANT:** You cannot directly set a status. You must use transitions defined in the workflow.

---

## Common API Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `400 Bad Request` | Invalid JQL, missing required fields, invalid transition | Check JQL syntax, verify field values, use `jira_get_transitions` first |
| `401 Unauthorized` | Invalid/missing credentials | Check JIRA_USERNAME and JIRA_PASSWORD |
| `403 Forbidden` | User lacks permission | Verify user has access to project/issue |
| `404 Not Found` | Issue/project doesn't exist | Verify issue key or project key |
| `"The value 'X' does not exist for the field 'Y'"` | Invalid field value | Check available values for that field |

---

## Best Practices

1. **Always call `jira_get_current_user` first** to verify authentication
2. **Use `jira_get_transitions` before `jira_transition_issue`** to get valid transition IDs
3. **Use `statusCategory` for broad searches**, `status` for specific workflow states
4. **Specify fields in `jira_search`** to reduce response size: `["summary", "status", "assignee"]`
5. **Use pagination** with `startAt` and `maxResults` for large result sets
6. **Validate JQL in Jira's UI** before using in API calls
7. **Quote values with spaces**: `project = "My Project"` not `project = My Project`
8. **Use ORDER BY** to sort results: `ORDER BY created DESC`
