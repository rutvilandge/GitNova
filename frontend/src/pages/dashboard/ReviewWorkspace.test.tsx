import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ReviewWorkspace from "./ReviewWorkspace";

const response = (status: number, value: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => value,
  }) as Response;

afterEach(() => vi.unstubAllGlobals());

describe("pull request review form", () => {
  it("sends only the selected repository and pull request number to the backend", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(200, {}))
      .mockResolvedValueOnce(
        response(200, {
          model: "openai/gpt-oss-20b",
          review: "No actionable findings.",
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(<ReviewWorkspace api="" repository="octo/project" />);

    fireEvent.change(screen.getByLabelText("Pull request number"), {
      target: { value: "42" },
    });
    fireEvent.submit(
      screen
        .getByRole("button", { name: "Review pull request" })
        .closest("form")!,
    );

    expect(
      await screen.findByText("No actionable findings."),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const reviewCall = fetchMock.mock.calls[1];
    expect(reviewCall[0]).toBe("/api/v1/github/pull-requests/review");
    expect(JSON.parse(reviewCall[1].body)).toEqual({
      owner: "octo",
      repository: "project",
      pullNumber: 42,
    });
    expect(reviewCall[1].headers.Authorization).toBeUndefined();
  });

  it("shows severity only when the model explicitly marks a finding", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(200, {}))
      .mockResolvedValueOnce(response(200, { review: "P1: Guard the missing session token.\nReturn an authentication error before continuing." }));
    vi.stubGlobal("fetch", fetchMock);
    render(<ReviewWorkspace api="" repository="octo/project" />);
    fireEvent.change(screen.getByLabelText("Pull request number"), { target: { value: "7" } });
    fireEvent.submit(screen.getByRole("button", { name: "Review pull request" }).closest("form")!);

    const severity = await screen.findByText("p1");
    expect(severity.closest("article")).toHaveTextContent("Guard the missing session token");
  });
});
