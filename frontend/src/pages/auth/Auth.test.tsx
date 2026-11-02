import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import Login from "./Login";
import Signup from "./Signup";

const response = (status: number, value: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => value,
    text: async () => (typeof value === "string" ? value : ""),
    clone() {
      return this;
    },
  }) as Response;

afterEach(() => vi.unstubAllGlobals());

describe("authentication forms", () => {
  it("shows a server login error and returns to the idle state", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(200, {}))
      .mockResolvedValueOnce(
        response(401, { error: "Email or password was not recognized." }),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "dev@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "correct-horse-battery" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Sign in" }).closest("form")!,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Email or password was not recognized.",
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("blocks signup when the confirmation does not match", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Your name"), {
      target: { value: "Ada" },
    });
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "ada@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password", { selector: "input" }), {
      target: { value: "correct-horse-battery" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "different-password" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Create account" }).closest("form")!,
    );

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "The passwords do not match.",
      ),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
