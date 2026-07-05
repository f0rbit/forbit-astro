import { test, expect } from "bun:test";
import { format_duration } from "../../src/utils";

const MS_PER_DAY = 86_400_000;
const DAYS_PER_MONTH = 30.436875;
const MS_PER_MONTH = DAYS_PER_MONTH * MS_PER_DAY;
const MS_PER_HOUR = 3_600_000;

const start = new Date(2024, 0, 1);

function months_later(n: number): Date {
	return new Date(start.getTime() + n * MS_PER_MONTH);
}
function days_later(n: number): Date {
	return new Date(start.getTime() + n * MS_PER_DAY);
}
function hours_later(n: number): Date {
	return new Date(start.getTime() + n * MS_PER_HOUR);
}

test('format_duration: 24 months → "2 years"', () => {
	expect(format_duration(start, months_later(24))).toBe("2 years");
});

test('format_duration: 16 months → "1 years" (Math.round(16/12) = 1)', () => {
	expect(format_duration(start, months_later(16))).toBe("1 years");
});

test('format_duration: 18 months → "2 years" (Math.round(18/12) = 1.5 → 2)', () => {
	expect(format_duration(start, months_later(18))).toBe("2 years");
});

test('format_duration: 15.999 months → "16 months" (falls to months branch)', () => {
	expect(format_duration(start, months_later(15.999))).toBe("16 months");
});

test('format_duration: 6 months → "6 months"', () => {
	expect(format_duration(start, months_later(6))).toBe("6 months");
});

test('format_duration: 2 months → "2 months"', () => {
	expect(format_duration(start, months_later(2))).toBe("2 months");
});

test('format_duration: 1.5 months → "46 days" (falls to days branch, Math.ceil(45.6))', () => {
	expect(format_duration(start, months_later(1.5))).toBe("46 days");
});

test('format_duration: 5 days → "5 days"', () => {
	expect(format_duration(start, days_later(5))).toBe("5 days");
});

test('format_duration: 3 days exactly → "3 days"', () => {
	expect(format_duration(start, days_later(3))).toBe("3 days");
});

test('format_duration: 2.99 days → "72 hours" (falls to hours branch, Math.ceil(71.76))', () => {
	expect(format_duration(start, days_later(2.99))).toBe("72 hours");
});

test('format_duration: 5 hours → "5 hours"', () => {
	expect(format_duration(start, hours_later(5))).toBe("5 hours");
});

test('format_duration: 0 duration → "0 hours"', () => {
	expect(format_duration(start, start)).toBe("0 hours");
});
