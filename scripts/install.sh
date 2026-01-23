#!/usr/bin/env bash
#
# @khanglvm/jira-mcp Interactive Installer
# 
# Quick install (process substitution for interactive TUI):
#   bash <(curl -fsSL https://raw.githubusercontent.com/khanglvm/jira-mcp/main/scripts/install.sh)
#
# This wrapper downloads and runs the OpenTUI-based installer
#

set -eo pipefail

readonly REPO_URL="https://github.com/khanglvm/jira-mcp"

# Detect if running via pipe (curl | bash) - BASH_SOURCE is empty in this case
# shellcheck disable=SC2128
if [[ -z "${BASH_SOURCE:-}" ]] || [[ ! -f "${BASH_SOURCE:-}" ]]; then
  readonly IS_PIPED=true
  readonly SCRIPT_DIR=""
else
  readonly IS_PIPED=false
  readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fi

# Colors
readonly C_RESET='\033[0m'
readonly C_ACCENT='\033[38;5;75m'
readonly C_SUCCESS='\033[38;5;114m'
readonly C_WARNING='\033[38;5;221m'
readonly C_ERROR='\033[38;5;204m'
readonly C_MUTED='\033[38;5;60m'

show_help() {
  cat <<EOF
${C_ACCENT}@khanglvm/jira-mcp Interactive Installer${C_RESET}

${C_MUTED}USAGE:${C_RESET}
  ./scripts/install.sh [OPTIONS]

${C_MUTED}OPTIONS:${C_RESET}
  --url <URL>     Pre-fill Jira base URL (e.g., https://jira.example.com:8080)
                  User will still be prompted for username/password
  -h, --help      Show this help message

${C_MUTED}EXAMPLES:${C_RESET}
  # Interactive mode (default)
  ./scripts/install.sh

  # Pre-fill Jira URL
  ./scripts/install.sh --url https://jira.example.com

  # Remote install with URL
  bash <(curl -fsSL https://raw.githubusercontent.com/khanglvm/jira-mcp/main/scripts/install.sh) --url https://jira.example.com

${C_MUTED}Requirements:${C_RESET}
  • Bun (recommended) or Node.js 18+

${C_MUTED}Supported Tools:${C_RESET}
  • Claude Desktop
  • Claude Code (CLI)
  • OpenCode

${C_MUTED}For more info:${C_RESET} https://github.com/khanglvm/jira-mcp
EOF
}

check_runtime() {
  if command -v bun &>/dev/null; then
    echo "bun"
  elif command -v node &>/dev/null; then
    local version=$(node -v | cut -d. -f1 | tr -d 'v')
    if [[ "$version" -ge 18 ]]; then
      echo "node"
    else
      echo ""
    fi
  else
    echo ""
  fi
}

install_bun_if_needed() {
  echo -e "${C_WARNING}Bun not found. Installing Bun...${C_RESET}"
  curl -fsSL https://bun.sh/install | bash
  export BUN_INSTALL="$HOME/.bun"
  export PATH="$BUN_INSTALL/bin:$PATH"
  echo -e "${C_SUCCESS}✓ Bun installed${C_RESET}"
}

# Global variable for CLI argument
JIRA_URL=""

main() {
  # Parse command-line arguments
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --url)
        if [[ -z "${2:-}" ]] || [[ "${2:-}" == --* ]]; then
          echo -e "${C_ERROR}Error: --url requires a value${C_RESET}"
          show_help
          exit 1
        fi
        JIRA_URL="$2"
        shift 2
        ;;
      --help|-h)
        show_help
        exit 0
        ;;
      *)
        echo -e "${C_ERROR}Unknown option: $1${C_RESET}"
        show_help
        exit 1
        ;;
    esac
  done

  # Validate URL format if provided (permissive: allows IPs, localhost, non-standard ports)
  if [[ -n "$JIRA_URL" ]]; then
    # Permissive regex: http(s)://[domain|IP|localhost][:port][/path]
    # Accepts: IPs (192.168.1.1), localhost, domains (jira.example.com), non-standard ports
    if [[ ! "$JIRA_URL" =~ ^https?://[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?(:[0-9]+)?(/.*)?$ ]]; then
      echo -e "${C_ERROR}Error: Invalid URL format. Expected: http(s)://domain[:port][/path]${C_RESET}"
      echo -e "${C_MUTED}Examples:${C_RESET}"
      echo -e "  ${C_MUTED}• https://jira.example.com${C_RESET}"
      echo -e "  ${C_MUTED}• http://192.168.1.100:8080${C_RESET}"
      echo -e "  ${C_MUTED}• http://localhost:8080${C_RESET}"
      exit 1
    fi
    echo -e "${C_SUCCESS}✓ Using Jira URL: ${C_RESET}$JIRA_URL"
  fi

  # Check for runtime
  local runtime=$(check_runtime)
  
  if [[ -z "$runtime" ]]; then
    echo -e "${C_ERROR}Error: Bun or Node.js 18+ required.${C_RESET}"
    # Use /dev/tty for read when stdin might be piped
    read -p "Install Bun now? [Y/n] " install_bun < /dev/tty
    if [[ "${install_bun,,}" != "n" ]]; then
      install_bun_if_needed
      runtime="bun"
    else
      exit 1
    fi
  fi

  # Determine TUI directory based on execution mode
  local tui_dir=""
  local temp_dir=""
  
  if [[ "$IS_PIPED" == "true" ]] || [[ -z "$SCRIPT_DIR" ]] || [[ ! -d "$SCRIPT_DIR/tui" ]]; then
    # Running via curl or TUI not found locally - clone to temp directory
    temp_dir=$(mktemp -d)
    trap "rm -rf $temp_dir" EXIT
    
    echo -e "${C_MUTED}Downloading installer...${C_RESET}"
    git clone --depth 1 --quiet "$REPO_URL" "$temp_dir"
    tui_dir="$temp_dir/scripts/tui"
  else
    # Running from local repo
    tui_dir="$SCRIPT_DIR/tui"
  fi

  # Install dependencies if needed
  if [[ ! -d "$tui_dir/node_modules" ]]; then
    echo -e "${C_MUTED}Installing dependencies...${C_RESET}"
    (cd "$tui_dir" && $runtime install --silent 2>/dev/null || $runtime install)
  fi

  # Export URL for TUI if provided
  if [[ -n "$JIRA_URL" ]]; then
    export JIRA_MCP_URL="$JIRA_URL"
  fi

  # Run the TUI with proper TTY allocation
  # When running via pipe (curl | bash), stdin AND stdout are not TTY
  # OpenTUI needs BOTH connected to TTY for terminal capability detection
  # (queries written to stdout, responses read from stdin)
  if [[ ! -t 0 ]] || [[ ! -t 1 ]]; then
    # Redirect both stdin and stdout from/to /dev/tty
    (cd "$tui_dir" && $runtime run src/installer.tsx < /dev/tty > /dev/tty)
  else
    (cd "$tui_dir" && $runtime run src/installer.tsx)
  fi
}

main "$@"
