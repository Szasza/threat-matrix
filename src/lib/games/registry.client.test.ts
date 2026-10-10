import { describe, expect, it } from "vitest";
import type { ClientGameModule } from "./module";
import { getClientGameModule, registerClientGame } from "./registry.client";

function fakeClientModule(
  id: string,
): ClientGameModule<{ marker: string }, unknown> {
  return {
    id,
    isInSetup: () => true,
    SetupOptions: () => null,
    GameView: () => null,
  };
}

describe("registry.client", () => {
  it("returns undefined for an unregistered game id", () => {
    expect(getClientGameModule("does-not-exist")).toBeUndefined();
  });

  it("returns the module registered under its id", () => {
    registerClientGame(fakeClientModule("registry-client-test-game"));

    expect(getClientGameModule("registry-client-test-game")?.id).toBe(
      "registry-client-test-game",
    );
  });
});
