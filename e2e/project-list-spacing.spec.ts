import { expect, test } from "@playwright/test";

const VIEWPORTS = [
  { name: "desktop-768", width: 768, height: 1024 },
  { name: "desktop-1024", width: 1024, height: 768 },
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "mobile-390", width: 390, height: 844 },
] as const;

for (const viewport of VIEWPORTS) {
  for (const locale of ["pt", "en"] as const) {
    test(`mantém o conteúdo da tabela dentro das linhas (${viewport.name}, ${locale})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/projects");

      if (locale === "en") {
        await page.getByRole("button", { name: "Trocar idioma" }).click();
        await expect(page.getByRole("button", { name: "Switch language" })).toHaveText("EN");
      }

      const table = page.locator("[data-tabela]");
      await expect(table).toBeVisible();

      const geometry = await table.evaluate((root, isDesktop) => {
        const header = root.querySelector<HTMLElement>(":scope > div:first-child");
        const rows = [...root.querySelectorAll<HTMLElement>("[data-projeto]")];
        const rect = (element: Element) => {
          const box = element.getBoundingClientRect();
          return { x: box.x, y: box.y, width: box.width, height: box.height };
        };
        const within = (inner: DOMRect, outer: DOMRect) =>
          inner.top >= outer.top - 0.5 &&
          inner.bottom <= outer.bottom + 0.5 &&
          inner.left >= outer.left - 0.5 &&
          inner.right <= outer.right + 0.5;

        if (!header) throw new Error("cabeçalho da tabela ausente");

        const headerCells = [...header.children].map(rect);
        const rowGeometry = rows.map((row) => {
          const rowRect = row.getBoundingClientRect();
          const cells = [...row.children].map((cell) => ({
            rect: rect(cell),
            withinRow: within(cell.getBoundingClientRect(), rowRect),
            topPadding: cell.getBoundingClientRect().top - rowRect.top,
            bottomPadding: rowRect.bottom - cell.getBoundingClientRect().bottom,
          }));
          return {
            slug: row.dataset.projeto,
            rect: rect(row),
            cells,
          };
        });

        return { headerCells, rows: rowGeometry, isDesktop };
      }, viewport.width >= 768);

      expect(geometry.rows).toHaveLength(7);
      for (const row of geometry.rows) {
        expect(row.cells).toHaveLength(3);
        expect(row.cells.every((cell) => cell.withinRow)).toBe(true);
        expect(row.cells[1].topPadding).toBeGreaterThanOrEqual(12);
        expect(row.cells[1].bottomPadding).toBeGreaterThanOrEqual(12);
      }

      for (let index = 1; index < geometry.rows.length; index += 1) {
        expect(geometry.rows[index].rect.y).toBeGreaterThanOrEqual(
          geometry.rows[index - 1].rect.y + geometry.rows[index - 1].rect.height - 0.5,
        );
      }

      if (geometry.isDesktop) {
        expect(geometry.headerCells).toHaveLength(3);
        for (const row of geometry.rows) {
          expect(row.rect.height).toBeGreaterThanOrEqual(64);
          for (let index = 0; index < 3; index += 1) {
            expect(row.cells[index].rect.x).toBeCloseTo(geometry.headerCells[index].x, 0);
            expect(row.cells[index].rect.width).toBeCloseTo(
              geometry.headerCells[index].width,
              0,
            );
          }
        }
      }
    });
  }
}
