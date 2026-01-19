# Jira MCP Package Facts

## Package Information
- **Name**: `@lvmk/jira-mcp`
- **Repository**: `git@github.com:stommazh/jira-mcp.git`
- **Target API**: Jira Server REST API v7.x (tested against v7.6.1 documentation)
- **Authentication**: HTTP Basic Auth (username:password)

## Technology Stack
- TypeScript with ES2022 target
- MCP SDK: `@modelcontextprotocol/sdk`
- Schema validation: `zod`
- Transport: stdio (for npx execution)

## Environment Variables
| Variable | Required | Description |
|----------|----------|-------------|
| `JIRA_BASE_URL` | Yes | Base URL of Jira instance |
| `JIRA_USERNAME` | Yes | Username for authentication |
| `JIRA_PASSWORD` | Yes | Password for authentication |
| `JIRA_API_VERSION` | No | API version (default: "2") |

## Available Tools (13 total)

### Issue Tools
- `jira_get_issue` - Get issue by key
- `jira_create_issue` - Create new issue
- `jira_update_issue` - Update issue fields
- `jira_delete_issue` - Delete issue
- `jira_add_comment` - Add comment
- `jira_get_comments` - Get comments

### Search Tools
- `jira_search` - JQL-based search

### Project Tools
- `jira_list_projects` - List all projects
- `jira_get_project` - Get project details

### Transition Tools
- `jira_get_transitions` - Get available transitions
- `jira_transition_issue` - Execute transition

### User Tools
- `jira_get_current_user` - Get authenticated user
- `jira_get_user` - Get user by username

## MCP Client Configuration Files

| AI Tool | Config File Location |
|---------|---------------------|
| Claude Code | `.mcp.json` (project) or `~/.claude.json` (user) |
| OpenCode | `~/.opencode.json` or `./.opencode.json` |
| Google Antigravity | `mcp_config.json` (via MCP Store) |
| Amp | Via agent command or MCP config |
| GitHub Copilot | `.vscode/mcp.json` (project) or VS Code `settings.json` |
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) |

## Key Implementation Details

### Basic Auth Header
```typescript
const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
```

### API URL Pattern
```
{JIRA_BASE_URL}/rest/api/{version}/{resource}
```
Example: `http://jira.example.com:8080/rest/api/2/issue/PROJ-123`

### Error Handling
- `JiraApiError` class with status code and body
- Graceful error responses in MCP format with `isError: true`

## Testing

### Test Commands
```bash
npm run test:all     # Run all tests
npm run test         # Client tests only
npm run test:tools   # Tool handler tests only
npm run test:build   # Build tests without running
```

### Test Coverage
- Client integration tests (6 tests)
- Tool handler tests (6 tests)
- Tests against live Jira instance using `.env` credentials

### Alternative for Newer Jira
For Jira Cloud or Jira Data Center 8.14+ with PAT/OAuth support:
- Use [mcp-atlassian](https://github.com/sooperset/mcp-atlassian)

## CLI Setup Feature

### Supported CLI Tools
| Tool | Command | Scope Support |
|------|---------|---------------|
| Claude Code | `claude-code` | user, project |
| Claude Desktop | `claude-desktop` | user only |
| GitHub Copilot | `copilot` | user, project |
| Cursor | `cursor` | user, project |
| Windsurf | `windsurf` | user, project |
| Roo Code | `roo-code` | user, project |
| Zed | `zed` | user, project |
| Factory Droid | `factory-droid` | user, project |

### Usage
```bash
npx @lvmk/jira-mcp setup -c <cli> -b <url> -u <user> -p <pass> [-s <scope>]
```

### Short Arguments
- `-c` / `--cli` - Target CLI tool
- `-b` / `--base-url` - Jira URL
- `-u` / `--username` - Username
- `-p` / `--password` - Password
- `-s` / `--scope` - `user` or `project`

## Claude Code Lazy Loading (2025)
- Claude Code v2.1.7+ supports lazy/dynamic tool loading
- Tools are discovered via "Tool Search" feature
- Reduces context token usage from 134k to ~5k tokens
- Uses regex or natural language queries for discovery
