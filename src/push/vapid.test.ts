import { describe, expect, test } from "vitest";
import { urlBase64ToUint8Array } from "./vapid";

describe("urlBase64ToUint8Array", () => {
  test("decodes a standard base64url string to bytes", () => {
    // "AQID" → 0x01 0x02 0x03
    expect(Array.from(urlBase64ToUint8Array("AQID"))).toEqual([1, 2, 3]);
  });

  test("handles base64url chars (-/_) and missing padding", () => {
    // 0xfb 0xff 0xbf → standard "+/+/" → base64url "-_-_"
    expect(Array.from(urlBase64ToUint8Array("-_-_"))).toEqual([0xfb, 0xff, 0xbf]);
  });
});
