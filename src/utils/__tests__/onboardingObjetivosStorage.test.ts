import { beforeEach, describe, expect, test } from "vitest";
import {
  getStoredObjetivos,
  setStoredObjetivos,
  clearStoredObjetivos,
  getStoredResponseId,
  setStoredResponseId,
  clearStoredResponseId,
} from "../onboardingObjetivosStorage";

beforeEach(() => {
  sessionStorage.clear();
});

describe("answers storage", () => {
  test("get vazio retorna null", () => {
    expect(getStoredObjetivos()).toBeNull();
  });

  test("set/get round-trip", () => {
    setStoredObjetivos({ answers: ["sono", "estresse"], skipped: false });
    expect(getStoredObjetivos()).toEqual({ answers: ["sono", "estresse"], skipped: false });
  });

  test("clear remove", () => {
    setStoredObjetivos({ answers: [], skipped: true });
    clearStoredObjetivos();
    expect(getStoredObjetivos()).toBeNull();
  });

  test("get tolera JSON malformado", () => {
    sessionStorage.setItem("eco.assinar.objetivos.v1", "not-json");
    expect(getStoredObjetivos()).toBeNull();
  });
});

describe("responseId storage", () => {
  test("get vazio retorna null", () => {
    expect(getStoredResponseId()).toBeNull();
  });

  test("set/get round-trip", () => {
    setStoredResponseId("uuid-1");
    expect(getStoredResponseId()).toBe("uuid-1");
  });

  test("clear remove", () => {
    setStoredResponseId("uuid-1");
    clearStoredResponseId();
    expect(getStoredResponseId()).toBeNull();
  });
});
