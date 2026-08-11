import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BottomNav from "@/components/app/BottomNav";
import { NAV_ITEMS } from "@/components/app/navItems";

const renderNav = (pathname = "/app", onCreate = () => {}) =>
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <BottomNav onCreate={onCreate} />
    </MemoryRouter>,
  );

describe("BottomNav", () => {
  it("renders every tab plus the centre create button", () => {
    renderNav();
    for (const item of NAV_ITEMS) {
      expect(screen.getByRole("link", { name: item.label })).toHaveAttribute("href", item.to);
    }
    expect(screen.getByRole("button", { name: "Create a new plan" })).toBeInTheDocument();
  });

  it("puts Maps directly after Explore", () => {
    const labels = NAV_ITEMS.map((i) => i.label);
    expect(labels.indexOf("Maps")).toBe(labels.indexOf("Explore") + 1);
  });

  it("marks the home tab active on /app and its /plans alias", () => {
    const { unmount } = renderNav("/app");
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
    unmount();

    renderNav("/plans");
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
  });

  it("marks the Maps tab active on /maps", () => {
    renderNav("/maps");
    expect(screen.getByRole("link", { name: "Maps" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("opens the create dialog from the centre button", () => {
    const onCreate = vi.fn();
    renderNav("/app", onCreate);
    fireEvent.click(screen.getByRole("button", { name: "Create a new plan" }));
    expect(onCreate).toHaveBeenCalledOnce();
  });
});
