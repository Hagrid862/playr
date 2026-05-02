# Universal Testing Guide for TypeScript/JavaScript Monorepos

## Overview

This guide covers comprehensive testing strategies for modern TypeScript/JavaScript monorepos using **Vitest** as the primary test runner. We cover multiple types of tests:

- **Unit Tests**: Test individual functions/classes in isolation
- **Integration Tests**: Test how components work together
- **E2E Tests**: Test complete user workflows through the UI
- **Component Tests**: Test UI components in isolation
- **Performance Tests**: Test load times and response times
- **Accessibility Tests**: Test WCAG compliance
- **Visual Regression Tests**: Test UI appearance consistency

## Project Structure & Testing

### Apps with Tests

| App           | Test Type          | Runner     | Purpose                   |
| ------------- | ------------------ | ---------- | ------------------------- |
| `apps/api`    | Unit + Integration | Vitest     | Backend API testing       |
| `apps/admin`  | Unit               | Vitest     | Admin interface testing   |
| `apps/artist` | Unit               | Vitest     | Artist interface testing  |
| `apps/web`    | Unit               | Vitest     | Web interface testing     |
| `apps/e2e`    | E2E                | Playwright | Full user journey testing |

### Packages with Tests

| Package              | Test Type          | Purpose                     |
| -------------------- | ------------------ | --------------------------- |
| `packages/db`        | Unit + Integration | Database operations         |
| `packages/contracts` | Unit               | Data validation schemas     |
| `packages/testing`   | Unit               | Test utilities and builders |

---

## Test Technologies

### Core Testing Stack

#### 1. **Vitest** – Primary Test Runner

- **Ultra-fast** execution (runs 614+ tests in ~7 seconds)
- **ESM support** with TypeScript
- **Watch mode** for development
- **Coverage reporting** built-in

#### 2. **@nestjs/testing** - NestJS Test Utilities

- Creates isolated test modules
- Dependency injection for tests
- Replaces real services with mocks

#### 3. **@repo/testing** - Custom Test Utilities

- `createMock<T>()` - Type-safe mock factory
- `DeepMocked<T>` - TypeScript mock types
- `userBuilder()`, `emailAddressBuilder()` - Test data builders

#### 4. **Playwright** – E2E Testing

- Browser automation
- Cross-browser testing
- Visual regression testing
- API testing capabilities

### Additional Tools

- **vitest-mock-extended** - Advanced mocking
- **supertest** – HTTP endpoint testing
- **@golevelup/ts-vitest** - NestJS-specific mocking

---

## Running Tests

### Global Commands (From Root)

```bash
# Run all unit tests across all apps/packages
pnpm test:unit

# Run all integration tests
pnpm test:integration

# Run all e2e tests
pnpm test:e2e

# Run all tests (unit + integration + e2e)
pnpm test

# Generate coverage report
pnpm test:coverage
```

### App-Specific Commands

#### API Tests (Unit + Integration)

```bash
cd apps/api

# Unit tests only
pnpm test:unit

# Integration tests only
pnpm test:integration

# Watch mode (recommended for development)
pnpm test:watch

# Debug mode
pnpm test:debug

# With coverage
pnpm test:coverage
```

#### E2E Tests

```bash
cd apps/e2e

# Run e2e tests
pnpm test:e2e

# Run in headed mode (see browser)
pnpm test:e2e --headed

# Run specific test
pnpm test:e2e --grep "login"

# Debug mode
pnpm test:e2e --debug
```

### Filtering Tests

```bash
# Run tests for specific app
pnpm test:unit --filter=@repo/api

# Run tests for specific package
pnpm test:unit --filter=@repo/db

# Run specific test file
cd apps/api
pnpm test:unit -- src/features/auth/auth.controller.spec.ts

# Run tests matching pattern
pnpm test:unit -- --grep "LoginHandler"
```

---

## Unit Tests

### What They Test

- Individual functions/classes in isolation
- Business logic without external dependencies
- Error handling and edge cases

### Example: Testing a Service

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { createMock, DeepMocked } from "@repo/testing/nestjs";
import { UserService } from "./user.service";
import { UserRepository } from "../repositories/user.repository";

