import { describe, it, expect, vi, beforeEach } from "vitest";

const state = vi.hoisted(() => ({
  txExecute: vi.fn(),
  txSelectResult: [] as any[],
  txUpdateResult: [] as any[],
  txInsertResult: [{ historyId: "h-1", returnId: "r-1" }] as any[],
  forUpdateCalled: false,
  dbQueryShouldNotBeCalled: vi.fn(() => {
    throw new Error("db.query must not be called outside tx in updateItemVisibility");
  }),
}));

vi.mock("../src/db/index.js", () => {
  const buildChain = (resolveTo: () => any[]) => {
    const chain: any = {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      for: vi.fn((mode: string) => {
        if (mode === "update") state.forUpdateCalled = true;
        return Promise.resolve(resolveTo());
      }),
      then: (onFulfilled: any, onRejected: any) =>
        Promise.resolve(resolveTo()).then(onFulfilled, onRejected),
    };
    return chain;
  };

  const tx = {
    execute: state.txExecute,
    select: vi.fn(() => buildChain(() => state.txSelectResult)),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve(state.txUpdateResult)),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve(state.txInsertResult)),
      })),
    })),
    query: {
      foundItems: { findFirst: vi.fn(() => Promise.resolve(null)) },
      foundSubmissions: { findFirst: vi.fn(() => Promise.resolve(null)) },
      servicePosts: { findFirst: vi.fn(() => Promise.resolve({ storageLimitDays: 365 })) },
    },
  };

  return {
    pool: { end: vi.fn() },
    db: {
      transaction: vi.fn(async (cb: any) => cb(tx)),
      query: {
        foundItems: { findFirst: state.dbQueryShouldNotBeCalled },
        foundSubmissions: { findFirst: vi.fn() },
      },
    },
  };
});

import { buildApp } from "../src/app.js";
import { authService } from "../src/modules/auth/auth.service.js";
import { uploadsService } from "../src/modules/uploads/uploads.service.js";
import { generateInventoryCode } from "../src/modules/officer/inventory-code.util.js";
import { generateReportCode } from "../src/modules/submissions/report-code.util.js";
import { officerSubmissionsService } from "../src/modules/officer/officer-submissions.service.js";
import { officerSubmissionsRepository } from "../src/modules/officer/officer-submissions.repository.js";
import { officerDispositionRepository } from "../src/modules/officer/officer-disposition.repository.js";
import { officerInventoryRepository } from "../src/modules/officer/officer-inventory.repository.js";
import { submissionsRepository } from "../src/modules/submissions/submissions.repository.js";
import type { OfficerContext } from "../src/modules/auth/auth.types.js";

const officerContext: OfficerContext = {
  user: {
    userId: "00000000-0000-4000-8000-000000000001",
    authUserId: "auth-officer-1",
    fullName: "Petugas Pos",
    email: "officer@budiluhur.ac.id",
    role: "OFFICER",
    studentNumber: null,
  },
  postId: 1,
  postName: "Pos Pengajaran",
};

