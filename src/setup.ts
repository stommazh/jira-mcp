/**
 * @file setup.ts
 * @description CLI setup command for injecting MCP configuration into various AI tools.
 * Supports: Claude Code, Claude Desktop, GitHub Copilot, Cursor, Windsurf, Roo Code, Zed, Factory Droid
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/** Supported CLI tools for MCP configuration */
export type SupportedCli =
    | 'claude-code'
    | 'claude-desktop'
    | 'copilot'
    | 'cursor'
    | 'windsurf'
    | 'roo-code'
    | 'zed'
    | 'factory-droid';

/** Configuration scope - user-level or project-level */
export type ConfigScope = 'user' | 'project';

/** Setup options from CLI arguments */
export interface SetupOptions {
    cli: SupportedCli;
    baseUrl: string;
    username: string;
    password: string;
    scope: ConfigScope;
}

/** MCP server configuration block */
interface McpServerConfig {
    command: string;
    args: string[];
    env: Record<string, string>;
}

/** Configuration file info */
interface ConfigFileInfo {
    path: string;
    wrapperKey: string; // e.g., 'mcpServers' or 'servers'
    serverKey: string;  // The key name for this server, e.g., 'jira'
}

/**
 * Gets the config file path and format for each CLI tool.
 * @param cli - Target CLI tool
 * @param scope - User or project scope
 * @returns Config file info or null if unsupported
 */
function getConfigFileInfo(cli: SupportedCli, scope: ConfigScope): ConfigFileInfo | null {
    const home = os.homedir();
    const cwd = process.cwd();

    const configs: Record<SupportedCli, { user: ConfigFileInfo; project: ConfigFileInfo }> = {
        'claude-code': {
            user: { path: path.join(home, '.claude.json'), wrapperKey: 'mcpServers', serverKey: 'jira' },
            project: { path: path.join(cwd, '.mcp.json'), wrapperKey: 'mcpServers', serverKey: 'jira' },
        },
        'claude-desktop': {
            user: {
                path: process.platform === 'darwin'
                    ? path.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
                    : process.platform === 'win32'
                        ? path.join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json')
                        : path.join(home, '.config', 'Claude', 'claude_desktop_config.json'),
                wrapperKey: 'mcpServers',
                serverKey: 'jira',
            },
            project: { path: '', wrapperKey: '', serverKey: '' }, // Claude Desktop doesn't support project scope
        },
        'copilot': {
            user: { path: path.join(home, '.mcp.json'), wrapperKey: 'servers', serverKey: 'jira' },
            project: { path: path.join(cwd, '.vscode', 'mcp.json'), wrapperKey: 'servers', serverKey: 'jira' },
        },
        'cursor': {
            user: { path: path.join(home, '.cursor', 'mcp.json'), wrapperKey: 'mcpServers', serverKey: 'jira' },
            project: { path: path.join(cwd, '.cursor', 'mcp.json'), wrapperKey: 'mcpServers', serverKey: 'jira' },
        },
        'windsurf': {
            user: { path: path.join(home, '.codeium', 'windsurf', 'mcp_config.json'), wrapperKey: 'mcpServers', serverKey: 'jira' },
            project: { path: path.join(cwd, '.windsurf', 'mcp_config.json'), wrapperKey: 'mcpServers', serverKey: 'jira' },
        },
        'roo-code': {
            user: { path: path.join(home, '.roo', 'mcp.json'), wrapperKey: 'mcpServers', serverKey: 'jira' },
            project: { path: path.join(cwd, '.roo', 'mcp.json'), wrapperKey: 'mcpServers', serverKey: 'jira' },
        },
        'zed': {
            user: { path: path.join(home, '.config', 'zed', 'settings.json'), wrapperKey: 'context_servers', serverKey: 'jira' },
            project: { path: path.join(cwd, '.zed', 'settings.json'), wrapperKey: 'context_servers', serverKey: 'jira' },
        },
        'factory-droid': {
            user: { path: path.join(home, '.factory', 'mcp.json'), wrapperKey: 'mcpServers', serverKey: 'jira' },
            project: { path: path.join(cwd, '.factory', 'mcp.json'), wrapperKey: 'mcpServers', serverKey: 'jira' },
        },
    };

    const configInfo = configs[cli]?.[scope];
    if (!configInfo || !configInfo.path) {
        return null;
    }
    return configInfo;
}

/**
 * Creates the MCP server configuration for Jira.
 * @param options - Setup options with credentials
 * @returns MCP server config object
 */
function createJiraServerConfig(options: SetupOptions): McpServerConfig {
    return {
        command: 'npx',
        args: ['-y', '@lvmk/jira-mcp'],
        env: {
            JIRA_BASE_URL: options.baseUrl,
            JIRA_USERNAME: options.username,
            JIRA_PASSWORD: options.password,
        },
    };
}

/**
 * Reads existing config file or returns empty object.
 * @param filePath - Path to config file
 * @returns Parsed JSON object
 */
function readConfigFile(filePath: string): Record<string, unknown> {
    try {
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(content) as Record<string, unknown>;
        }
    } catch (error) {
        console.warn(`Warning: Could not read existing config at ${filePath}`);
    }
    return {};
}

/**
 * Ensures parent directories exist.
 * @param filePath - File path to ensure directories for
 */