describe("UserService", () => {
  let service: UserService;
  let userRepository: DeepMocked<UserRepository>;

  beforeEach(async () => {
    userRepository = createMock<UserRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: UserRepository, useValue: userRepository },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it("should create user successfully", async () => {
    // Arrange
    const userData = { email: "test@example.com", name: "John" };
    userRepository.create.mockResolvedValue({ id: "123", ...userData });

    // Act
    const result = await service.createUser(userData);

    // Assert
    expect(result.id).toBe("123");
    expect(userRepository.create).toHaveBeenCalledWith(userData);
  });

  it("should throw error for invalid email", async () => {
    // Arrange
    const invalidData = { email: "invalid", name: "John" };

    // Act & Assert
    await expect(service.createUser(invalidData)).rejects.toThrow(
      "Invalid email",
    );
  });
});
```

### Mocking Patterns

```typescript
// Mock successful async operation
mockRepository.findById.mockResolvedValue({ id: "123", name: "John" });

// Mock error
mockRepository.findById.mockRejectedValue(new Error("Not found"));

// Mock multiple calls
mockRepository.findById
  .mockResolvedValueOnce({ id: "1" })
  .mockResolvedValueOnce({ id: "2" });

// Verify calls
expect(mockRepository.findById).toHaveBeenCalledWith("123");
expect(mockRepository.findById).toHaveBeenCalledTimes(2);
```

---

## Integration Tests

### What They Test

- How multiple components work together
- Database operations with real data
- External API calls (with mocking)
- Service-to-service communication

### Setup

Integration tests use a separate Vitest config:

```typescript
// vitest.config.integration.mts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.integration.spec.ts"],
    environment: "node",
    // May use real database or test database
  },
});
```

### Example: Database Integration Test

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "@/shared/services/prisma.service";
import { UserRepository } from "./user.repository";

describe("UserRepository (Integration)", () => {
  let repository: UserRepository;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
        PrismaService, // Real Prisma service for integration testing
      ],
    }).compile();

    repository = module.get<UserRepository>(UserRepository);
    prisma = module.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    // Clean database before each test
    await prisma.user.deleteMany();
  });

  it("should create and retrieve user", async () => {
    // Arrange
    const userData = {
      email: "test@example.com",
      username: "testuser",
      password: "hashed-password",
    };

    // Act
    const created = await repository.create(userData);
    const retrieved = await repository.findById(created.id);

    // Assert
    expect(retrieved.email).toBe(userData.email);
    expect(retrieved.username).toBe(userData.username);
  });

  it("should handle unique constraint violations", async () => {
    // Arrange
    const userData = {
      email: "test@example.com",
      username: "testuser",
      password: "hashed-password",
    };

    // Act
    await repository.create(userData);

    // Assert
    await expect(repository.create(userData)).rejects.toThrow();
  });
});
```

### API Integration Tests (Real Code from Project)

