# dsh-sidebar-entry-manager

A visibility switch for the plugin entries in the DeepSeek Harness left sidebar.

The DSH sidebar shell only draws whatever is registered in `sidebar.panellist`; it ships **no** per-entry visibility control, and the official "More" menu deliberately offers no pin/hide action. Today the only way to lose a row is to disable the whole plugin — losing the feature with it.

This plugin adds the missing step: **hide the row, keep the plugin running**.

## After install

**Gear at the bottom of the sidebar → Settings → Sidebar entries**

The page lists whatever is actually registered right now (install another plugin and its row shows up without a release), one **switch** per entry:

- off → the row stops being drawn in the left navigation (including the collapsed icon rail);
- on → it comes straight back;
- "Show everything again" resets the list.

The choice lives on the Host (`~/.dsh/sidebar-entry-manager.json`), so it survives a port change, a restart, and a different browser.

## Plugin updates (v0.2.0)

The same section ends with a **Plugin update** block:

- current version, a silent check when the page opens, and a manual "Check for updates";
- when a newer version exists, "Update now" goes through the plugin market's public update API (`/dsh-market/api/v1/*`) — the market installs, verifies the version and keeps a rollback point;
- an **Auto-update** switch (off by default): when on, a newer version is installed automatically on open; if conversations are running the market refuses and the plugin simply reports it instead of forcing the update;
- completion follows the market's `refreshRequired` / `restartRequired` outcome ("refresh the page" or "restart the app").

## What it actually changes

Only the **row's rendering**: the row gets `display:none` while React keeps owning the node. The plugin, its page, its shortcuts and its services are untouched.

This is not a replacement for disabling a plugin — do that on the Plugins page when you want the resources back. This is for "keep it, just get it out of my sidebar".

## One warning

The `plugins` entry (the plugin manager) can be hidden too, but then the sidebar has no plugin manager entry left. Settings is unaffected, so recovery is always one click away.

## Known limits

- Governs the root-scope global panel rows (`sidebar.panellist`) only. The right side card's tab visibility is `dsh-better-sidebar`'s own "Side card" settings section; the two never fight.
- Rows are drawn by the shell with no id attribute, so this plugin maps DOM rows back to declared ids by index, cross-checked against `aria-label`. If two plugins register the same label *and* the order moves, a row can be mismatched — toggle it off and on again to resettle.
- The `plugins` entry is `plugins`; `dshmarket`'s market row is `dsh-market`. Independent.
- Auto-update depends on the plugin market's public update API; without the market only a manual-update hint is shown.

## Install

```powershell
dsh plugin --profile desktop add "<absolute path>\dsh-sidebar-entry-manager-0.2.0.tgz"
```

Or paste the package name into **Plugins → Add plugin** once it is on npm.

## Development

```powershell
node scripts/build.mjs   # src/ → lib/ (browser half wrapped in the __ModuleLoader__ envelope, version injected)
node --test              # 25 cases, zero dependencies
```

- `src/host.js` → `lib/index.js`: the state file (`hidden` + `autoUpdate`) plus one fenced `/api/dsh-sidebar-entry-manager/state` route (GET reads, POST writes).
- `src/client.js` → `lib/client.js`: DOM visibility, the `settings.section` page, and the update panel.

## License

MIT