function ensureDirectoryExists(filePath: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

/**
 * Injects MCP configuration into the target CLI tool's config file.
 * @param options - Setup options
 * @returns Result message
 */
export function injectMcpConfig(options: SetupOptions): { success: boolean; message: string } {
    const configInfo = getConfigFileInfo(options.cli, options.scope);

    if (!configInfo) {
        return {
            success: false,
            message: `Error: ${options.cli} does not support ${options.scope} scope configuration.`,
        };
    }

    try {
        // Read existing config
        const config = readConfigFile(configInfo.path);

        // Get or create the wrapper object (mcpServers, servers, etc.)
        const wrapperKey = configInfo.wrapperKey;
        if (!config[wrapperKey]) {
            config[wrapperKey] = {};
        }
        const wrapper = config[wrapperKey] as Record<string, unknown>;

        // Check if jira config already exists
        if (wrapper[configInfo.serverKey]) {
            console.log(`ℹ️  Existing Jira MCP configuration found. Updating...`);
        }

        // Add/update Jira server config
        wrapper[configInfo.serverKey] = createJiraServerConfig(options);

        // Ensure directory exists and write file
        ensureDirectoryExists(configInfo.path);
        fs.writeFileSync(configInfo.path, JSON.stringify(config, null, 2) + '\n', 'utf-8');

        return {
            success: true,
            message: `✅ Successfully configured Jira MCP for ${options.cli} (${options.scope} scope)\n   Config file: ${configInfo.path}`,
        };
    } catch (error) {
        return {
            success: false,
            message: `Error writing config: ${(error as Error).message}`,
        };
    }
}

/**
 * Parses CLI arguments for setup command.
 * @param args - Command line arguments
 * @returns Parsed options or null if invalid
 */
export function parseSetupArgs(args: string[]): SetupOptions | null {
    const options: Partial<SetupOptions> = {
        scope: 'user', // Default scope
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const nextArg = args[i + 1];

        switch (arg) {
            case '-c':
            case '--cli':
                options.cli = nextArg as SupportedCli;
                i++;
                break;
            case '-b':
            case '--base-url':
            case '--url':
                options.baseUrl = nextArg;
                i++;
                break;
            case '-u':
            case '--username':
                options.username = nextArg;
                i++;
                break;
            case '-p':
            case '--password':
                options.password = nextArg;
                i++;
                break;
            case '-s':
            case '--scope':
                options.scope = nextArg as ConfigScope;
                i++;
                break;
        }
    }

    // Validate required fields
    const validClis: SupportedCli[] = [
        'claude-code', 'claude-desktop', 'copilot', 'cursor',
        'windsurf', 'roo-code', 'zed', 'factory-droid'
    ];

    if (!options.cli || !validClis.includes(options.cli)) {
        return null;
    }
    if (!options.baseUrl || !options.username || !options.password) {
        return null;
    }
    if (options.scope && !['user', 'project'].includes(options.scope)) {
        return null;
    }

    return options as SetupOptions;
}

/**
 * Prints setup help message.
 */
export function printSetupHelp(): void {
    console.log(`
Jira MCP Setup - Inject configuration into AI tool config files

Usage:
  npx @lvmk/jira-mcp setup -c <cli> -b <url> -u <user> -p <pass> [-s <scope>]

Arguments:
  -c, --cli        Target CLI tool (required)
                   Options: claude-code, claude-desktop, copilot, cursor,
                            windsurf, roo-code, zed, factory-droid

  -b, --base-url   Jira base URL (required)
                   Example: https://jira.example.com

  -u, --username   Jira username (required)

  -p, --password   Jira password (required)

  -s, --scope      Configuration scope (optional, default: user)
                   Options: user, project

Examples:
  # Add to Claude Code user config
  npx @lvmk/jira-mcp setup -c claude-code -b https://jira.example.com -u admin -p secret

  # Add to Cursor project config
  npx @lvmk/jira-mcp setup -c cursor -b https://jira.example.com -u admin -p secret -s project

  # Add to GitHub Copilot (VS Code)
  npx @lvmk/jira-mcp setup -c copilot -b https://jira.example.com -u admin -p secret -s project

Supported CLI Tools:
  ┌────────────────┬───────────────────────────────────────────────────────┐
  │ CLI            │ Config File Location                                  │
  ├────────────────┼───────────────────────────────────────────────────────┤
  │ claude-code    │ ~/.claude.json (user) | .mcp.json (project)           │
  │ claude-desktop │ ~/Library/Application Support/Claude/... (user only)  │
  │ copilot        │ ~/.mcp.json (user) | .vscode/mcp.json (project)       │
  │ cursor         │ ~/.cursor/mcp.json (user) | .cursor/mcp.json (proj)   │
  │ windsurf       │ ~/.codeium/windsurf/mcp_config.json (user)            │
  │ roo-code       │ ~/.roo/mcp.json (user) | .roo/mcp.json (project)      │
  │ zed            │ ~/.config/zed/settings.json (user)                    │
  │ factory-droid  │ ~/.factory/mcp.json (user) | .factory/mcp.json (proj) │
  └────────────────┴───────────────────────────────────────────────────────┘
`);
}

/**
 * Lists all supported CLI tools.
 */
export function printSupportedClis(): void {
    console.log(`
Supported CLI tools:
  • claude-code     - Claude Code (Anthropic)
  • claude-desktop  - Claude Desktop App
  • copilot         - GitHub Copilot (VS Code)
  • cursor          - Cursor AI Editor
  • windsurf        - Windsurf (Codeium)
  • roo-code        - Roo Code
  • zed             - Zed Editor
  • factory-droid   - Factory Droid AI
`);
}
