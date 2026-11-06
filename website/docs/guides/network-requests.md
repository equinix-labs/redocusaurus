---
title: Network Requests and CSP
description: What Redoc 3 loads from other sites, and what to allow in a Content Security Policy
sidebar_position: 5
---

Redoc 3 is built by Redocly and talks to a few of their hosts. This page lists what a page with an API on it requests, so you can decide what to allow if your site has a strict [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) (CSP), or must not call other sites.

Checked by loading the example pages of this website in Chrome and recording every request. Apart from your own site and what your spec references, an API page requests one other host by default.

## Requested by default

| Request | Used for | If you block it |
| --- | --- | --- |
| `https://cdn.redoc.ly/redoc/logo-mini-full.svg` (`logo-mini.svg` when the sidebar is collapsed) | The "API docs by Redocly" badge at the bottom of the sidebar | The badge hides itself. Nothing else changes. |

CSP: `img-src https://cdn.redoc.ly`.

There is no Redoc option to turn the badge off. To avoid the request, leave `https://cdn.redoc.ly` out of your CSP (or block it): the badge hides itself when the image fails to load. Hiding it with CSS, for example `.redocusaurus a[href="https://redocly.com/redoc/"] { display: none; }`, removes it from view but the image is still requested.

## Only if you turn it on or use it

| Request | When | CSP |
| --- | --- | --- |
| `https://otel.cloud.redocly.com/v1/traces` | Usage events, only when `disableTelemetry` is `false`. Off by default in Redocusaurus. See [Theme Options](../getting-started/theme-options.md). | `connect-src https://otel.cloud.redocly.com` |
| `https://cdn.redocly.com/icons/...` | Icons from Redoc's font-awesome and code icon sets, only when a named icon is rendered (for example from a custom menu icon). The built-in interface doesn't request them: none were seen. | `img-src https://cdn.redocly.com` |
| Images and logos in your spec | Your spec's `x-logo` and any images in descriptions load from wherever they point. | `img-src` for those hosts |

## Only when someone clicks

The "Copy" menu at the top of a page has actions to open the page in an AI assistant. Choosing one opens `https://claude.ai/new` or `https://chatgpt.com` in a new tab with the page's text or the spec's address in the request. Nothing is sent until a reader chooses it, and there is no option to remove the menu. If your specs are private, keep that in mind.

## What does not happen

- No request is made to Redocly to load Redoc itself, its fonts or its styles: they are part of your build.
- The spec is read at build time. A remote `spec` URL is fetched while you build, not by your readers' browsers. (The download link points at it, but is only followed when clicked.)
