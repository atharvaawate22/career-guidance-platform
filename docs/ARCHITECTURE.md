# ARCHITECTURE.md

## 1. Architectural Style

The system follows a **Modular Monolith Architecture**.

This approach ensures:

- Feature-level isolation
- Clear separation of concerns
- Independent module boundaries
- Easier maintainability
- Future migration path to microservices (if required)

The system is intentionally designed so that failure in one module does not cascade into others.

---

## 2. High-Level System Flow

Client  
→ API Layer  
→ Service Layer  
→ Data Layer  
→ External Services (Email, Google Calendar)

### Layer Responsibilities

**Client Layer**

- UI rendering
- Form validation (basic)
- API communication

**API Layer (Controllers + Routes)**

- Request validation
- Response formatting
- Route protection
- Error handling boundary

**Service Layer**

- Business logic
- Cross-module coordination (if required)
- Data transformation

**Data Layer (Repositories)**

- Database queries
- Data persistence
- External API communication wrappers

---

## 3. Module-Based Structure

The system is organized by features instead of technical layers.

/src
/modules
/predictor
/cutoffs
/updates
/booking
/guides
/admin
/shared
/config
server.ts

Each module contains:

- controller.ts
- service.ts
- repository.ts
- routes.ts
- types.ts

Modules are self-contained and should not directly depend on each other’s internal files.

---

## 4. Module Responsibilities

### Predictor Module

Responsibilities:

- Accept percentile and filter parameters
- Query cutoff dataset
- Apply classification logic (Safe / Target / Dream)
- Return structured results

Dependencies:

- Cutoff repository only

Failure in predictor should not impact:

- Booking
- Updates
- Guides

---

### Cutoffs Module

Responsibilities:

- Store and manage historical cutoff data
- Provide filtered query access
- Support predictor engine

This module does not depend on predictor logic.

---

### Updates Module

Responsibilities:

- Publish official CET updates
- Provide chronological listing
- Store notification metadata

Independent of:

- Booking
- Predictor
- Cutoffs

---

### Booking Module

Responsibilities:

- Slot management
- Booking creation
- Google Meet link generation
- Email confirmation
- Booking status tracking

If email delivery fails:

- Booking record must still be stored
- Error must be logged
- System must not crash

---

### Guides Module

Responsibilities:

- Manage downloadable PDF metadata
- Track downloads
- Capture lead information

Completely independent of prediction logic.

---

### Admin Module

Responsibilities:

- Protected access control
- Manage updates
- Upload cutoff datasets
- Monitor bookings
- View leads

All admin routes must be protected by role-based middleware.

---

## 5. Error Isolation Strategy

Each module handles its own errors using:

- Try/catch at service layer
- Standardized error response format
- Centralized error handler middleware
- Structured logging

Example error response format:

{
"success": false,
"error": {
"code": "MODULE_ERROR",
"message": "Descriptive message"
}
}

No module should throw unhandled exceptions to the global runtime.

---

## 6. Dependency Rules

Strict rules enforced:

- Controllers do not access database directly
- Services do not access request objects
- Repositories do not contain business logic
- Modules do not import other module internals
- Shared utilities contain no business rules

Allowed dependency direction:

Controller → Service → Repository

Not allowed:

Repository → Service  
Service → Controller

---

## 7. Feature Toggles

Features can be enabled or disabled using environment flags:

- FEATURE_PREDICTOR
- FEATURE_BOOKING
- FEATURE_UPDATES
- FEATURE_GUIDES

When disabled:

- Routes are not registered
- Module services are not initialized

This allows:

- Controlled rollout
- Temporary feature suspension
- Clean deactivation without code removal

---

## 8. Database Interaction Model

Each module interacts only with its own tables.

Example separation:

- bookings → Booking module
- cutoff_data → Cutoff module
- updates → Updates module
- downloads → Guides module
- admin_users → Admin module

Cross-table access must be minimal and justified.

Indexes must be used for:

- Percentile filtering
- College search queries
- Booking time lookup

---

## 9. External Service Integration

External services are abstracted through service wrappers.

Example:

- EmailService
- CalendarService

Modules depend on abstractions, not direct implementations.

This allows:

- Replacing Gmail SMTP with another email provider
- Disabling calendar integration
- Testing with mock services in development

---

## 10. Security Architecture

- Role-based middleware for admin routes
- Input validation at API boundary
- Rate limiting on booking and predictor endpoints
- Environment-based configuration
- No direct exposure of internal service keys

Sensitive operations are never handled on the client side.

---

## 11. Scalability Path

The modular structure allows future separation into microservices:

- predictor-service
- booking-service
- content-service

Because modules are already isolated, migration would require minimal refactoring.

---

## 12. Future Expansion Strategy

Planned expansion modules:

- JEE Main Admission Module
- NEET Admission Module
- Multi-Year Cutoff Analytics Engine
- Reporting and Data Intelligence Dashboard

New modules must follow the same architecture pattern and isolation principles.
