# Annotate

**AI-powered Chrome sidebar for clipping, annotating, and sharing moments from any media on the web.**

Open the side panel on any page — a YouTube video, a podcast, a news article — highlight or scrub a moment, write your take (or accept an AI-drafted one), and publish a shareable, source-linked page. An agent watches what you clip and drafts the annotation, suggests key moments, and enriches your commentary with sourced context.

🔗 **Live app:** https://annotate.metisos.co

---

## Install the extension

Annotate is live on the Chrome Web Store:

👉 **[Add Annotate to Chrome](https://chromewebstore.google.com/detail/kbfnejmkbfchkimiphfbnegpmngabboa)**

Click **Add to Chrome**, then pin Annotate so it's one click away. On any page (YouTube, an article, a podcast), click the Annotate icon to open the side panel, **sign in with Google**, and start clipping. Everything you publish appears on the web app at `https://annotate.metisos.co` immediately — no local server needed.

> Install instructions are also available in-app at https://annotate.metisos.co/install-extension.

<details>
<summary><strong>Prefer to load it unpacked?</strong> (developers)</summary>

No build tools required — it takes about a minute.

1. **Download the build** — grab [`annotate-extension.zip`](https://github.com/metisos/annotate/raw/main/apps/extension/annotate-extension.zip), then unzip it. You'll get a folder named `annotate-extension`.
2. **Open Chrome extensions** — go to `chrome://extensions` and turn on **Developer mode** (top-right toggle).
3. **Load unpacked** — click **Load unpacked** and select the `annotate-extension` folder you just unzipped. Pin Annotate so it's one click away.
4. **Use it** — on any page, click the Annotate icon to open the side panel, **sign in with Google**, and start clipping.

</details>

---

## What it does

- **Clip media** — YouTube/video and podcast/audio (clip a time range, transcoded server-side), or highlight a passage of text on any web page.
- **AI assist** — Gemini drafts your commentary, suggests the best moments to clip, and enriches it with grounded, sourced context cards.
- **Shareable pages** — every annotation becomes an editorial page at `/clip/[slug]` that links back to the original source.
- **Social layer** — follow people, comment, and discover what others are clipping, with a per-source aggregated view.

---

## Build from source (optional)

Requires Node 20+ and [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm build:ext        # outputs apps/extension/dist
```

Then load `apps/extension/dist` as an unpacked extension (same steps as above). To run the web app locally, see `apps/web` and copy `.env.example` to `.env.local`.

---

## Repository layout

```
apps/
  extension/   Chrome side-panel extension (Manifest V3, Vite + React)
  web/         Next.js 15 web app — public pages + API
packages/
  shared/      Shared TypeScript types, themes, and AI prompts
```

---

## Contact

Questions? Email [cjohnson@metisos.com](mailto:cjohnson@metisos.com).
