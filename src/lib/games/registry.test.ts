import { describe, expect, it } from "vitest";
import type { ClientGameModule, ServerGameModule } from "./module";
import {
  getClientGameModule,
  getServerGameModule,
  registerClientGame,
  registerServerGame,
} from "./registry";

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

describe("server registry", () => {
  it("returns undefined for an unregistered game id", () => {
    expect(getServerGameModule("does-not-exist")).toBeUndefined();
  });

  it("returns the module registered under its id", () => {
    registerServerGame(fakeServerModule("registry-test-server-game"));

    expect(getServerGameModule("registry-test-server-game")?.id).toBe(
      "registry-test-server-game",
    );
  });
});

describe("client registry", () => {
  it("returns undefined for an unregistered game id", () => {
    expect(getClientGameModule("does-not-exist")).toBeUndefined();
  });

  it("returns the module registered under its id", () => {
    registerClientGame(fakeClientModule("registry-test-client-game"));

    expect(getClientGameModule("registry-test-client-game")?.id).toBe(
      "registry-test-client-game",
    );
  });

  it("keeps the server and client registries independent", () => {
    registerClientGame(fakeClientModule("client-only-game"));

    expect(getServerGameModule("client-only-game")).toBeUndefined();
  });
});