```typescript
import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import {
  EmailAddress,
  EmailStatus,
  EmailType,
  Gender,
  Session,
  User,
} from "@repo/db";
import {
  emailAddressBuilder,
  refreshTokenBuilder,
  sessionBuilder,
  userBuilder,
} from "@repo/testing/builders";
import { PrismaServiceMock } from "@repo/testing/nestjs";
import request from "supertest";
import { vi } from "vitest";
import { createIntegrationApp } from "./test-utils";

describe("AuthController (Integration)", () => {
  let app: INestApplication;
  let prismaMock: PrismaServiceMock;

  beforeAll(async () => {
    const setup = await createIntegrationApp();
    app = setup.app;
    prismaMock = setup.prismaMock;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /auth/register", () => {
    const validRegistration = {
      username: "testuser",
      email: "test@example.com",
      password: "Password123!",
      firstName: "Test",
      lastName: "User",
      birthDate: "1990-01-01",
      gender: Gender.male,
    };

    it("should register a new user successfully (201)", async () => {
      // Mock repository checks (no existing user/email)
      prismaMock.client.user.findUnique.mockResolvedValue(null);
      prismaMock.client.emailAddress.findFirst.mockResolvedValue(null);

      // Mock successful creation
      prismaMock.client.user.create.mockResolvedValue(
        userBuilder({
          ...validRegistration,
          id: "user-123",
          username: validRegistration.username,
        }),
      );
      prismaMock.client.emailAddress.create.mockResolvedValue(
        emailAddressBuilder({
          userId: "user-123",
          email: validRegistration.email,
          type: EmailType.primary,
          status: EmailStatus.verified,
        }),
      );

      const response = await request(app.getHttpServer())
        .post("/auth/register")
        .send(validRegistration)
        .expect(201);

      expect(response.body.data.username).toBe(validRegistration.username);
    });

    it("should return 409 if email already exists", async () => {
      const existingEmail = emailAddressBuilder({
        id: "existing",
        email: validRegistration.email,
        userId: "user-1",
        type: EmailType.primary,
        status: EmailStatus.verified,
        verifiedAt: new Date(),
      });
      prismaMock.client.emailAddress.findFirst.mockResolvedValue({
        ...existingEmail,
        user: userBuilder({ id: "user-1" }),
      } as EmailAddress & { user: User });

      const response = await request(app.getHttpServer())
        .post("/auth/register")
        .send(validRegistration)
        .expect(409);

      expect(response.body.error.message).toBe("Email already exists");
    });

    it("should return 400 if validation fails (e.g., weak password)", async () => {
      const invalidRegistration = {
        ...validRegistration,
        password: "weak",
      };

      const response = await request(app.getHttpServer())
        .post("/auth/register")
        .send(invalidRegistration)
        .expect(400);

      // nestjs-zod usually returns validation errors in a specific format
      // We check if the response has an error property
      expect(response.body.error).toBeDefined();
    });
  });

  describe("POST /auth/login", () => {
    const loginData = {
      email: "test@example.com",
      password: "Password123!",
    };

    it("should login successfully and return tokens (200)", async () => {
      const hashedPassword = await import("argon2").then((a) =>
        a.hash(loginData.password),
      );
      const userBase = userBuilder({
        id: "user-123",
        username: "testuser",
        password: hashedPassword,
      });
      const email = emailAddressBuilder({
        id: "email-123",
        email: loginData.email,
        userId: userBase.id,
        status: EmailStatus.verified,
        type: EmailType.primary,
        verifiedAt: new Date(),
      });

      // Mock repository response
      prismaMock.client.emailAddress.findFirst.mockResolvedValue({
        ...email,
        user: userBase,
      } as EmailAddress & { user: User });

      // Mock session creation
      prismaMock.client.session.create.mockResolvedValue({
        ...sessionBuilder({ id: "session-123", userId: userBase.id }),
      } as Session);

      // Mock refresh token creation
      prismaMock.client.refreshToken.create.mockResolvedValue(
        refreshTokenBuilder({
          sessionId: "session-123",
        }),
      );

      const response = await request(app.getHttpServer())
        .post("/auth/login")
        .send(loginData)
        .expect(201); // Controller login method actually returns 201 by default unless @HttpCode is used

      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.user.username).toBe(userBase.username);

      // Check refresh token cookie
      const cookies = response.get("Set-Cookie");
      expect(cookies).toBeDefined();
      expect(cookies?.some((c) => c.includes("refreshToken"))).toBe(true);
    });

    it("should return 401 for invalid password", async () => {
      const hashedPassword = await import("argon2").then((a) =>
        a.hash("different-password"),
      );

      prismaMock.client.emailAddress.findFirst.mockResolvedValue({
        ...emailAddressBuilder({
          email: loginData.email,
          status: EmailStatus.verified,
          userId: "user-123",
        }),
        user: userBuilder({
          id: "user-123",
          username: "testuser",
          password: hashedPassword,
        }),
      } as EmailAddress & { user: User });

      await request(app.getHttpServer())
        .post("/auth/login")
        .send(loginData)
        .expect(401);
    });
  });
});
```

---

## E2E Tests

### What They Test

- Complete user workflows from start to finish
- UI interactions and navigation
- Cross-browser compatibility
- Real user scenarios

### Setup

E2E tests use Playwright with a separate config:

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./src",
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "firefox", use: { browserName: "firefox" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
});
```

### Example: User Registration E2E Test (Real Code from Project)

```typescript
import { expect, test } from "@playwright/test";
import { DashboardPage } from "./dashboard.po";
import { LoginPage } from "./login.po";
import { RegistrationPage } from "./registration.po";

