# MCP

This folder is reserved for project-specific MCP (Model Context Protocol) setup.

## Purpose

Use this directory to keep MCP-related files that help tools and agents work with this payroll system in a structured way.

Examples:

- server configuration files
- local development connector examples
- project-specific MCP notes
- prompt or workflow references for connected MCP tools

## Files

- `servers.example.json`: example MCP server definitions for local development
- `servers.local.json`: optional local-only config for your machine

## Usage

1. Copy `servers.example.json` to `servers.local.json`
2. Replace placeholder values with your local paths or credentials
3. Keep `servers.local.json` private and do not commit secrets

## Notes

- `servers.local.json` is ignored by Git
- The example file is safe to keep in the repository
- You can expand this folder later with more MCP-specific project assets
