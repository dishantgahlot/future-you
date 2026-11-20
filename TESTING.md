# Testing Architecture & Verification Suite

This document outlines the testing strategy, test suites, edge case verification, and continuous integration workflows for the **Future You** application.

---

## 1. Test Overview & Executive Summary

- **Test Framework**: Vitest v5.1 with TypeScript native compilation
- **Total Test Files**: 12 suites across frontend and backend
- **Total Tests**: 149 automated test cases
- **Pass Rate**: 100% (149 passing, 0 failing)
- **Execution Time**: ~1.5s total suite duration
- **Continuous Integration**: Automated GitHub Actions workflow (`.github/workflows/ci.yml`)

---

## 2. Running Tests

### Run All Tests (Root)
```bash
npm test
```

### Run Frontend Tests
```bash
npm run test:frontend
```

### Run Backend Tests
```bash
npm run test:backend
```

### Run with Watch Mode
```bash
npm run test:watch
```

---

## 3. Test Suites Breakdown

### A. Frontend Test Suites
| Test File | Focus Area | Key Edge Cases Verified |
|---|---|---|
| `frontend/src/utils/habitStorage.test.ts` | Habit Storage, Day Scoping & Date Isolation | Strict day isolation, clean slate on new days, historical retention, copy yesterday habits, day target customization, streak calculations |
| `frontend/src/contexts/DateContext.test.ts` | Date Management & Timezone Alignment | URL query parameter sync (`?date=YYYY-MM-DD`), ISO date parsing, today vs. historical day detection |
| `frontend/src/services/api.test.ts` | Frontend API Client & Fallbacks | API endpoint construction, payload format with `target_date`, error recovery |

### B. Backend Test Suites
| Test File | Focus Area | Key Edge Cases Verified |
|---|---|---|
| `backend/src/routes/habits.test.ts` | Route & Request Schema Validation | Zod schema validation, positive target bounds, valid UUID checking, category enum taxonomy |
| `backend/src/services/ai/whatIfChatService.test.ts` | AI What-If Simulation Engine | Natural language date extraction, historical habit summarization, 70% rule win logic, math calculation lens, zero-day fresh start |
| `backend/src/services/ai/habitProgressService.test.ts` | Habit Analytics & Progress Tiers | 70% high-partial win tiering, multi-habit portfolio averaging, rolling trend detection |
| `backend/src/services/prediction-engine/calculations.test.ts` | Predictive Trajectory Math | Exponential habit compounding, decay rates, 6-month & 5-year trajectory models |
| `backend/src/services/prediction-engine/index.test.ts` | Prediction Engine Orchestrator | End-to-end simulation pipelines, user profile synthesis |
| `backend/src/services/prediction-engine/profileBuilder.test.ts` | User Profile Construction | Historical log ingestion, baseline identity derivation |
| `backend/src/services/prediction-engine/projectionCalculator.test.ts` | Projection Engine | Variance calculations, target adherence bands |
| `backend/src/services/prediction-engine/scenarioGenerator.test.ts` | What-If Scenario Synthesis | Scenario branching, delta computation |
| `backend/src/services/prediction-engine/whatIfSimulator.test.ts` | Trajectory Simulator | Counterfactual outcome projection, behavioral momentum |

---

## 4. Key Behavioral Rules Verified

1. **Strict Date Isolation**:
   - Habits belong exclusively to their target date (`target_date`).
   - A habit created on November 19 does not bleed into November 18, November 17, or November 20.
   - When a new day arrives, habits start with a clean slate (0 habits) unless explicitly created or copied.

2. **The 70% Rule (Continuous Progress)**:
   - Progress between 70% and 99% is classified as `high_partial` — conquering inertia and keeping streaks alive without all-or-nothing perfectionism.

3. **Compounding What-If Simulations**:
   - Mathematical calculations and what-if queries are evaluated with precision and contextualized through habit compounding multipliers.

---

## 5. Automated CI/CD Pipeline

The `.github/workflows/ci.yml` workflow automatically runs on every push and pull request to `main`:
1. Checks out repository.
2. Installs dependencies (`npm ci`).
3. Runs TypeScript type checking (`tsc --noEmit`).
4. Executes test suite (`npm test`).
5. Validates production build (`npm run build`).
