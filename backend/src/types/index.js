/**
 * Common type definitions and enums for the Tasker platform
 */

export const UserRole = {
  CLIENT: 'client',
  TASKER: 'tasker',
  OPS: 'ops',
  ADMIN: 'admin'
};

export const TaskState = {
  DRAFT: 'draft',
  POSTED: 'posted',
  MATCHING: 'matching',
  ACCEPTED: 'accepted',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  SETTLED: 'settled',
  REVIEWED: 'reviewed',
  EXPIRED: 'expired',
  CANCELED_BY_CLIENT: 'canceled_by_client',
  CANCELED_BY_TASKER: 'canceled_by_tasker',
  DISPUTED: 'disputed'
};

export const BookingStatus = {
  OFFERED: 'offered',
  ACCEPTED: 'accepted',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELED: 'canceled',
  DISPUTED: 'disputed'
};

export const TaskerStatus = {
  APPLIED: 'applied',
  VERIFIED: 'verified',
  ACTIVE: 'active',
  AT_RISK: 'at_risk',
  SUSPENDED: 'suspended',
  OFFBOARDED: 'offboarded'
};

export const PaymentMethod = {
  CASH: 'cash',
  WALLET: 'wallet',
  CARD: 'card'
};

export const PaymentStatus = {
  REQUIRES_ACTION: 'requires_action',
  AUTHORIZED: 'authorized',
  CAPTURED: 'captured',
  FAILED: 'failed',
  CANCELED: 'canceled'
};
