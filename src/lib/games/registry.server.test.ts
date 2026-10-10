import { describe, expect, it } from "vitest";
import type { ServerGameModule } from "./module";
import { getServerGameModule, registerServerGame } from "./registry.server";

function fakeServerModule(
  id: string,
): ServerGameModule<{ marker: string }, unknown> {
  return {
    id,
    store: {
      createGame: () => ({ marker: id }),
      getGame: () => undefined,
      startGame: () => undefined,
      subscribe: () => () => {},
    },
    actions: {},
    getPublicState: () => null,
  };
}

describe("registry.server", () => {
  it("returns undefined for an unregistered game id", () => {
    expect(getServerGameModule("does-not-exist")).toBeUndefined();
  });

  it("returns the module registered under its id", () => {
    registerServerGame(fakeServerModule("registry-server-test-game"));

    expect(getServerGameModule("registry-server-test-game")?.id).toBe(
      "registry-server-test-game",
    );
  });
});
