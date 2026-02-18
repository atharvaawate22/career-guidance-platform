# API_SPEC.md

## 1. API Design Principles

- RESTful structure
- JSON request and response format
- Standardized success and error responses
- Clear separation between public and admin routes
- No business logic inside controllers
- All validation handled at API boundary

Base URL (example):
`/api`

---

## 2. Standard Response Format

### Success Response

{
"success": true,
"data": { ... }
}


### Error Response

{
"success": false,
"error": {
"code": "ERROR_CODE",
"message": "Descriptive error message"
}
}


All endpoints must follow this format.

---

## 3. Public Endpoints

### 3.1 Get CET Updates

**GET** `/api/updates`

Query Parameters (optional):
- page
- limit

Response:

{
"success": true,
"data": [
{
"id": "uuid",
"title": "Update title",
"content": "Update content",
"official_link": "url",
"published_date": "YYYY-MM-DD"
}
]
}


---

### 3.2 Get Cutoffs

**GET** `/api/cutoffs`

Query Parameters:
- year
- branch
- category
- gender
- home_university
- college_name

Response:

{
"success": true,
"data": [
{
"college_name": "College Name",
"branch": "Computer Engineering",
"category": "OPEN",
"percentile": 95.34
}
]
}


---

### 3.3 College Predictor

**POST** `/api/predict`

Request Body:

{
"percentile": 92.5,
"category": "OPEN",
"gender": "Male",
"home_university": "SPPU",
"preferred_branches": ["Computer Engineering", "IT"]
}


Response:

{
"success": true,
"data": {
"safe": [ ... ],
"target": [ ... ],
"dream": [ ... ]
}
}


Classification logic handled entirely within predictor service.

---

### 3.4 Create Booking

**POST** `/api/bookings`

Request Body:

{
"student_name": "Name",
"email": "email@example.com
",
"phone": "1234567890",
"percentile": 90.25,
"category": "OBC",
"branch_preference": "Computer Engineering",
"meeting_time": "2026-06-20T14:00:00Z"
}

Response:

{
"success": true,
"data": {
"booking_id": "uuid",
"meet_link": "https://meet.google.com/
..."
}
}


If email fails, booking still returns success but logs failure internally.

---

### 3.5 Download Guide (Lead Capture)

**POST** `/api/guides/download`

Request Body:

{
"guide_id": "uuid",
"name": "Student Name",
"email": "email@example.com
",
"percentile": 88.5
}

Response:

{
"success": true,
"data": {
"file_url": "https://..."
}
}


---

## 4. Admin Endpoints

All admin endpoints require authentication and role-based authorization.

Authentication:
JWT-based token validation via middleware.

---

### 4.1 Create Update

**POST** `/api/admin/updates`

Request Body:
{
"title": "Update title",
"content": "Detailed update content",
"official_link": "https://...",
"published_date": "YYYY-MM-DD"
}


---

### 4.2 Upload / Insert Cutoff Data

**POST** `/api/admin/cutoffs`

Request Body:
Array of cutoff records.

---

### 4.3 View Bookings

**GET** `/api/admin/bookings`

Query Parameters:
- status
- date_range

---

### 4.4 Manage Guides

**POST** `/api/admin/guides`
**PUT** `/api/admin/guides/:id`
**DELETE** `/api/admin/guides/:id`

---

## 5. Authentication Endpoints (Admin)

### Login

**POST** `/api/admin/login`

Request Body:
{
"email": "admin@example.com",
"password": "password"
}


Response:
{
"success": true,
"data": {
"token": "jwt-token"
}
}


---

## 6. Rate Limiting

The following endpoints must have rate limiting:

- `/api/predict`
- `/api/bookings`
- `/api/guides/download`

Prevents abuse and bot traffic.

---

## 7. Error Codes

Examples:

- INVALID_INPUT
- UNAUTHORIZED
- FORBIDDEN
- NOT_FOUND
- PREDICTOR_FAILED
- BOOKING_FAILED
- EMAIL_DELIVERY_FAILED
- INTERNAL_SERVER_ERROR

All errors must use predefined codes.

---

## 8. Versioning Strategy

Future-proofing:

`/api/v1/...`

New versions should not break existing contracts.

---

## 9. Testing Requirements

- Unit tests for services
- Integration tests for API endpoints
- Mocked external services for calendar and email
- Validation testing for predictor classification logic

API contracts must remain consistent and backward-compatible.
