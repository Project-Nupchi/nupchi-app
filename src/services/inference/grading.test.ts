import { describe, expect, it } from 'vitest';

import { overallGradeFromMetrics, WARNING_AFFECTED_RATIO } from '@/services/inference/grading';

describe('overallGradeFromMetrics', () => {
  it('의심 개체가 없으면 normal', () => {
    expect(overallGradeFromMetrics(0, 0)).toBe('normal');
    // suspectCount가 0이면 비율과 무관하게 normal
    expect(overallGradeFromMetrics(0, 0.9)).toBe('normal');
  });

  it('의심 개체가 있고 비율이 임계 미만이면 suspect', () => {
    expect(overallGradeFromMetrics(1, 0.1)).toBe('suspect');
    expect(overallGradeFromMetrics(2, WARNING_AFFECTED_RATIO - 0.0001)).toBe('suspect');
  });

  it('의심 비율이 임계 이상이면 warning', () => {
    expect(overallGradeFromMetrics(3, WARNING_AFFECTED_RATIO)).toBe('warning');
    expect(overallGradeFromMetrics(7, 1)).toBe('warning');
  });

  it('임계값은 0.3', () => {
    expect(WARNING_AFFECTED_RATIO).toBe(0.3);
  });
});
