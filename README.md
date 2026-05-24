# n8n-nodes-syncx

This is an n8n community node for **SyncX** — a no-code AI platform for sales and support that connects AI agents with business tools and workflows.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

---

## Nodes

### SyncX (Action)
Interact with leads in SyncX.

**Operations:**
- **Create or Update Lead** — Create a new lead or update an existing one in a smartsheet

### SyncX Trigger
Start a workflow when something happens in SyncX.

**Events:**
- **Lead Stage Updated** — Fires whenever a lead moves to a new pipeline stage (webhook-based)

---

## Credentials

You need a **Domain** and an **API Key** from your SyncX account:

1. Log in to your SyncX instance (e.g. `https://app.syncx.dev`)
2. Go to **Integrations → API Keys**
3. Copy your API key

In n8n, create a new **SyncX API** credential and fill in:
- **Domain** — your SyncX base URL, e.g. `https://app.syncx.dev`
- **API Key** — the key you copied above

---

## Installation

### n8n Cloud
> Community nodes on n8n Cloud require verification. Once verified, search for `n8n-nodes-syncx` in the nodes panel.

### Self-hosted n8n

```bash
# Navigate to your n8n custom nodes directory
cd ~/.n8n/nodes

# Install the package
npm install n8n-nodes-syncx
```

Restart n8n after installation.

---

## Compatibility

- **n8n** version `0.198.0` or later
- **Node.js** version `18.10` or later

---

## Usage

### Action — Create or Update Lead

1. Add a **SyncX** node to your workflow
2. Select **Create or Update Lead**
3. Pick a **Smartsheet**, **Pipeline**, and enter a **Phone Number** (required)
4. Fill in any optional fields (name, email, stage, agents, teams, etc.)
5. For custom smartsheet columns, use the **Extra Smartsheet Columns** section — column names load from the selected smartsheet

### Trigger — Lead Stage Updated

1. Add a **SyncX Trigger** node as the first node in your workflow
2. Select your **Smartsheet**, **Pipeline**, and one or more **Stages** to watch
3. **Activate** the workflow — n8n will automatically register a webhook with SyncX
4. When a lead moves to one of the watched stages, SyncX will send the event to n8n and the workflow will run
5. Deactivating the workflow automatically unregisters the webhook from SyncX

---

## Resources

- [SyncX website](https://syncx.dev)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [Report an issue](https://github.com/dev-syncx/n8n-nodes-syncx/issues)

---

## License

[MIT](LICENSE)
