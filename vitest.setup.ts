import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";

// Each test starts with an empty cart and a bare DOM.
beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
});
