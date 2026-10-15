# Daymark — Kanban Lite

A responsive task board built with semantic HTML, CSS, and vanilla JavaScript. Tasks and appearance preference are stored locally in your browser.

## Features

- Create tasks with a title, optional description, category, priority, and starting column.
- Move tasks with the status menu or native drag and drop.
- Search by title and filter by category.
- See live task counts and active/completed totals.
- Switch between light and dark appearance.
- Use the board on desktop, tablet, or mobile.

## Run locally

Open `index.html` in a modern browser. No build step or dependencies are required. Google Fonts are optional; the page falls back to system sans-serif fonts.

## Deploy with GitHub Pages

1. Add these files to the root of your GitHub repository.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, then save.
4. Wait for the Pages deployment to finish. GitHub will show the live address in the Pages settings.

## Storage

The board saves tasks and theme preference in `localStorage` on the current browser and device. It does not send task data to a server.

## License

See [LICENSE.txt](LICENSE.txt).
