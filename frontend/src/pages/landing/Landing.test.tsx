import { fireEvent, render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Landing from "./Landing";

describe("GITNOVA landing page", () => {
  it("shows the product headline and original journey sections", () => {
    const { container } = render(
      <BrowserRouter>
        <Landing />
      </BrowserRouter>,
    );
    expect(container.querySelector("h1")?.textContent).toContain(
      "Understand every commit.",
    );
    expect(screen.getByText("How It Works")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "AI PR Review" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Repository-Aware RAG Chat" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /GITNOVA helps you understand it/ }),
    ).toBeInTheDocument();
  });

  it("switches between clearly labeled product capability previews", async () => {
    render(<BrowserRouter><Landing /></BrowserRouter>);
    const graphTab = screen.getByRole("tab", { name: "Dependency graph" });
    fireEvent.click(graphTab);
    expect(graphTab).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByText("repository dependency map")).toBeInTheDocument();
    expect(screen.getByText(/Illustrative interface preview/)).toBeInTheDocument();
  });
});