test.describe("Authentication Workflow", () => {
  let loginPage: LoginPage;
  let registrationPage: RegistrationPage;
  let dashboardPage: DashboardPage;

  const timestamp = Date.now();
  const testUserData = {
    username: `auth_user_${timestamp}`,
    email: `auth_${timestamp}@example.com`,
    password: "Password123!",
    firstName: "Auth",
    lastName: "Tester",
  };

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    registrationPage = new RegistrationPage(page);
    dashboardPage = new DashboardPage(page);

    // Log console messages for debugging
    page.on("console", (msg) => {
      if (msg.type() === "error") console.log(`BROWSER ERROR: ${msg.text()}`);
    });
  });

  test("should register manually and then login", async ({ page }) => {
    // 1. Registration
    await registrationPage.goto();
    await registrationPage.fillForm({
      username: testUserData.username,
      firstName: testUserData.firstName,
      lastName: testUserData.lastName,
      email: testUserData.email,
      password: testUserData.password,
      confirmPassword: testUserData.password,
    });
    await registrationPage.selectGender("Male");
    // Select a date that is definitely in the past and reachable
    await registrationPage.selectBirthDate(new Date(1990, 5, 15));

    await expect(registrationPage.submitButton).toBeEnabled({ timeout: 10000 });
    await registrationPage.submit();

    // Wait for the URL change or check for error message
    try {
      await registrationPage.expectSuccess();
    } catch (e) {
      const error = await page
        .locator('[data-slot="field-error"]')
        .allTextContents();
      console.log("Registration failed with errors:", error);
      throw e;
    }

    // 2. Login
    await loginPage.goto();
    await loginPage.login(testUserData.email, testUserData.password);
    await expect(page).toHaveURL(/\/app/, { timeout: 10000 });

    // 3. Session Persistence (Reload)
    await page.reload();
    await expect(page).toHaveURL(/\/app/);
    await expect(dashboardPage.logoutButton).toBeVisible();

    // 4. Logout
    await dashboardPage.logout();
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("should validate login form fields", async () => {
    await loginPage.goto();

    // Email invalid format
    await loginPage.emailInput.fill("invalid");
    await loginPage.emailInput.blur();
    await loginPage.expectFieldError("Email", "Invalid email address");

    // Password too short (using a format that passes regexes to isolate length error)
    await loginPage.passwordInput.fill("A1aPass"); // 7 chars, passes A-Z, a-z, 0-9
    await loginPage.passwordInput.blur();
    await loginPage.expectFieldError(
      "Password",
      "Password must be at least 8 characters",
    );
  });
});
```

---

## Component Tests (Frontend)

### What They Test

- React/Vue components in isolation
- UI interactions
- Component props and state
- User interactions

### Example: React Component Test

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  it('should call onSubmit with form data', async () => {
    const mockOnSubmit = vi.fn();
    render(<LoginForm onSubmit={mockOnSubmit} />);

    // Fill form
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    // Check callback was called with correct data
    expect(mockOnSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('should show validation errors', async () => {
    const mockOnSubmit = vi.fn();
    render(<LoginForm onSubmit={mockOnSubmit} />);

    // Submit empty form
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    // Check validation messages
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();

    // onSubmit should not be called
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });
});
```

---

## Visual Regression Tests

### What They Test

- UI appearance changes
- Layout consistency
- Visual bugs

### Example: Playwright Visual Test

```typescript
import { test, expect } from "@playwright/test";

test.describe("Visual Regression", () => {
  test("should match login page screenshot", async ({ page }) => {
    await page.goto("/login");

    // Wait for page to load completely
    await page.waitForLoadState("networkidle");

    // Take screenshot and compare
    await expect(page).toHaveScreenshot("login-page.png", {
      threshold: 0.2, // Allow 0.2% difference
      fullPage: true,
    });
  });

  test("should match user profile layout", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.fill('[data-testid="email"]', "user@example.com");
    await page.fill('[data-testid="password"]', "password123");
    await page.click('[data-testid="login-button"]');

    // Go to profile
    await page.goto("/profile");

    // Check visual layout
    await expect(page.locator('[data-testid="profile-card"]')).toHaveScreenshot(
      "profile-card.png",
    );
  });
});
```

---

## Performance Tests

### What They Test

- Load times
- Memory usage
- Bundle size
- API response times

### Example: API Performance Test

```typescript
import { test, expect } from "@playwright/test";

test.describe("API Performance", () => {
  test("should load user list within 2 seconds", async ({ request }) => {
    const startTime = Date.now();

    const response = await request.get("/api/users");

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    expect(response.status()).toBe(200);
    expect(responseTime).toBeLessThan(2000); // 2 seconds
  });

  test("should handle concurrent requests", async ({ request }) => {
    const requests = Array(10)
      .fill()
      .map(() => request.get("/api/users"));

    const responses = await Promise.all(requests);

    responses.forEach((response) => {
      expect(response.status()).toBe(200);
    });
  });
});
```

---

## Accessibility Tests

### What They Test

- Screen reader compatibility
- Keyboard navigation
- Color contrast
- ARIA attributes

### Example: Accessibility Test

