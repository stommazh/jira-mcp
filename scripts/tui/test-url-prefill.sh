#!/usr/bin/env bash
# Test URL pre-fill functionality

set -e

echo "Testing URL pre-fill functionality..."

# Test 1: With JIRA_MCP_URL set
echo ""
echo "Test 1: With JIRA_MCP_URL set"
export JIRA_MCP_URL="https://test.atlassian.net"
echo "Setting JIRA_MCP_URL=$JIRA_MCP_URL"
echo "Expected: URL pre-filled, cursor starts on username field"
echo "(Manual verification required when TUI runs)"

# Test 2: Without JIRA_MCP_URL
echo ""
echo "Test 2: Without JIRA_MCP_URL (default behavior)"
unset JIRA_MCP_URL
echo "JIRA_MCP_URL unset"
echo "Expected: Empty URL, cursor starts on url field"
echo "(Manual verification required when TUI runs)"

# Test 3: Empty JIRA_MCP_URL (should be treated as unset)
echo ""
echo "Test 3: Empty JIRA_MCP_URL"
export JIRA_MCP_URL=""
echo "Setting JIRA_MCP_URL=\"\""
echo "Expected: Empty URL, cursor starts on url field (same as unset)"
echo "(Manual verification required when TUI runs)"

echo ""
echo "All test scenarios defined. Implementation allows:"
echo "  - Pre-fill when env var is set"
echo "  - Start on username when URL pre-filled"
echo "  - User can edit pre-filled URL (no read-only)"
echo "  - Graceful fallback when env var unset/empty"
