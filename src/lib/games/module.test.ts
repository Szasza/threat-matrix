import { describe, expect, it } from "vitest";
import { authorizeAction } from "./module";

const room = {
  hostParticipantId: "host-1",
  participants: [
    { id: "host-1", displayName: "Host", joinedAt: 0, lastSeenAt: 0 },
    { id: "player-1", displayName: "Player", joinedAt: 0, lastSeenAt: 0 },
  ],
};

describe("authorizeAction", () => {
  describe('"host"', () => {
    it("allows the host", () => {
      expect(authorizeAction("host", room, "host-1")).toEqual({ ok: true });
    });

    it("rejects a non-host participant", () => {
      expect(authorizeAction("host", room, "player-1")).toEqual({
        ok: false,
        status: 403,
        message: "Only the host can perform this action.",
      });
    });

    it("rejects a missing participant id", () => {
      expect(authorizeAction("host", room, undefined)).toMatchObject({
        ok: false,
        status: 403,
      });
    });
  });

  describe('"non-host-participant"', () => {
    it("allows a non-host participant", () => {
      expect(authorizeAction("non-host-participant", room, "player-1")).toEqual(
        { ok: true },
      );
    });

    it("rejects the host — this is the exact check D&D1's vote route enforces", () => {
      expect(authorizeAction("non-host-participant", room, "host-1")).toEqual({
        ok: false,
        status: 403,
        message: "The game master cannot perform this action.",
      });
    });

    it("rejects someone who isn't a participant at all", () => {
      expect(authorizeAction("non-host-participant", room, "stranger")).toEqual(
        {
          ok: false,
          status: 403,
          message: "Only room participants can perform this action.",
        },
      );
    });
  });

  describe('"participant"', () => {
    it("allows the host", () => {
      expect(authorizeAction("participant", room, "host-1")).toEqual({
        ok: true,
      });
    });

    it("allows a non-host participant", () => {
      expect(authorizeAction("participant", room, "player-1")).toEqual({
        ok: true,
      });
    });

    it("rejects someone who isn't a participant at all", () => {
      expect(authorizeAction("participant", room, "stranger")).toEqual({
        ok: false,
        status: 403,
        message: "Only room participants can perform this action.",
      });
    });
  });
});