```typescript
import { test, expect } from "@playwright/test";

test.describe("Accessibility", () => {
  test("should have proper form labels", async ({ page }) => {
    await page.goto("/login");

    // Check all inputs have labels
    const inputs = page.locator("input");
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute("id");
      const label = page.locator(`label[for="${id}"]`);

      await expect(label).toBeVisible();
    }
  });

  test("should be keyboard navigable", async ({ page }) => {
    await page.goto("/login");

    // Tab through form elements
    await page.keyboard.press("Tab");
    await expect(page.locator('[data-testid="email-input"]')).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.locator('[data-testid="password-input"]')).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.locator('[data-testid="login-button"]')).toBeFocused();
  });

  test("should have sufficient color contrast", async ({ page }) => {
    await page.goto("/login");

    // Use axe-playwright for accessibility checking
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({
          id: "color-contrast",
        }),
      ]),
    );
  });
});
```

---

## Test Organization & Best Practices

### File Naming Convention

```
src/
├── features/
│   ├── auth/
│   │   ├── auth.controller.spec.ts          # Unit tests
│   │   ├── auth.controller.integration.spec.ts # Integration tests
│   │   └── auth.e2e.spec.ts                 # E2E tests
│   └── user/
│       ├── user.service.spec.ts
│       └── user.repository.integration.spec.ts
```

### Test Structure

```typescript
describe("ComponentName", () => {
  // Setup
  beforeAll(() => {
    /* Global setup */
  });
  afterAll(() => {
    /* Global cleanup */
  });

  beforeEach(() => {
    /* Per-test setup */
  });
  afterEach(() => {
    /* Per-test cleanup */
  });

  describe("MethodName", () => {
    it("should handle success case", () => {
      // AAA Pattern
      // Arrange - Setup mocks and data
      // Act - Execute code
      // Assert - Verify results
    });

    it("should handle error case", () => {
      // Test error scenarios
    });

    it("should handle edge case", () => {
      // Test boundary conditions
    });
  });
});
```

### Mocking Best Practices

```typescript
// ✅ Good: Mock external dependencies
const mockRepository = createMock<UserRepository>();
mockRepository.findById.mockResolvedValue(mockUser);

// ❌ Bad: Don't mock internal logic
// Don't mock private methods or internal calculations

// ✅ Good: Verify important interactions
expect(mockRepository.save).toHaveBeenCalledWith(expectedData);

// ❌ Bad: Don't verify implementation details
// Don't check internal method calls unless they affect behavior
```

### Test Data Management

```typescript
// Use builders for consistent test data
const mockUser = userBuilder({
  id: "user-123",
  email: "test@example.com",
  username: "testuser",
});

// For variations
const unverifiedUser = userBuilder({
  ...mockUser,
  emailStatus: "pending",
});
```

---

## Debugging Tests

### Common Issues & Solutions

#### Test Timeout

```typescript
it("should complete within timeout", async () => {
  // Increase timeout for slow operations
}, 10000); // 10 seconds
```

#### Async Issues

```typescript
it("should handle async operations", async () => {
  // Wait for all promises
  await Promise.all([service.doAsyncThing(), repository.saveAsync()]);

  // Or use fake timers
  vi.useFakeTimers();
  // ... test code ...
  vi.runAllTimers();
  vi.useRealTimers();
});
```

#### Mock Issues

```typescript
// Clear mocks between tests
afterEach(() => {
  vi.clearAllMocks();
});

// Reset mock implementations
beforeEach(() => {
  mockService.method.mockReset();
});
```

#### Database State Issues

```typescript
beforeEach(async () => {
  // Clean database
  await prisma.user.deleteMany();
  await prisma.emailAddress.deleteMany();
});

afterEach(async () => {
  // Clean up after each test
  await prisma.$disconnect();
});
```

---

## Coverage & Quality Metrics

### Coverage Goals

```bash
# Run with coverage
pnpm test:coverage

# Coverage report shows:
# - Statement coverage
# - Branch coverage
# - Function coverage
# - Line coverage
```

### Quality Gates

- **Unit Tests**: > 80% coverage
- **Integration Tests**: Cover critical paths
- **E2E Tests**: Cover main user journeys
- **Performance**: < 2 s API response time
- **Accessibility**: WCAG AA compliance

### Coverage Configuration

