/** Generated using npm run contract:m9; do not hand-edit. */
export const OPENAPI_DOCUMENT: Record<string, unknown> = {
  "openapi": "3.0.3",
  "info": {
    "title": "EstateFlow API",
    "version": "0.13.4",
    "description": "NestJS API backing a resort booking, resource-feasibility and staff-reviewed local AI platform. This is an API, not the Lovable website. Payments and outbound communication are simulated. Dates are date-only YYYY-MM-DD; price amounts are integer INR paise."
  },
  "servers": [
    {
      "url": "http://localhost:4000",
      "description": "Default local development backend"
    }
  ],
  "tags": [
    {
      "name": "Service"
    },
    {
      "name": "Authentication"
    },
    {
      "name": "Accommodation"
    },
    {
      "name": "Booking"
    },
    {
      "name": "Enquiries"
    },
    {
      "name": "Staff Operations"
    },
    {
      "name": "Staff Enquiries"
    },
    {
      "name": "Event Feasibility"
    }
  ],
  "paths": {
    "/": {
      "get": {
        "tags": [
          "Service"
        ],
        "summary": "API service discovery (not a frontend page)",
        "operationId": "get",
        "x-required-role": "PUBLIC",
        "description": "No bearer token needed.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        }
      }
    },
    "/auth/login": {
      "post": {
        "tags": [
          "Authentication"
        ],
        "summary": "Sign in and receive a bearer token",
        "operationId": "postAuthLogin",
        "x-required-role": "PUBLIC",
        "description": "No bearer token needed.",
        "responses": {
          "201": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/AuthResult"
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Credential"
              }
            }
          }
        }
      }
    },
    "/auth/me": {
      "get": {
        "tags": [
          "Authentication"
        ],
        "summary": "Get authenticated user",
        "operationId": "getAuthMe",
        "x-required-role": "AUTHENTICATED",
        "description": "Requires bearer token; access is checked against current database role and ownership.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/auth/register": {
      "post": {
        "tags": [
          "Authentication"
        ],
        "summary": "Register a guest account",
        "operationId": "postAuthRegister",
        "x-required-role": "PUBLIC",
        "description": "No bearer token needed.",
        "responses": {
          "201": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Registration"
              }
            }
          }
        }
      }
    },
    "/availability": {
      "get": {
        "tags": [
          "Accommodation"
        ],
        "summary": "Read website allotment-backed availability for a stay",
        "operationId": "getAvailability",
        "x-required-role": "PUBLIC",
        "description": "No bearer token needed.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "parameters": [
          {
            "name": "checkIn",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string",
              "format": "date"
            }
          },
          {
            "name": "checkOut",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string",
              "format": "date"
            }
          },
          {
            "name": "roomTypeId",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/booking-holds": {
      "post": {
        "tags": [
          "Booking"
        ],
        "summary": "Reserve temporary website allotment for checkout",
        "operationId": "postBookingHolds",
        "x-required-role": "AUTHENTICATED",
        "description": "Requires bearer token; access is checked against current database role and ownership.",
        "responses": {
          "201": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "Idempotency-Key",
            "in": "header",
            "required": true,
            "description": "Unique per logical operation; reusing it with different details is a conflict.",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/BookingHold"
              }
            }
          }
        }
      }
    },
    "/booking-holds/{id}": {
      "get": {
        "tags": [
          "Booking"
        ],
        "summary": "Retrieve own checkout hold and expiry",
        "operationId": "getBookingHoldsById",
        "x-required-role": "AUTHENTICATED",
        "description": "Requires bearer token; access is checked against current database role and ownership.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/BookingStatus"
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/bookings": {
      "get": {
        "tags": [
          "Booking"
        ],
        "summary": "List current guest bookings",
        "operationId": "getBookings",
        "x-required-role": "AUTHENTICATED",
        "description": "Requires bearer token; access is checked against current database role and ownership.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/bookings/{id}": {
      "get": {
        "tags": [
          "Booking"
        ],
        "summary": "Read current guest booking",
        "operationId": "getBookingsById",
        "x-required-role": "AUTHENTICATED",
        "description": "Requires bearer token; access is checked against current database role and ownership.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/bookings/{id}/cancel": {
      "post": {
        "tags": [
          "Booking"
        ],
        "summary": "Cancel an eligible confirmed simulated booking and atomically release room nights; no real refund",
        "operationId": "postBookingsByIdCancel",
        "x-required-role": "AUTHENTICATED",
        "description": "Requires bearer token; access is checked against current database role and ownership.",
        "responses": {
          "201": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "additionalProperties": true
              }
            }
          }
        }
      }
    },
    "/bookings/reference/{reference}": {
      "get": {
        "tags": [
          "Booking"
        ],
        "summary": "Find current guest booking by its reference",
        "operationId": "getBookingsReferenceByReference",
        "x-required-role": "AUTHENTICATED",
        "description": "Requires bearer token; access is checked against current database role and ownership.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "reference",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/enquiries": {
      "post": {
        "tags": [
          "Enquiries"
        ],
        "summary": "Save or append a guest enquiry promptly; AI processing is deferred",
        "operationId": "postEnquiries",
        "x-required-role": "PUBLIC",
        "description": "No bearer token needed.",
        "responses": {
          "201": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Enquiry"
              }
            }
          }
        }
      }
    },
    "/enquiries/chat/advisory": {
      "post": {
        "tags": [
          "Enquiries"
        ],
        "summary": "Generate optional non-binding concierge guidance after saving a chat message",
        "operationId": "postEnquiriesChatAdvisory",
        "x-required-role": "PUBLIC",
        "description": "No bearer token needed.",
        "responses": {
          "201": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "additionalProperties": true
              }
            }
          }
        }
      }
    },
    "/gm/event-approvals": {
      "get": {
        "tags": [
          "Service"
        ],
        "summary": "List pending GM event resource authorization requests",
        "operationId": "getGmEventApprovals",
        "x-required-role": "GM",
        "description": "Requires GM authorization verified against the database.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/gm/event-approvals/{id}/decision": {
      "post": {
        "tags": [
          "Service"
        ],
        "summary": "GM approve and atomically reserve all resources, or reject",
        "operationId": "postGmEventApprovalsByIdDecision",
        "x-required-role": "GM",
        "description": "Requires GM authorization verified against the database.",
        "responses": {
          "201": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "additionalProperties": true
              }
            }
          }
        }
      }
    },
    "/health": {
      "get": {
        "tags": [
          "Service"
        ],
        "summary": "Liveness probe",
        "operationId": "getHealth",
        "x-required-role": "PUBLIC",
        "description": "No bearer token needed.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        }
      }
    },
    "/health/ready": {
      "get": {
        "tags": [
          "Service"
        ],
        "summary": "PostgreSQL readiness probe",
        "operationId": "getHealthReady",
        "x-required-role": "PUBLIC",
        "description": "No bearer token needed.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        }
      }
    },
    "/openapi.json": {
      "get": {
        "tags": [
          "Service"
        ],
        "summary": "OpenAPI 3.0 JSON contract",
        "operationId": "getOpenapiJson",
        "x-required-role": "PUBLIC",
        "description": "No bearer token needed.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        }
      }
    },
    "/payments/mock/confirm": {
      "post": {
        "tags": [
          "Booking"
        ],
        "summary": "Confirm a simulated payment and booking",
        "operationId": "postPaymentsMockConfirm",
        "x-required-role": "AUTHENTICATED",
        "description": "Requires bearer token; access is checked against current database role and ownership.",
        "responses": {
          "201": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "Idempotency-Key",
            "in": "header",
            "required": true,
            "description": "Unique per logical operation; reusing it with different details is a conflict.",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/MockPayment"
              }
            }
          }
        }
      }
    },
    "/promotions/eligible": {
      "get": {
        "tags": [
          "Accommodation"
        ],
        "summary": "List active stay- and room-eligible public promotions",
        "operationId": "getPromotionsEligible",
        "x-required-role": "PUBLIC",
        "description": "No bearer token needed.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "parameters": [
          {
            "name": "roomTypeId",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "checkIn",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string",
              "format": "date"
            }
          },
          {
            "name": "checkOut",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string",
              "format": "date"
            }
          }
        ]
      }
    },
    "/quotes": {
      "post": {
        "tags": [
          "Accommodation"
        ],
        "summary": "Calculate room quote in integer INR paise",
        "operationId": "postQuotes",
        "x-required-role": "PUBLIC",
        "description": "No bearer token needed.",
        "responses": {
          "201": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/RoomQuote"
              }
            }
          }
        }
      }
    },
    "/room-types": {
      "get": {
        "tags": [
          "Accommodation"
        ],
        "summary": "List accommodation categories",
        "operationId": "getRoomTypes",
        "x-required-role": "PUBLIC",
        "description": "No bearer token needed.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        }
      }
    },
    "/room-types/{id}": {
      "get": {
        "tags": [
          "Accommodation"
        ],
        "summary": "Get accommodation details",
        "operationId": "getRoomTypesById",
        "x-required-role": "PUBLIC",
        "description": "No bearer token needed.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/staff/allocations": {
      "get": {
        "tags": [
          "Staff Operations"
        ],
        "summary": "List persisted role-based staffing plans (not shift reservations)",
        "operationId": "getStaffAllocations",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/staff/allocations/{id}": {
      "get": {
        "tags": [
          "Staff Operations"
        ],
        "summary": "Get staffing plan or an unsaved draft",
        "operationId": "getStaffAllocationsById",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      },
      "put": {
        "tags": [
          "Staff Operations"
        ],
        "summary": "Save a proposed staffing plan with staff permission",
        "operationId": "putStaffAllocationsById",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/StaffPlan"
              }
            }
          }
        }
      }
    },
    "/staff/allocations/{id}/transition": {
      "post": {
        "tags": [
          "Staff Operations"
        ],
        "summary": "Submit for GM review, approve, request changes or attest manual sending",
        "operationId": "postStaffAllocationsByIdTransition",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "201": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/StaffPlanTransition"
              }
            }
          }
        }
      }
    },
    "/staff/bookings/export": {
      "get": {
        "tags": [
          "Staff Operations"
        ],
        "summary": "Export the same daily booking records as the preview in Excel-compatible CSV",
        "operationId": "getStaffBookingsExport",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "text/csv": {
                "schema": {
                  "type": "string"
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "date",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string",
              "format": "date"
            }
          },
          {
            "name": "mode",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/staff/bookings/preview": {
      "get": {
        "tags": [
          "Staff Operations"
        ],
        "summary": "Preview daily accommodation and GM-committed event bookings, with date/type filters",
        "operationId": "getStaffBookingsPreview",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "date",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string",
              "format": "date"
            }
          },
          {
            "name": "mode",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/staff/drafts/{id}": {
      "patch": {
        "tags": [
          "Staff Enquiries"
        ],
        "summary": "Edit a draft before simulated sending",
        "operationId": "patchStaffDraftsById",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/DraftEdit"
              }
            }
          }
        }
      }
    },
    "/staff/drafts/{id}/send-simulated": {
      "post": {
        "tags": [
          "Staff Enquiries"
        ],
        "summary": "Mark staff-approved draft as simulated sent",
        "operationId": "postStaffDraftsByIdSendSimulated",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "201": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/staff/enquiries": {
      "get": {
        "tags": [
          "Staff Enquiries"
        ],
        "summary": "List AI-assisted staff enquiries",
        "operationId": "getStaffEnquiries",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "category",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/staff/enquiries/{id}": {
      "get": {
        "tags": [
          "Staff Enquiries"
        ],
        "summary": "Read enquiry details",
        "operationId": "getStaffEnquiriesById",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/staff/enquiries/{id}/ai-process": {
      "post": {
        "tags": [
          "Staff Enquiries"
        ],
        "summary": "Run agent classification and draft generation",
        "operationId": "postStaffEnquiriesByIdAiProcess",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "201": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/staff/enquiries/{id}/client-followups": {
      "get": {
        "tags": [
          "Staff Enquiries"
        ],
        "summary": "Read staff-attested, manually conducted client follow-ups",
        "operationId": "getStaffEnquiriesByIdClientFollowups",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      },
      "post": {
        "tags": [
          "Staff Enquiries"
        ],
        "summary": "Record channel and factual client response after actual contact",
        "operationId": "postStaffEnquiriesByIdClientFollowups",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "201": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "additionalProperties": true
              }
            }
          }
        }
      }
    },
    "/staff/enquiries/{id}/drafts": {
      "get": {
        "tags": [
          "Staff Enquiries"
        ],
        "summary": "List reply drafts",
        "operationId": "getStaffEnquiriesByIdDrafts",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/staff/enquiries/{id}/escalate-complaint": {
      "post": {
        "tags": [
          "Staff Enquiries"
        ],
        "summary": "Separately escalate a guest complaint to GM without changing the event classification",
        "operationId": "postStaffEnquiriesByIdEscalateComplaint",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "201": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "additionalProperties": true
              }
            }
          }
        }
      }
    },
    "/staff/enquiries/{id}/escalate-unresolved": {
      "post": {
        "tags": [
          "Staff Enquiries"
        ],
        "summary": "Escalate unresolved infeasible proposal after logged client follow-up; never reserve",
        "operationId": "postStaffEnquiriesByIdEscalateUnresolved",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "201": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "additionalProperties": true
              }
            }
          }
        }
      }
    },
    "/staff/enquiries/{id}/event-proposal": {
      "post": {
        "tags": [
          "Staff Enquiries"
        ],
        "summary": "Staff-review handoff from enquiry to event proposal",
        "operationId": "postStaffEnquiriesByIdEventProposal",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "201": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/EventProposal"
              }
            }
          }
        }
      }
    },
    "/staff/enquiries/{id}/extraction": {
      "patch": {
        "tags": [
          "Staff Enquiries"
        ],
        "summary": "Persist human-corrected extracted fields",
        "operationId": "patchStaffEnquiriesByIdExtraction",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "additionalProperties": true
              }
            }
          }
        }
      }
    },
    "/staff/enquiries/{id}/gm-return": {
      "patch": {
        "tags": [
          "Staff Enquiries"
        ],
        "summary": "Legacy GM return endpoint; requires an explicit reviewed decision and GM note",
        "operationId": "patchStaffEnquiriesByIdGmReturn",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "additionalProperties": true
              }
            }
          }
        }
      }
    },
    "/staff/enquiries/{id}/gm-review": {
      "post": {
        "tags": [
          "Staff Enquiries"
        ],
        "summary": "GM approves complaint resolution or requests staff action, recording feedback and notification",
        "operationId": "postStaffEnquiriesByIdGmReview",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "201": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "additionalProperties": true
              }
            }
          }
        }
      }
    },
    "/staff/enquiries/{id}/gm-review/{decisionId}/acknowledge": {
      "post": {
        "tags": [
          "Staff Enquiries"
        ],
        "summary": "Assigned staff acknowledges received GM decision",
        "operationId": "postStaffEnquiriesByIdGmReviewByDecisionIdAcknowledge",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "201": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "decisionId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "additionalProperties": true
              }
            }
          }
        }
      }
    },
    "/staff/enquiries/{id}/routing": {
      "patch": {
        "tags": [
          "Staff Enquiries"
        ],
        "summary": "Persist a human category override",
        "operationId": "patchStaffEnquiriesByIdRouting",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/RoutingCorrection"
              }
            }
          }
        }
      }
    },
    "/staff/enquiries/mock-inbound": {
      "post": {
        "tags": [
          "Staff Enquiries"
        ],
        "summary": "Simulate forwarded email or WhatsApp enquiry",
        "operationId": "postStaffEnquiriesMockInbound",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "201": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/InboundEnquiry"
              }
            }
          }
        }
      }
    },
    "/staff/enquiries/paged": {
      "get": {
        "tags": [
          "Staff Enquiries"
        ],
        "summary": "Read 10 enquiries per page with booking-confirmed filter and selected-enquiry restoration",
        "operationId": "getStaffEnquiriesPaged",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "page",
            "in": "query",
            "required": false,
            "schema": {
              "type": "integer",
              "minimum": 0
            }
          },
          {
            "name": "category",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "search",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "focusId",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/staff/event-approvals/{id}": {
      "get": {
        "tags": [
          "Staff Operations"
        ],
        "summary": "View event GM review and guest confirmation status",
        "operationId": "getStaffEventApprovalsById",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/staff/event-approvals/{id}/confirm-client": {
      "post": {
        "tags": [
          "Staff Operations"
        ],
        "summary": "Record staff-attested manual confirmation after GM reservation",
        "operationId": "postStaffEventApprovalsByIdConfirmClient",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "201": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "additionalProperties": true
              }
            }
          }
        }
      }
    },
    "/staff/event-approvals/{id}/request": {
      "post": {
        "tags": [
          "Staff Operations"
        ],
        "summary": "Submit a feasible event bundle for GM authorization without booking",
        "operationId": "postStaffEventApprovalsByIdRequest",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "201": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/staff/events": {
      "get": {
        "tags": [
          "Event Feasibility"
        ],
        "summary": "List and filter staff event proposals",
        "operationId": "getStaffEvents",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "status",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "limit",
            "in": "query",
            "required": false,
            "schema": {
              "type": "integer",
              "minimum": 0
            }
          },
          {
            "name": "offset",
            "in": "query",
            "required": false,
            "schema": {
              "type": "integer",
              "minimum": 0
            }
          }
        ]
      },
      "post": {
        "tags": [
          "Event Feasibility"
        ],
        "summary": "Create unreserved event proposal",
        "operationId": "postStaffEvents",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "201": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/EventProposal"
              }
            }
          }
        }
      }
    },
    "/staff/events/{id}": {
      "get": {
        "tags": [
          "Event Feasibility"
        ],
        "summary": "Get event proposal",
        "operationId": "getStaffEventsById",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/staff/events/{id}/alternatives": {
      "get": {
        "tags": [
          "Event Feasibility"
        ],
        "summary": "Search verified alternative dates",
        "operationId": "getStaffEventsByIdAlternatives",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/staff/events/{id}/alternatives/select": {
      "post": {
        "tags": [
          "Event Feasibility"
        ],
        "summary": "Propose one verified alternative without reserving",
        "operationId": "postStaffEventsByIdAlternativesSelect",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "201": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/AlternativeSelection"
              }
            }
          }
        }
      }
    },
    "/staff/events/{id}/bundle": {
      "get": {
        "tags": [
          "Event Feasibility"
        ],
        "summary": "Read approved event allocations",
        "operationId": "getStaffEventsByIdBundle",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/staff/events/{id}/evaluations": {
      "post": {
        "tags": [
          "Event Feasibility"
        ],
        "summary": "Evaluate resource feasibility without reserving",
        "operationId": "postStaffEventsByIdEvaluations",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "201": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/staff/events/{id}/requirements": {
      "get": {
        "tags": [
          "Event Feasibility"
        ],
        "summary": "Read event resource requirement graph",
        "operationId": "getStaffEventsByIdRequirements",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      },
      "put": {
        "tags": [
          "Event Feasibility"
        ],
        "summary": "Update event requirements before reservation",
        "operationId": "putStaffEventsByIdRequirements",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "additionalProperties": true
              }
            }
          }
        }
      }
    },
    "/staff/events/{id}/reserve": {
      "post": {
        "tags": [
          "Event Feasibility"
        ],
        "summary": "Legacy direct reservation is denied; GM authorization required",
        "operationId": "postStaffEventsByIdReserve",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "201": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ]
      }
    },
    "/staff/gm-escalations": {
      "get": {
        "tags": [
          "Staff Operations"
        ],
        "summary": "GM-only queue of escalations with complete context and reason",
        "operationId": "getStaffGmEscalations",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/staff/gm-escalations/recent": {
      "get": {
        "tags": [
          "Staff Operations"
        ],
        "summary": "GM-only recent reviewed escalations and notification acknowledgement",
        "operationId": "getStaffGmEscalationsRecent",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/staff/inventory": {
      "get": {
        "tags": [
          "Staff Operations"
        ],
        "summary": "Read website allotment by date range",
        "operationId": "getStaffInventory",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "start",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string",
              "format": "date"
            }
          },
          {
            "name": "end",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string",
              "format": "date"
            }
          }
        ]
      }
    },
    "/staff/inventory/{roomTypeId}/days/{date}": {
      "put": {
        "tags": [
          "Staff Operations"
        ],
        "summary": "Set daily website allotment or blackout",
        "operationId": "putStaffInventoryByRoomTypeIdDaysByDate",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "roomTypeId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "date",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "format": "date"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/DailyAllotment"
              }
            }
          }
        }
      }
    },
    "/staff/overview": {
      "get": {
        "tags": [
          "Staff Operations"
        ],
        "summary": "Staff operations summary",
        "operationId": "getStaffOverview",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "date",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string",
              "format": "date"
            }
          }
        ]
      }
    },
    "/staff/promo-codes": {
      "get": {
        "tags": [
          "Staff Operations"
        ],
        "summary": "List current promotions",
        "operationId": "getStaffPromoCodes",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Staff Operations"
        ],
        "summary": "Create a promotional code",
        "operationId": "postStaffPromoCodes",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "201": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/PromoCode"
              }
            }
          }
        }
      }
    },
    "/staff/promo-codes/{code}": {
      "patch": {
        "tags": [
          "Staff Operations"
        ],
        "summary": "Activate or deactivate a promotion",
        "operationId": "patchStaffPromoCodesByCode",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "code",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "additionalProperties": true
              }
            }
          }
        }
      }
    },
    "/staff/rates": {
      "get": {
        "tags": [
          "Staff Operations"
        ],
        "summary": "Read room pricing by date",
        "operationId": "getStaffRates",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "start",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string",
              "format": "date"
            }
          },
          {
            "name": "end",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string",
              "format": "date"
            }
          }
        ]
      }
    },
    "/staff/rates/{roomTypeId}/days/{date}": {
      "put": {
        "tags": [
          "Staff Operations"
        ],
        "summary": "Update daily rate",
        "operationId": "putStaffRatesByRoomTypeIdDaysByDate",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "roomTypeId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "date",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "format": "date"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/DailyRate"
              }
            }
          }
        }
      }
    },
    "/staff/resources": {
      "get": {
        "tags": [
          "Staff Operations"
        ],
        "summary": "Read operational resource capacity",
        "operationId": "getStaffResources",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "date",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string",
              "format": "date"
            }
          }
        ]
      }
    },
    "/staff/resources/{id}/capacity": {
      "patch": {
        "tags": [
          "Staff Operations"
        ],
        "summary": "Update operational capacity with allocation safeguards",
        "operationId": "patchStaffResourcesByIdCapacity",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ResourceCapacity"
              }
            }
          }
        }
      }
    },
    "/staff/resources/calendar": {
      "get": {
        "tags": [
          "Staff Operations"
        ],
        "summary": "Read resource availability calendar",
        "operationId": "getStaffResourcesCalendar",
        "x-required-role": "STAFF_OR_GM",
        "description": "Requires a valid bearer token with an active STAFF or GM database role.",
        "responses": {
          "200": {
            "description": "Successful response",
            "headers": {
              "X-Request-ID": {
                "description": "Generated request trace identifier",
                "schema": {
                  "type": "string",
                  "format": "uuid"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ResourceCalendar"
                }
              }
            }
          },
          "400": {
            "description": "Input validation failed"
          },
          "401": {
            "description": "Missing, invalid or stale authorization (when applicable)"
          },
          "403": {
            "description": "Insufficient role or ownership (when applicable)"
          },
          "409": {
            "description": "Inventory, idempotency or concurrency conflict (when applicable)"
          },
          "429": {
            "description": "Request throttled (public write routes)"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "start",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string",
              "format": "date"
            }
          },
          {
            "name": "end",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string",
              "format": "date"
            }
          }
        ]
      }
    }
  },
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": "JWT access token from POST /auth/login. Never put JWT_SECRET in the frontend."
      }
    },
    "schemas": {
      "Credential": {
        "type": "object",
        "required": [
          "email",
          "password"
        ],
        "properties": {
          "email": {
            "type": "string",
            "format": "email"
          },
          "password": {
            "type": "string",
            "format": "password"
          }
        }
      },
      "Registration": {
        "type": "object",
        "required": [
          "email",
          "password",
          "displayName"
        ],
        "properties": {
          "email": {
            "type": "string",
            "format": "email"
          },
          "password": {
            "type": "string",
            "minLength": 10
          },
          "displayName": {
            "type": "string"
          }
        }
      },
      "AuthResult": {
        "type": "object",
        "required": [
          "accessToken",
          "tokenType",
          "user"
        ],
        "properties": {
          "accessToken": {
            "type": "string"
          },
          "tokenType": {
            "type": "string",
            "example": "Bearer"
          },
          "expiresInSeconds": {
            "type": "integer"
          },
          "user": {
            "type": "object",
            "additionalProperties": true
          }
        }
      },
      "RoomQuote": {
        "type": "object",
        "required": [
          "roomTypeId",
          "checkIn",
          "checkOut",
          "guests"
        ],
        "properties": {
          "roomTypeId": {
            "type": "string",
            "format": "uuid"
          },
          "checkIn": {
            "type": "string",
            "format": "date"
          },
          "checkOut": {
            "type": "string",
            "format": "date"
          },
          "guests": {
            "type": "integer",
            "minimum": 1
          },
          "promoCode": {
            "type": "string"
          }
        }
      },
      "BookingHold": {
        "type": "object",
        "required": [
          "roomTypeId",
          "checkIn",
          "checkOut",
          "guests"
        ],
        "properties": {
          "roomTypeId": {
            "type": "string",
            "format": "uuid"
          },
          "checkIn": {
            "type": "string",
            "format": "date"
          },
          "checkOut": {
            "type": "string",
            "format": "date"
          },
          "guests": {
            "type": "integer",
            "minimum": 1
          }
        }
      },
      "MockPayment": {
        "type": "object",
        "required": [
          "holdId",
          "outcome"
        ],
        "properties": {
          "holdId": {
            "type": "string",
            "format": "uuid"
          },
          "outcome": {
            "type": "string",
            "enum": [
              "SUCCESS",
              "FAILURE"
            ]
          }
        }
      },
      "Enquiry": {
        "type": "object",
        "required": [
          "contactName",
          "message"
        ],
        "properties": {
          "contactName": {
            "type": "string"
          },
          "contactEmail": {
            "type": "string",
            "format": "email"
          },
          "message": {
            "type": "string",
            "minLength": 8,
            "maxLength": 5000
          }
        }
      },
      "EventProposal": {
        "type": "object",
        "required": [
          "title",
          "eventDate",
          "checkIn",
          "checkOut",
          "guests",
          "roomsRequired",
          "diningGuests",
          "parkingSpaces",
          "eventStaff",
          "venueCode"
        ],
        "properties": {
          "title": {
            "type": "string"
          },
          "eventDate": {
            "type": "string",
            "format": "date"
          },
          "checkIn": {
            "type": "string",
            "format": "date"
          },
          "checkOut": {
            "type": "string",
            "format": "date"
          },
          "guests": {
            "type": "integer"
          },
          "roomsRequired": {
            "type": "integer"
          },
          "diningGuests": {
            "type": "integer"
          },
          "parkingSpaces": {
            "type": "integer"
          },
          "eventStaff": {
            "type": "integer"
          },
          "venueCode": {
            "type": "string",
            "enum": [
              "LAWN"
            ]
          }
        }
      },
      "Error": {
        "type": "object",
        "properties": {
          "statusCode": {
            "type": "integer"
          },
          "message": {
            "oneOf": [
              {
                "type": "string"
              },
              {
                "type": "array",
                "items": {
                  "type": "string"
                }
              }
            ]
          },
          "error": {
            "type": "string"
          }
        }
      },
      "BookingStatus": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "format": "uuid"
          },
          "status": {
            "type": "string",
            "enum": [
              "ACTIVE",
              "EXPIRED",
              "CONFIRMED"
            ]
          },
          "remainingSeconds": {
            "type": "integer"
          },
          "checkIn": {
            "type": "string",
            "format": "date"
          },
          "checkOut": {
            "type": "string",
            "format": "date"
          }
        }
      },
      "ResourceCalendar": {
        "type": "object",
        "properties": {
          "start": {
            "type": "string",
            "format": "date"
          },
          "end": {
            "type": "string",
            "format": "date"
          },
          "days": {
            "type": "array",
            "items": {
              "type": "object",
              "additionalProperties": true
            }
          }
        }
      },
      "InboundEnquiry": {
        "type": "object",
        "required": [
          "source",
          "contactName",
          "message"
        ],
        "properties": {
          "source": {
            "type": "string",
            "enum": [
              "EMAIL_SIM",
              "WHATSAPP_SIM"
            ]
          },
          "contactName": {
            "type": "string"
          },
          "contactEmail": {
            "type": "string",
            "format": "email"
          },
          "message": {
            "type": "string"
          }
        }
      },
      "DailyAllotment": {
        "type": "object",
        "required": [
          "websiteAllotment",
          "blackedOut"
        ],
        "properties": {
          "websiteAllotment": {
            "type": "integer",
            "minimum": 0
          },
          "blackedOut": {
            "type": "boolean"
          }
        }
      },
      "DailyRate": {
        "type": "object",
        "required": [
          "ratePaise",
          "gstBasisPoints"
        ],
        "properties": {
          "ratePaise": {
            "type": "integer",
            "minimum": 0
          },
          "gstBasisPoints": {
            "type": "integer",
            "minimum": 0,
            "maximum": 10000
          }
        }
      },
      "PromoCode": {
        "type": "object",
        "required": [
          "code",
          "validFrom",
          "validTo",
          "discountPercent",
          "maxUses"
        ],
        "properties": {
          "code": {
            "type": "string"
          },
          "validFrom": {
            "type": "string",
            "format": "date"
          },
          "validTo": {
            "type": "string",
            "format": "date"
          },
          "discountPercent": {
            "type": "integer",
            "minimum": 1,
            "maximum": 100
          },
          "maxUses": {
            "type": "integer",
            "minimum": 1
          },
          "roomTypeId": {
            "type": [
              "string",
              "null"
            ],
            "format": "uuid",
            "description": "null means applicable to both accommodation types"
          }
        }
      },
      "ResourceCapacity": {
        "type": "object",
        "required": [
          "capacity",
          "blocked"
        ],
        "properties": {
          "capacity": {
            "type": "integer",
            "minimum": 0
          },
          "blocked": {
            "type": "boolean"
          }
        }
      },
      "AlternativeSelection": {
        "type": "object",
        "required": [
          "eventDate"
        ],
        "properties": {
          "eventDate": {
            "type": "string",
            "format": "date"
          }
        }
      },
      "RoutingCorrection": {
        "type": "object",
        "required": [
          "category"
        ],
        "properties": {
          "category": {
            "type": "string",
            "enum": [
              "ROOM_BOOKING",
              "WEDDING",
              "CORPORATE_OFFSITE",
              "COMPLAINT",
              "UNKNOWN"
            ]
          }
        }
      },
      "StaffPlan": {
        "type": "object",
        "required": [
          "counts",
          "notes"
        ],
        "properties": {
          "counts": {
            "type": "object",
            "additionalProperties": true
          },
          "notes": {
            "type": "string"
          }
        }
      },
      "StaffPlanTransition": {
        "type": "object",
        "required": [
          "status"
        ],
        "properties": {
          "status": {
            "type": "string",
            "enum": [
              "Pending GM",
              "Approved",
              "Changes requested",
              "Sent to client"
            ]
          },
          "gmNote": {
            "type": "string"
          },
          "externalDeliveryConfirmed": {
            "type": "boolean"
          }
        }
      },
      "DraftEdit": {
        "type": "object",
        "required": [
          "body"
        ],
        "properties": {
          "body": {
            "type": "string",
            "minLength": 8,
            "maxLength": 5000
          }
        }
      }
    }
  },
  "x-estateflow-notes": {
    "model": "local Naive Bayes routing with optional Ollama semantic extraction and draft-only wording",
    "payment": "MOCK",
    "channels": "manual handoff / simulated; no server-side message delivery",
    "approval": "STAFF feasibility → GM atomic reservation → staff-attested client confirmation; AI has no write authority"
  }
};