describe("Officer & Submissions Logic Pure Unit Tests (No Live DB)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    state.txExecute.mockReset();
    state.txSelectResult = [];
    state.txUpdateResult = [];
    state.forUpdateCalled = false;
  });

  it("FIND-11: acquires pg_advisory_xact_lock with distinct prefix keys and computes MAX+1", async () => {
    const mockTx: any = {
      execute: vi.fn().mockResolvedValue(undefined),
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([{ maxSeq: 12 }]),
        })),
      })),
      query: {
        foundItems: { findFirst: vi.fn().mockResolvedValue(null) },
        foundSubmissions: { findFirst: vi.fn().mockResolvedValue(null) },
      },
    };

    const invCode = await generateInventoryCode(mockTx, 2026);
    const repCode = await generateReportCode(mockTx, 2026);

    expect(invCode).toBe("INV-2026-0013");
    expect(repCode).toBe("REP-2026-0013");
    expect(mockTx.execute).toHaveBeenCalledTimes(2);
    const invSqlParams = mockTx.execute.mock.calls[0][0].queryChunks
      .filter((c: any) => typeof c === "number");
    const repSqlParams = mockTx.execute.mock.calls[1][0].queryChunks
      .filter((c: any) => typeof c === "number");
    expect(invSqlParams).toEqual([1, 2026]);
    expect(repSqlParams).toEqual([2, 2026]);
  });

  it("FIND-10: updateItemVisibility reads inside tx with FOR UPDATE and returns INVALID_STATUS on 0-row update", async () => {
    state.txSelectResult = [{ itemId: "item-1", storagePostId: 1, status: "STORED" }];
    state.txUpdateResult = [];

    const res = await officerInventoryRepository.updateItemVisibility("item-1", 1, false);
    expect(state.forUpdateCalled).toBe(true);
    expect(state.dbQueryShouldNotBeCalled).not.toHaveBeenCalled();
    expect(res).toEqual({ success: false, error: "INVALID_STATUS", currentStatus: "STORED" });
  });

  it("FIND-10: cancelSubmission, receiveSubmission, rejectSubmission, returnItem, distributeItem guard status with FOR UPDATE", async () => {
    state.txSelectResult = [{ submissionId: "s-1", reporterUserId: "u-1", targetPostId: 1, status: "PENDING_RECEIPT", reportPhotoPath: "p/a.jpg" }];
    state.txUpdateResult = [];
    expect(await submissionsRepository.cancelSubmission("s-1", "u-1", "x")).toMatchObject({ success: false, error: "INVALID_STATUS" });
    expect(state.forUpdateCalled).toBe(true);

    state.forUpdateCalled = false;
    expect(await officerSubmissionsRepository.receiveSubmission({ submissionId: "s-1", officerUserId: "o-1", storagePostId: 1, publicDescription: "d" })).toMatchObject({ success: false, error: "INVALID_STATUS" });
    expect(state.forUpdateCalled).toBe(true);

    state.forUpdateCalled = false;
    expect(await officerSubmissionsRepository.rejectSubmission("s-1", "o-1", 1, "r")).toMatchObject({ success: false, error: "INVALID_STATUS" });
    expect(state.forUpdateCalled).toBe(true);

    state.txSelectResult = [{ itemId: "i-1", storagePostId: 1, status: "STORED", privateVerificationNotes: null }];
    state.forUpdateCalled = false;
    expect(await officerDispositionRepository.returnItem({ itemId: "i-1", officerUserId: "o-1", storagePostId: 1, recipientName: "A", verificationSummary: "V" })).toMatchObject({ success: false, error: "INVALID_STATUS" });
    expect(state.forUpdateCalled).toBe(true);

    state.forUpdateCalled = false;
    expect(await officerDispositionRepository.distributeItem("i-1", 1, "Catatan")).toMatchObject({ success: false, error: "INVALID_STATUS" });
    expect(state.forUpdateCalled).toBe(true);
  });

  it("FIND-27: receiveSubmission does NOT consume upload token if pre-check fails", async () => {
    const consumeSpy = vi.spyOn(uploadsService, "verifyAndConsumeUploadToken");
    const precheckSpy = vi.spyOn(officerSubmissionsRepository, "checkSubmissionReceiveEligibility");

    precheckSpy.mockResolvedValueOnce({ eligible: false, error: "NOT_FOUND" });
    await expect(
      officerSubmissionsService.receiveSubmission(officerContext, "sub-1", {
        public_description: "desc",
        item_photo_upload_tokens: ["tok-1"],
      })
    ).rejects.toMatchObject({ statusCode: 404 });

    precheckSpy.mockResolvedValueOnce({ eligible: false, error: "FORBIDDEN" });
    await expect(
      officerSubmissionsService.receiveSubmission(officerContext, "sub-1", {
        public_description: "desc",
        item_photo_upload_tokens: ["tok-1"],
      })
    ).rejects.toMatchObject({ statusCode: 403 });

    precheckSpy.mockResolvedValueOnce({ eligible: false, error: "INVALID_STATUS", currentStatus: "CANCELLED" });
    await expect(
      officerSubmissionsService.receiveSubmission(officerContext, "sub-1", {
        public_description: "desc",
        item_photo_upload_tokens: ["tok-1"],
      })
    ).rejects.toMatchObject({ statusCode: 409, code: "INVALID_STATUS_TRANSITION" });

    expect(consumeSpy).not.toHaveBeenCalled();
  });

  it("FIND-28 & FIND-24: routes reject invalid queries with 400 VALIDATION_ERROR and accept optional distribute notes", async () => {
    const app = buildApp();
    await app.ready();

    vi.spyOn(authService, "verifyToken").mockReturnValue({ sub: officerContext.user.authUserId });
    vi.spyOn(authService, "getUserByAuthId").mockResolvedValue(officerContext.user);
    vi.spyOn(authService, "getOfficerPost").mockResolvedValue({ postId: 1, name: "Pos Pengajaran" });

    const r1 = await app.inject({ method: "GET", url: "/api/v1/submissions/me?status=INVALID", headers: { authorization: "Bearer t" } });
    const r2 = await app.inject({ method: "GET", url: "/api/v1/officer/submissions?page=0", headers: { authorization: "Bearer t" } });
    const r3 = await app.inject({ method: "GET", url: "/api/v1/officer/inventory?limit=101", headers: { authorization: "Bearer t" } });
    expect([r1.statusCode, r2.statusCode, r3.statusCode]).toEqual([400, 400, 400]);
    expect(JSON.parse(r1.body).error.code).toBe("VALIDATION_ERROR");
    expect(JSON.parse(r2.body).error.code).toBe("VALIDATION_ERROR");
    expect(JSON.parse(r3.body).error.code).toBe("VALIDATION_ERROR");

    const distSpy = vi.spyOn(officerDispositionRepository, "distributeItem").mockResolvedValue({
      success: true,
      item: {
        itemId: "550e8400-e29b-41d4-a716-446655440000",
        inventoryCode: "INV-2026-0001",
        sourceSubmissionId: null,
        recordedByUserId: officerContext.user.userId,
        storagePostId: 1,
        itemName: "Payung",
        category: "Aksesori",
        publicDescription: "Payung hijau",
        privateVerificationNotes: "[DISALURKAN] DKM Masjid",
        foundLocation: null,
        foundOn: null,
        receivedAt: new Date("2026-10-20T10:00:00Z"),
        storageLimitDays: 365,
        archivedAt: null,
        status: "DISTRIBUTED",
        isVisible: false,
      },
      photo: null,
    });

    const okEmpty = await app.inject({
      method: "POST",
      url: "/api/v1/officer/items/550e8400-e29b-41d4-a716-446655440000/distribute",
      headers: { authorization: "Bearer t" },
    });
    expect(okEmpty.statusCode).toBe(200);
    expect(distSpy).toHaveBeenLastCalledWith("550e8400-e29b-41d4-a716-446655440000", 1, undefined);

    const okNotes = await app.inject({
      method: "POST",
      url: "/api/v1/officer/items/550e8400-e29b-41d4-a716-446655440000/distribute",
      headers: { authorization: "Bearer t" },
      payload: { notes: "  DKM Masjid  " },
    });
    expect(okNotes.statusCode).toBe(200);
    expect(distSpy).toHaveBeenLastCalledWith("550e8400-e29b-41d4-a716-446655440000", 1, "DKM Masjid");

    const badExtra = await app.inject({
      method: "POST",
      url: "/api/v1/officer/items/550e8400-e29b-41d4-a716-446655440000/distribute",
      headers: { authorization: "Bearer t" },
      payload: { extra: "nope" },
    });
    expect(badExtra.statusCode).toBe(400);

    await app.close();
  });
});