```typescript
// vitest.config.mts
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.spec.ts",
        "src/main.ts",
        "src/**/*.module.ts",
        "src/**/*.dto.ts",
      ],
      thresholds: {
        global: {
          statements: 80,
          branches: 75,
          functions: 80,
          lines: 80,
        },
      },
    },
  },
});
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "20"
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install

      - name: Run unit tests
        run: pnpm test:unit

      - name: Run integration tests
        run: pnpm test:integration

      - name: Run E2E tests
        run: pnpm test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/coverage-final.json
```

---

## Advanced Testing Techniques

### Snapshot Testing

```typescript
it('should match snapshot', () => {
  const component = render(<UserProfile user={mockUser} />);
  expect(component).toMatchSnapshot();
});
```

### Property-Based Testing

```typescript
import { fc } from "fast-check";

it("should handle any valid email", () => {
  fc.assert(
    fc.property(fc.emailAddress(), (email) => {
      const result = validateEmail(email);
      return result.isValid === true;
    }),
  );
});
```

### Contract Testing

```typescript
// Test API contracts between services
describe("API Contract", () => {
  it("should match OpenAPI specification", async () => {
    const response = await request(app).get("/users");
    const contract = loadOpenAPISpec();

    expect(response.body).toMatchSchema(contract.definitions.UserList);
  });
});
```

---

## Test Maintenance

### Keeping Tests Green

1. **Run tests frequently** – Use watch mode during development
2. **Fix broken tests immediately** – Don't let them accumulate
3. **Update tests with code changes** – Tests should reflect current behavior
4. **Review test failures** – Understand why they fail before fixing

### Refactoring Tests

```typescript
// Before: Repetitive setup
describe("UserService", () => {
  let service: UserService;
  let mockRepo: DeepMocked<UserRepository>;

  beforeEach(async () => {
    mockRepo = createMock<UserRepository>();
    const module = await Test.createTestingModule({
      providers: [UserService, { provide: UserRepository, useValue: mockRepo }],
    }).compile();
    service = module.get<UserService>(UserService);
  });

  // Many test files repeat this...
});

// After: Shared test setup
export const createUserServiceTestModule = async () => {
  const mockRepo = createMock<UserRepository>();
  const module = await Test.createTestingModule({
    providers: [UserService, { provide: UserRepository, useValue: mockRepo }],
  }).compile();

  return {
    service: module.get<UserService>(UserService),
    mockRepo,
  };
};
```

---

## Troubleshooting Guide

### Tests Are Slow

**Problem**: Tests take too long to run
**Solutions**:

- Use `vi.mock()` for heavy imports
- Run tests in parallel (Vitest does this by default)
- Mock external services
- Use `test.only()` to focus on specific tests

### Flaky Tests

**Problem**: Tests pass sometimes, fail sometimes
**Solutions**:

- Avoid relying on timing (`setTimeout`, `setInterval`)
- Use proper async/await
- Clean up state between tests
- Mock random values or external dependencies

### Mock Not Working

**Problem**: Mock doesn't behave as expected
**Solutions**:

- Check import paths
- Verify mock is created before module compilation
- Use `mockResolvedValue()` for promises
- Clear mocks between tests

### Coverage Not Updating

**Problem**: A coverage report doesn't reflect changes
**Solutions**:

- Run tests with `--coverage` flag
- Check coverage configuration
- Ensure test files are included
- Clear coverage cache

---

## Summary

This monorepo uses a comprehensive testing strategy:

- **Unit Tests**: Fast, isolated testing with Vitest
- **Integration Tests**: Component interaction testing
- **E2E Tests**: Full user journey testing with Playwright
- **Component Tests**: UI testing with Testing Library
- **Performance Tests**: Load and response time testing
- **Accessibility Tests**: WCAG compliance testing
- **Visual Tests**: UI regression testing

### Key Commands

```bash
# Development
pnpm test:watch          # Unit tests in watch mode
pnpm test:integration    # Integration tests
pnpm test:e2e           # E2E tests

# CI/CD
pnpm test               # All tests
pnpm test:coverage      # With coverage report

# Debugging
pnpm test:debug         # Debug unit tests
pnpm test:e2e --debug   # Debug E2E tests
```

### Best Practices

1. **AAA Pattern**: Arrange, Act, Assert
2. **Mock External Dependencies**: Keep tests fast and focused
3. **Test Behavior, Not Implementation**: Verify what users see
4. **Maintain Coverage**: Aim for >80% coverage
5. **Run Tests Frequently**: Use watch mode during development

This testing setup ensures code quality, prevents regressions, and enables confident deployments across all apps in the monorepo.
