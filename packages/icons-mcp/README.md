# @vezham/icons-mcp

Search the Vezham Icons catalog, inspect SVG markup, and generate framework snippets from the CLI or an MCP client.

## Run from the CLI

```sh
npx -y @vezham/icons-mcp apply home --framework react --weight filled
```

The command returns the import and a JSX snippet for the filled Home icon.

## Connect an MCP client

Start the package without arguments to run the server over stdio. For clients that use `mcpServers`, add this entry to the client configuration.

```json
{
  "mcpServers": {
    "vezham-icons": {
      "command": "npx",
      "args": ["-y", "@vezham/icons-mcp"]
    }
  }
}
```

[MCP and CLI guide](https://oss.vezham.com/docs/assets/guides/mcp)
