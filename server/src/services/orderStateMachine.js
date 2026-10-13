/**
 * Order State Machine — Enforces legal business state transitions for restaurant orders.
 *
 * Graph:
 * [placed] ──► [accepted] ──► [preparing] ──► [ready] ──► [served]
 *    │             │              │
 *    ▼             ▼              ▼
 * [cancelled]  [cancelled]   [cancelled* (Manager/Coordinator with reason)]
 */

const VALID_STATUSES = ['placed', 'accepted', 'preparing', 'ready', 'served', 'cancelled'];

const LEGAL_TRANSITIONS = {
  placed:    ['accepted', 'preparing', 'cancelled'],
  accepted:  ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready:     ['served'],
  served:    [], // Terminal state
  cancelled: [], // Terminal state
};

/**
 * Returns allowed next statuses for an order
 */
const getLegalNextStates = (currentStatus) => {
  return LEGAL_TRANSITIONS[currentStatus] || [];
};

/**
 * Validates whether transitioning from currentStatus to targetStatus is permitted
 * based on workflow graph and user role.
 *
 * @param {string} currentStatus
 * @param {string} targetStatus
 * @param {string} userRole - 'waiter' | 'kitchen' | 'coordinator' | 'manager' | 'owner'
 * @param {object} options - { cancelReason?: string }
 * @returns {{ isValid: boolean, code?: string, message?: string }}
 */
const validateTransition = (currentStatus, targetStatus, userRole = 'owner', options = {}) => {
  if (!VALID_STATUSES.includes(targetStatus)) {
    return {
      isValid: false,
      code: 'INVALID_STATUS',
      message: `Invalid status "${targetStatus}". Allowed values: ${VALID_STATUSES.join(', ')}.`,
    };
  }

  // Idempotent: same status transition is allowed (no-op)
  if (currentStatus === targetStatus) {
    return { isValid: true };
  }

  // Check state graph
  const allowed = LEGAL_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    return {
      isValid: false,
      code: 'ILLEGAL_TRANSITION',
      message: `Cannot transition order from "${currentStatus}" to "${targetStatus}". Legal next states: ${allowed.length ? allowed.join(', ') : 'none (terminal state)'}.`,
    };
  }

  // Role permissions
  if (userRole === 'kitchen') {
    if (!['preparing', 'ready'].includes(targetStatus)) {
      return {
        isValid: false,
        code: 'ROLE_FORBIDDEN',
        message: 'Kitchen staff can only advance orders to "preparing" or "ready".',
      };
    }
  } else if (userRole === 'waiter') {
    if (targetStatus === 'cancelled') {
      // Waiter can only cancel if food hasn't started cooking yet (placed)
      if (currentStatus !== 'placed') {
        return {
          isValid: false,
          code: 'ROLE_FORBIDDEN',
          message: `Waiters cannot cancel an order that is already "${currentStatus}". Please call a manager or kitchen coordinator.`,
        };
      }
    } else if (targetStatus !== 'served') {
      return {
        isValid: false,
        code: 'ROLE_FORBIDDEN',
        message: 'Waiters can only mark ready orders as "served".',
      };
    }
  }

  // Cancellation guardrails during 'preparing'
  if (targetStatus === 'cancelled' && currentStatus === 'preparing') {
    if (!options.cancelReason || !options.cancelReason.trim()) {
      return {
        isValid: false,
        code: 'REASON_REQUIRED',
        message: 'A cancellation reason is required to cancel an order already being prepared.',
      };
    }
  }

  return { isValid: true };
};

module.exports = {
  VALID_STATUSES,
  LEGAL_TRANSITIONS,
  getLegalNextStates,
  validateTransition,
};
