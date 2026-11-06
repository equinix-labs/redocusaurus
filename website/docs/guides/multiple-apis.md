---
title: Showing Multiple APIs
sidebar_position: 2
---

## Nested View with MDX

To display multiple API docs with the Docusaurus sidebar for navigation you can use the MDX component `@theme/ApiDocMdx` along with the setting `hide_table_of_contents` for the file. For an example check the "Nested Docs Example" section in the sidebar.

```mdx
---
title: API 1 - Swagger Petstore
hide_table_of_contents: true
---

import ApiDocMdx from '@theme/ApiDocMdx';

<ApiDocMdx id="using-single-yaml" />
```

The output of the above is viewable here: [Nested API 1](/docs/nested/nested-1).

An API embedded this way has less room than a full page, so it uses Redoc 3's `stacked` layout (the navigation and the content in two columns, with the overview inside the content). To use the three columns instead, set `layout: three-panel` in your [Redoc options](../getting-started/theme-options.md#options-optional-object).

### Links inside an embedded API

This applies wherever you put an API on a page of your own: `<ApiDocMdx>` in an MDX page, or `@theme/Redoc` or `@theme/ApiDoc` in a custom React page. Redoc 3 puts its links below the path of the page it is on (for example `/docs/nested/nested-1/pet/getpetbyid`). Clicking around inside the page works, but there is no page at those addresses, so **reloading, or opening a copied link to one, returns a 404**. An API that has its own `route` (set on the spec) does not have this: every tag and operation is a page of its own. If readers need to link to or reload a specific operation, give the API its own `route` and link to that instead.

## Full Pages with links in Dropdown

For a simpler solution just add all the routes in a Navbar Dropdown (see [docs](https://docusaurus.io/docs/api/themes/configuration#navbar-dropdown)). This is how the "Examples" of this website is structured.
