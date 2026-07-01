import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PALETTE, assignColor, isNew, bucketTasks, isOverdue, ymd, monthGrid,
} from "../assets/team-util.js";

test("assignColor: 사용 안 된 첫 색 반환", () => {
  assert.equal(assignColor([PALETTE[0]]), PALETTE[1]);
});

test("assignColor: 다 쓰면 처음으로 순환", () => {
  assert.equal(assignColor([...PALETTE]), PALETTE[0]);
});

test("isNew: 마지막 방문 이후면 true", () => {
  assert.equal(isNew("2026-06-30T10:00:00Z", "2026-06-30T09:00:00Z"), true);
});

test("isNew: 마지막 방문 이전이면 false", () => {
  assert.equal(isNew("2026-06-30T08:00:00Z", "2026-06-30T09:00:00Z"), false);
});

test("isNew: 마지막 방문 없으면 false (첫 진입은 NEW 폭주 방지)", () => {
  assert.equal(isNew("2026-06-30T08:00:00Z", null), false);
});

test("bucketTasks: 상태별 분류 + 예정일 빠른 순(날짜없음 맨아래)", () => {
  const tasks = [
    { id: "a", status: "done", due_date: "2026-07-01" },
    { id: "b", status: "todo", due_date: "2026-07-10" },
    { id: "c", status: "todo", due_date: "2026-07-05" },
    { id: "d", status: "todo", due_date: null },
  ];
  const b = bucketTasks(tasks);
  assert.deepEqual(b.todo.map((t) => t.id), ["c", "b", "d"]);
  assert.deepEqual(b.doing.map((t) => t.id), []);
  assert.deepEqual(b.done.map((t) => t.id), ["a"]);
});

test("bucketTasks: 같은 날짜는 시간 빠른 순", () => {
  const tasks = [
    { id: "x", status: "todo", due_date: "2026-07-05", due_time: "22:30" },
    { id: "y", status: "todo", due_date: "2026-07-05", due_time: "10:00" },
  ];
  assert.deepEqual(bucketTasks(tasks).todo.map((t) => t.id), ["y", "x"]);
});

test("isOverdue: 마감 지나고 미완료면 true", () => {
  assert.equal(isOverdue("2026-06-29", "2026-06-30", "todo"), true);
});

test("isOverdue: 완료면 false", () => {
  assert.equal(isOverdue("2026-06-29", "2026-06-30", "done"), false);
});

test("isOverdue: 마감 없으면 false", () => {
  assert.equal(isOverdue(null, "2026-06-30", "todo"), false);
});

test("ymd: 로컬 날짜 YYYY-MM-DD", () => {
  assert.equal(ymd(new Date(2026, 5, 3)), "2026-06-03");
});

test("monthGrid: 7의 배수 그리드이고 6/1을 포함", () => {
  const g = monthGrid(2026, 5); // month 0-based: 5 = June
  assert.equal(g.length % 7, 0);
  const first = g.find((c) => c.day === 1 && c.inMonth);
  assert.equal(first.iso, "2026-06-01");
});
