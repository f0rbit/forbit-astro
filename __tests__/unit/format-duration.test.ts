import { test, expect } from "bun:test";
import { duration as createDuration } from "moment";
import { format_duration } from "../../src/utils";

test('format_duration: 24 months → "2 years"', () => {
	const duration = createDuration(24, "months");
	expect(format_duration(duration)).toBe("2 years");
});

test('format_duration: 16 months → "1 years" (Math.round(16/12) = 1)', () => {
	const duration = createDuration(16, "months");
	expect(format_duration(duration)).toBe("1 years");
});

test('format_duration: 18 months → "2 years" (Math.round(18/12) = 1.5 → 2)', () => {
	const duration = createDuration(18, "months");
	expect(format_duration(duration)).toBe("2 years");
});

test('format_duration: 15.999 months → "16 months" (falls to months branch)', () => {
	const duration = createDuration(15.999, "months");
	expect(format_duration(duration)).toBe("16 months");
});

test('format_duration: 6 months → "6 months"', () => {
	const duration = createDuration(6, "months");
	expect(format_duration(duration)).toBe("6 months");
});

test('format_duration: 2 months → "2 months"', () => {
	const duration = createDuration(2, "months");
	expect(format_duration(duration)).toBe("2 months");
});

test('format_duration: 1.5 months → "46 days" (falls to days branch, Math.ceil(45.6))', () => {
	const duration = createDuration(1.5, "months");
	expect(format_duration(duration)).toBe("46 days");
});

test('format_duration: 5 days → "5 days"', () => {
	const duration = createDuration(5, "days");
	expect(format_duration(duration)).toBe("5 days");
});

test('format_duration: 3 days exactly → "3 days"', () => {
	const duration = createDuration(3, "days");
	expect(format_duration(duration)).toBe("3 days");
});

test('format_duration: 2.99 days → "72 hours" (falls to hours branch, Math.ceil(71.76))', () => {
	const duration = createDuration(2.99, "days");
	expect(format_duration(duration)).toBe("72 hours");
});

test('format_duration: 5 hours → "5 hours"', () => {
	const duration = createDuration(5, "hours");
	expect(format_duration(duration)).toBe("5 hours");
});

test('format_duration: 0 duration → "0 hours"', () => {
	const duration = createDuration(0, "hours");
	expect(format_duration(duration)).toBe("0 hours");
});
